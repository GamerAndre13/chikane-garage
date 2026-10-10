export default function ContactoLoading() {
  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-12">
      <header className="max-w-3xl">
        <div className="shimmer h-3 w-40" />
        <div className="shimmer mt-4 h-14 w-72" />
        <div className="shimmer mt-5 h-4 w-full max-w-xl" />
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="shimmer h-5 w-1/2" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="shimmer h-11 rounded-sm" />
            <div className="shimmer h-11 rounded-sm" />
          </div>
          <div className="shimmer h-11 rounded-sm" />
          <div className="shimmer h-32 rounded-sm" />
          <div className="shimmer h-12 w-52 rounded-sm" />
        </div>
        <div className="shimmer hidden h-96 lg:block" />
      </div>
    </div>
  );
}