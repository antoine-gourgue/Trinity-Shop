// Squelette affiché pendant le chargement d'une page du back-office
export default function AdminLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Chargement">
      <div className="h-8 w-56 rounded-full bg-muted" />
      <div className="mt-3 h-4 w-80 max-w-full rounded-full bg-muted" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-3xl border bg-white" />
        ))}
      </div>
      <div className="mt-6 h-96 rounded-3xl border bg-white" />
    </div>
  );
}
