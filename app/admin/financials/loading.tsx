export default function AdminFinancialsLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-pulse">
      <div className="h-7 w-32 bg-gray-200 rounded-xl mb-6" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="h-3.5 w-20 bg-gray-200 rounded-lg" />
            <div className="h-8 w-28 bg-gray-200 rounded-xl" />
            <div className="h-3 w-16 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Revenue table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="h-5 w-36 bg-gray-200 rounded-lg" />
          <div className="h-8 w-24 bg-gray-200 rounded-xl" />
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
