"use client";

import { createContext, useContext, useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { Check, Clock, List, Loader2, LocateFixed, Map as MapIcon, MapPin, Search } from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsiveDialog";
import { chooseStore, listStores } from "@/lib/server-actions/store-actions";
import { distanceKm, formatDistance, searchable, type Coordinates } from "@/lib/geo";
import type { StoreSummary } from "@/lib/stores";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Leaflet a besoin du navigateur : la carte n'est chargée qu'à l'ouverture de la fenêtre, côté client
const StoreMap = dynamic(() => import("@/components/store/store-map"), {
  ssr: false,
  loading: () => <div className="h-full min-h-[280px] w-full animate-pulse rounded-2xl bg-muted" />,
});

interface StoreContextValue {
  store: StoreSummary | null;
  openStorePicker: () => void;
  // État de la fenêtre de choix, affichée par StorePickerDialog
  pickerOpen: boolean;
  setPickerOpen: (open: boolean) => void;
}

const StoreContext = createContext<StoreContextValue>({
  store: null,
  openStorePicker: () => undefined,
  pickerOpen: false,
  setPickerOpen: () => undefined,
});

// Magasin du visiteur, et ouverture de la fenêtre de choix depuis n'importe quel bouton
export function useStoreChoice() {
  return useContext(StoreContext);
}

// La fenêtre s'ouvre seule à la première visite, une fois par session si on la ferme sans choisir
const ASKED_KEY = "trinity-store-asked";

function alreadyAsked() {
  try {
    return sessionStorage.getItem(ASKED_KEY) === "1";
  } catch {
    return true;
  }
}

function rememberAsked() {
  try {
    sessionStorage.setItem(ASKED_KEY, "1");
  } catch {
    // Stockage indisponible (navigation privée) : la fenêtre pourra se rouvrir
  }
}

// Le fournisseur n'enveloppe que la page : la fenêtre est rendue à part (StorePickerDialog). Rendue ici,
// à côté de la page, elle décalait les identifiants générés par React (useId) entre le serveur et le
// navigateur sur les pages diffusées en plusieurs morceaux (accueil, recherche).
export default function StoreProvider({ store, children }: { store: StoreSummary | null; children: React.ReactNode }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (store || pathname.startsWith("/auth") || alreadyAsked()) return;
    rememberAsked();
    setPickerOpen(true);
  }, [store, pathname]);

  const value = useMemo(() => ({ store, openStorePicker: () => setPickerOpen(true), pickerOpen, setPickerOpen }), [store, pickerOpen]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// Fenêtre de choix du magasin, placée une fois dans l'habillage des pages
export function StorePickerDialog() {
  const { store, pickerOpen, setPickerOpen } = useStoreChoice();

  return (
    <ResponsiveDialog open={pickerOpen} onOpenChange={setPickerOpen}>
      <ResponsiveDialogContent className="flex max-h-[92vh] flex-col gap-0 p-0 md:h-[85vh] md:max-w-5xl">
        {pickerOpen && <StorePicker current={store} onChosen={() => setPickerOpen(false)} />}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

type Located = { status: "idle" } | { status: "locating" } | { status: "located"; position: Coordinates } | { status: "failed" };

function StorePicker({ current, onChosen }: { current: StoreSummary | null; onChosen: () => void }) {
  const router = useRouter();
  const [stores, setStores] = useState<StoreSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [located, setLocated] = useState<Located>({ status: "idle" });
  const [choosing, setChoosing] = useState<string | null>(null);
  // Magasin mis en avant (liste ↔ carte) et vue affichée sur mobile
  const [focused, setFocused] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [, startTransition] = useTransition();

  useEffect(() => {
    void listStores().then(setStores);
  }, []);

  // Point de comparaison des distances : la position du visiteur, sinon son magasin actuel
  const origin: Coordinates | null = located.status === "located" ? located.position : current;

  const results = useMemo(() => {
    if (!stores) return [];
    const words = searchable(query).split(" ").filter(Boolean);
    const matching = stores.filter((store) => {
      const haystack = searchable(`${store.name} ${store.city} ${store.zipCode} ${store.region}`);
      return words.every((word) => haystack.includes(word));
    });
    const withDistance = matching.map((store) => ({ store, distance: origin ? distanceKm(origin, store) : null }));
    return origin ? withDistance.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)) : withDistance;
  }, [stores, query, origin]);
  const shownStores = useMemo(() => results.map(({ store }) => store), [results]);

  // Repère touché sur la carte : le magasin est retrouvé dans la liste
  const focusFromMap = (slug: string) => {
    setFocused(slug);
    document.getElementById(`magasin-${slug}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setLocated({ status: "failed" });
      return;
    }
    setLocated({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setQuery("");
        setLocated({ status: "located", position: { latitude: coords.latitude, longitude: coords.longitude } });
      },
      () => setLocated({ status: "failed" }),
      { timeout: 10_000, maximumAge: 600_000 }
    );
  };

  const choose = (store: StoreSummary) => {
    setChoosing(store.slug);
    startTransition(async () => {
      const result = await chooseStore(store.slug);
      setChoosing(null);
      if (!result.ok) {
        toast({ variant: "destructive", description: result.error });
        return;
      }
      onChosen();
      router.refresh();
      toast({ title: "Votre magasin", description: `${result.store.name}, ${result.store.city}`, duration: 3000 });
    });
  };

  return (
    <>
      <ResponsiveDialogHeader className="border-b px-5 py-4 text-left">
        <ResponsiveDialogTitle className="text-lg font-extrabold">Choisissez votre magasin</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          Le drive où vous récupérez vos courses, et d’où partent vos livraisons. Vous pourrez en changer à tout moment.
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

      <div className="flex flex-col gap-2 border-b px-5 py-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Rechercher un magasin</span>
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            aria-label="Rechercher un magasin"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ville, code postal ou nom du magasin"
            className="h-11 w-full rounded-full border border-input bg-white pl-10 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </label>
        <button
          type="button"
          onClick={locate}
          disabled={located.status === "locating"}
          className="flex h-11 items-center justify-center gap-2 rounded-full border border-primary px-4 text-sm font-bold text-primary transition-colors hover:bg-secondary disabled:opacity-60"
        >
          {located.status === "locating" ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <LocateFixed size={18} aria-hidden />}
          Autour de moi
        </button>
      </div>
      {located.status === "failed" && (
        <p className="px-5 pt-2 text-sm text-destructive">Position indisponible : cherchez plutôt votre ville ou votre code postal.</p>
      )}

      {/* Mobile : liste ou carte ; ordinateur : les deux côte à côte */}
      <div className="flex gap-2 px-5 pt-3 md:hidden" role="tablist" aria-label="Affichage des magasins">
        {(
          [
            ["list", "Liste", List],
            ["map", "Carte", MapIcon],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={view === value}
            onClick={() => setView(value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-full border py-2 text-sm font-bold",
              view === value ? "border-primary bg-primary text-primary-foreground" : "text-primary"
            )}
          >
            <Icon size={16} aria-hidden /> {label}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className={cn("min-h-0 overflow-y-auto px-5 py-3", view === "map" && "hidden md:block")}>
          {!stores ? (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 size={18} className="animate-spin" aria-hidden /> Chargement des magasins…
            </p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucun magasin ne correspond à « {query} ».</p>
          ) : (
            <>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                {results.length} magasin{results.length > 1 ? "s" : ""}
                {origin ? (located.status === "located" ? ", du plus proche au plus loin" : ", autour de votre magasin") : ""}
              </p>
              <ul className="flex flex-col gap-2">
                {results.map(({ store, distance }) => {
                  const selected = current?.slug === store.slug;
                  return (
                    <li
                      key={store.slug}
                      id={`magasin-${store.slug}`}
                      onClick={() => setFocused(store.slug)}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-colors hover:border-primary/60",
                        selected && "border-primary bg-secondary/60",
                        focused === store.slug && !selected && "border-brand-dark ring-1 ring-brand-dark"
                      )}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                        <MapPin size={18} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-baseline gap-x-2 font-extrabold">
                          {store.name}
                          {distance !== null && <span className="text-xs font-semibold text-muted-foreground">{formatDistance(distance)}</span>}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {store.street}, {store.zipCode} {store.city}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock size={12} aria-hidden /> Drive : {store.hours}
                        </p>
                      </div>
                      {selected ? (
                        <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-primary">
                          <Check size={16} aria-hidden /> Votre magasin
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => choose(store)}
                          disabled={choosing !== null}
                          aria-label={`Choisir ${store.name}`}
                          className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:opacity-60"
                        >
                          {choosing === store.slug && <Loader2 size={16} className="animate-spin" aria-hidden />}
                          Choisir
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
        <div className={cn("min-h-[50vh] p-3 md:min-h-0 md:pl-0", view === "list" && "hidden md:block")}>
          <StoreMap
            stores={shownStores}
            current={current}
            position={located.status === "located" ? located.position : null}
            focused={focused}
            onFocus={focusFromMap}
            onChoose={choose}
          />
        </div>
      </div>
    </>
  );
}
