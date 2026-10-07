export default function CatalogoLoading() {
  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-12">
      <header className="max-w-3xl">
        <div className="shimmer h-3 w-44" />
        <div className="shimmer mt-4 h-14 w-64" />
        <div className="shimmer mt-5 h-4 w-full max-w-xl" />
        <div className="shimmer mt-2 h-4 w-3/4 max-w-md" />
      </header>

      <div className="shimmer mt-9 h-14 w-full rounded-sm" />

      <div className="mt-7 grid gap-8 lg:grid-cols-[270px_1fr] xl:gap-12">
        <aside className="shimmer hidden h-96 lg:block" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden border border-white/10 bg-surface">
              <div className="shimmer aspect-[4/3]" />
              <div className="space-y-2.5 p-4">
                <div className="shimmer h-3 w-1/3" />
                <div className="shimmer h-5 w-3/4" />
                <div className="shimmer h-3 w-1/2" />
                <div className="shimmer mt-3 h-9 w-full rounded-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}