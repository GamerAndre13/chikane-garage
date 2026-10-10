export default function ContaLoading() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-5 py-16">
      <div className="shimmer h-4 w-36" />
      <div className="shimmer mt-2 h-10 w-64" />

      <div className="mt-12 w-full space-y-5">
        <div className="shimmer h-12 rounded-sm" />
        <div className="shimmer h-12 rounded-sm" />
        <div className="shimmer h-12 rounded-sm" />
        <div className="shimmer h-12 w-full rounded-sm" />
      </div>
    </div>
  );
}