export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Filter skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        <div className="hidden lg:block w-64 shrink-0 space-y-4">
          <div className="h-6 w-24 bg-gray-200 rounded-lg animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>

        {/* Results skeleton */}
        <div className="flex-1 space-y-4">
          <div className="h-6 w-40 bg-gray-200 rounded-lg animate-pulse mb-6" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 animate-pulse">
              <div className="w-36 h-28 bg-gray-200 rounded-xl shrink-0" />
              <div className="flex-1 space-y-3 py-1">
                <div className="h-5 w-3/4 bg-gray-200 rounded-lg" />
                <div className="h-4 w-1/2 bg-gray-200 rounded-lg" />
                <div className="h-4 w-1/3 bg-gray-200 rounded-lg" />
                <div className="h-8 w-28 bg-gray-200 rounded-xl mt-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
