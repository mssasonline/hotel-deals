export default function PartnerBookingsLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-32 bg-gray-200 rounded-xl" />
        <div className="h-9 w-24 bg-gray-200 rounded-xl" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-20 bg-gray-200 rounded-xl" />
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-gray-100">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded-lg" />
          ))}
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-gray-50">
            {[...Array(5)].map((_, j) => (
              <div key={j} className="h-4 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
