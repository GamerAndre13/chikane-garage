export default function SobreLoading() {
  return (
    <div className="bg-background">
      <div className="relative flex min-h-[62vh] items-end overflow-hidden bg-background-alt sm:min-h-[72vh]">
        <div className="shimmer absolute inset-0 opacity-40" />
        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pb-16 sm:px-8 lg:px-12">
          <div className="shimmer h-10 w-40" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-4">
            <div className="shimmer h-6 w-1/3" />
            <div className="shimmer h-10 w-3/4" />
            <div className="shimmer h-4 w-full" />
            <div className="shimmer h-4 w-5/6" />
          </div>
          <div className="shimmer aspect-[4/3]" />
        </div>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="shimmer aspect-[4/3] lg:order-2" />
          <div className="space-y-4 lg:order-1">
            <div className="shimmer h-6 w-1/3" />
            <div className="shimmer h-10 w-3/4" />
            <div className="shimmer h-4 w-full" />
            <div className="shimmer h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}