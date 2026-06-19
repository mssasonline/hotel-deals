export default function AdminBookingsLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-36 bg-gray-200 rounded-xl" />
        <div className="h-9 w-28 bg-gray-200 rounded-xl" />
      </div>

      {/* Filter row */}
      <div className="flex gap-3 mb-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 w-24 bg-gray-200 rounded-xl" />
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-gray-100">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded-lg" />
          ))}
        </div>
        {/* Rows */}
        {[...Array(10)].map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-gray-50">
            {[...Array(6)].map((_, j) => (
              <div key={j} className={`h-4 bg-gray-100 rounded-lg ${j === 0 ? 'w-16' : ''}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
