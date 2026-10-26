import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border bg-white p-3 sm:p-4">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <Skeleton className="mt-3 h-3 w-16" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-1.5 h-4 w-2/3" />
      <Skeleton className="mt-3 h-7 w-16" />
      <div className="mt-3 flex items-center justify-between gap-2">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
    </div>
  );
}

// Squelette d'une page de liste (rayon, recherche) pendant le chargement serveur
export function ListingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6" aria-busy="true" aria-label="Chargement des produits">
      <Skeleton className="h-[164px] w-full rounded-2xl bg-brand-dark/20" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Skeleton className="hidden h-[520px] rounded-2xl lg:block" />
        <div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-44 rounded-full" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6" aria-busy="true" aria-label="Chargement du produit">
      <Skeleton className="h-3 w-72" />
      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-8 rounded-3xl border bg-white p-5 md:grid-cols-2 md:p-8">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="mt-4 h-14 w-28" />
            <Skeleton className="mt-4 h-36 w-full rounded-2xl" />
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-3xl border bg-white p-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
