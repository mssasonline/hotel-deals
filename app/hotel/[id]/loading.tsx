export default function HotelLoading() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-pulse">

        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-4 w-10 bg-gray-200 rounded" />
          <div className="h-4 w-3 bg-gray-200 rounded" />
          <div className="h-4 w-16 bg-gray-200 rounded" />
          <div className="h-4 w-3 bg-gray-200 rounded" />
          <div className="h-4 w-40 bg-gray-200 rounded" />
        </div>

        {/* Hero skeleton */}
        <div className="rounded-2xl h-72 sm:h-96 bg-gray-200 mb-6" />

        {/* Content grid */}
        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-8">
          {/* Left */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <div className="flex gap-2 mb-3">
              <div className="h-6 w-20 bg-gray-200 rounded-full" />
            </div>
            <div className="h-9 w-3/4 bg-gray-200 rounded mb-3" />
            <div className="h-5 w-1/2 bg-gray-200 rounded mb-2" />
            <div className="space-y-2 mt-4">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-11/12" />
              <div className="h-4 bg-gray-200 rounded w-4/5" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          </div>

          {/* Right (desktop) */}
          <div className="hidden lg:block">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex gap-2 mb-4">
                <div className="h-7 w-20 bg-gray-200 rounded-full" />
                <div className="h-7 w-28 bg-gray-200 rounded-full" />
              </div>
              <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-14 w-40 bg-gray-200 rounded mb-5" />
              <div className="h-14 bg-gray-200 rounded-xl mb-4" />
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <div className="h-4 w-48 bg-gray-200 rounded" />
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-4 w-40 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
