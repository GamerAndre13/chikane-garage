export default function CatalogoSlugLoading() {
  return (
    <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
      <div className="shimmer h-3 w-40" />

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.35fr_1fr] xl:gap-12">
        <div className="min-w-0">
          <div className="shimmer aspect-[3/2] w-full rounded-sm" />
        </div>

        <div className="min-w-0">
          <div className="shimmer h-3 w-52" />
          <div className="shimmer mt-4 h-10 w-4/5" />
          <div className="shimmer mt-2 h-4 w-1/3" />
          <div className="shimmer mt-7 h-9 w-44" />
          <div className="shimmer mt-2 h-3 w-64" />
          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="shimmer h-12 w-full rounded-sm" />
            <div className="shimmer h-12 w-full rounded-sm" />
          </div>
          <div className="mt-7 space-y-3">
            <div className="shimmer h-4 w-full" />
            <div className="shimmer h-4 w-11/12" />
            <div className="shimmer h-4 w-3/4" />
          </div>
        </div>
      </div>

      <div className="mt-16 grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden border border-white/10 bg-surface">
            <div className="shimmer aspect-[4/3]" />
            <div className="space-y-2.5 p-4">
              <div className="shimmer h-3 w-1/2" />
              <div className="shimmer h-5 w-3/4" />
              <div className="shimmer h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}