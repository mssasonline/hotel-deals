export default function BookingLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-5">
        {/* Progress steps */}
        <div className="flex items-center gap-3 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200" />
              {i < 2 && <div className="h-1 w-16 bg-gray-200 rounded" />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          {/* Payment form skeleton */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="h-6 w-36 bg-gray-200 rounded-lg" />
            <div className="h-12 bg-gray-200 rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-12 bg-gray-200 rounded-xl" />
              <div className="h-12 bg-gray-200 rounded-xl" />
            </div>
            <div className="h-12 bg-gray-200 rounded-xl" />
            <div className="h-12 bg-gray-200 rounded-xl mt-4" />
          </div>

          {/* Summary card skeleton */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 h-fit">
            <div className="h-5 w-28 bg-gray-200 rounded-lg" />
            <div className="h-20 bg-gray-200 rounded-xl" />
            <div className="space-y-2 pt-3 border-t border-gray-100">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
            <div className="h-10 bg-gray-200 rounded-xl mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
