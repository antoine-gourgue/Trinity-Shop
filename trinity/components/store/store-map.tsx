"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Coordinates } from "@/lib/geo";
import type { StoreSummary } from "@/lib/stores";

interface StoreMapProps {
  stores: StoreSummary[];
  current: StoreSummary | null;
  // Position du visiteur (« Autour de moi »), affichée et centrée
  position: Coordinates | null;
  // Magasin mis en avant depuis la liste : la carte s'y déplace et ouvre sa bulle
  focused: string | null;
  onFocus: (slug: string) => void;
  onChoose: (store: StoreSummary) => void;
}

const FRANCE: L.LatLngTuple = [46.6, 2.4];

// Repère d'un magasin, aux couleurs du site ; le magasin actuel est jaune
function pin(kind: "store" | "current" | "focused") {
  const color = kind === "current" ? "#FFD000" : kind === "focused" ? "#005461" : "#007C8F";
  const ring = kind === "current" ? "#005461" : "#ffffff";
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid ${ring};box-shadow:0 2px 6px rgba(0,0,0,.35)"></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });
}

const youAreHere = L.divIcon({
  className: "",
  html: '<span style="display:block;width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25)"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Bulle d'un magasin, construite en DOM (pas de HTML injecté) avec son bouton « Choisir »
function popupContent(store: StoreSummary, isCurrent: boolean, onChoose: (store: StoreSummary) => void) {
  const root = document.createElement("div");
  root.style.minWidth = "180px";
  const name = document.createElement("p");
  name.textContent = store.name;
  name.style.cssText = "margin:0;font-weight:800;font-size:14px";
  const address = document.createElement("p");
  address.textContent = `${store.street}, ${store.zipCode} ${store.city}`;
  address.style.cssText = "margin:2px 0 0;color:#5F6B76;font-size:12px";
  const hours = document.createElement("p");
  hours.textContent = `Drive : ${store.hours}`;
  hours.style.cssText = "margin:2px 0 8px;color:#5F6B76;font-size:12px";
  root.append(name, address, hours);

  if (isCurrent) {
    const label = document.createElement("p");
    label.textContent = "✓ Votre magasin";
    label.style.cssText = "margin:0;font-weight:700;color:#007C8F;font-size:13px";
    root.append(label);
  } else {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Choisir ce magasin";
    button.style.cssText =
      "border:0;border-radius:999px;background:#007C8F;color:#fff;font-weight:700;font-size:13px;padding:6px 14px;cursor:pointer";
    button.addEventListener("click", () => onChoose(store));
    root.append(button);
  }
  return root;
}

// Carte OpenStreetMap des magasins trouvés par la recherche
export default function StoreMap({ stores, current, position, focused, onFocus, onChoose }: StoreMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  // Fonctions à jour sans recréer les repères à chaque rendu
  const callbacks = useRef({ onFocus, onChoose });
  callbacks.current = { onFocus, onChoose };

  // Cadrage : la position du visiteur, sinon l'ensemble des magasins trouvés. Sans effet tant que la
  // carte est masquée (onglet « Liste » sur mobile) : elle n'a pas encore de taille pour calculer le zoom.
  const frame = useRef(() => undefined as void);
  frame.current = () => {
    const instance = map.current;
    if (!instance || !container.current?.clientWidth) return;
    if (position) {
      instance.setView([position.latitude, position.longitude], 10);
    } else if (stores.length === 1) {
      instance.setView([stores[0].latitude, stores[0].longitude], 13);
    } else if (stores.length > 1) {
      instance.fitBounds(L.latLngBounds(stores.map((store): L.LatLngTuple => [store.latitude, store.longitude])), { padding: [30, 30], maxZoom: 12 });
    }
  };

  // Carte créée une fois ; sa taille est recalculée quand la fenêtre s'ouvre ou se redimensionne
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { center: FRANCE, zoom: 5, scrollWheelZoom: true, attributionControl: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(instance);
    // Mention OpenStreetMap exigée par sa licence, sans le préfixe « Leaflet » ajouté par défaut
    L.control.attribution({ prefix: false }).addTo(instance);
    layer.current = L.layerGroup().addTo(instance);
    map.current = instance;

    // Taille recalculée à chaque redimensionnement ; la carte qui devient visible est recadrée
    let hidden = !container.current.clientWidth;
    const resize = new ResizeObserver(() => {
      instance.invalidateSize();
      const nowHidden = !container.current?.clientWidth;
      if (hidden && !nowHidden) frame.current();
      hidden = nowHidden;
    });
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      instance.remove();
      map.current = null;
    };
  }, []);

  // Repères des magasins affichés
  useEffect(() => {
    const group = layer.current;
    if (!group) return;
    group.clearLayers();
    markers.current.clear();

    for (const store of stores) {
      const isCurrent = current?.slug === store.slug;
      const marker = L.marker([store.latitude, store.longitude], {
        icon: pin(isCurrent ? "current" : "store"),
        title: store.name,
        zIndexOffset: isCurrent ? 1000 : 0,
      })
        .bindPopup(() => popupContent(store, isCurrent, (chosen) => callbacks.current.onChoose(chosen)))
        .on("click", () => callbacks.current.onFocus(store.slug));
      marker.addTo(group);
      markers.current.set(store.slug, marker);
    }
    if (position) L.marker([position.latitude, position.longitude], { icon: youAreHere, title: "Votre position" }).addTo(group);
  }, [stores, current, position]);

  // Recadrage quand les magasins trouvés ou la position changent
  const framing = `${stores.map((store) => store.slug).join(",")}|${position?.latitude ?? ""},${position?.longitude ?? ""}`;
  useEffect(() => frame.current(), [framing]);

  // Magasin mis en avant : repère foncé, carte recentrée sur lui et bulle ouverte
  useEffect(() => {
    for (const [slug, marker] of markers.current) {
      if (slug !== current?.slug) marker.setIcon(pin(slug === focused ? "focused" : "store"));
    }
    const marker = focused ? markers.current.get(focused) : undefined;
    if (!marker || !map.current) return;
    map.current.panTo(marker.getLatLng());
    marker.openPopup();
  }, [focused, current, stores]);

  return (
    <div
      ref={container}
      role="region"
      aria-label="Carte des magasins Trinity"
      // Mention des sources en petit, dans le coin de la carte
      className="h-full min-h-[280px] w-full rounded-2xl [&_.leaflet-control-attribution]:!px-1.5 [&_.leaflet-control-attribution]:!text-[9px] [&_.leaflet-control-attribution]:!leading-4"
    />
  );
}
