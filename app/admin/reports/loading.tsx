export default function AdminReportsLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-pulse">
      <div className="h-7 w-28 bg-gray-200 rounded-xl mb-6" />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="h-3.5 w-24 bg-gray-200 rounded-lg" />
            <div className="h-8 w-32 bg-gray-200 rounded-xl" />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="h-5 w-36 bg-gray-200 rounded-lg mb-4" />
        <div className="h-52 bg-gray-100 rounded-xl" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
        <div className="h-5 w-28 bg-gray-200 rounded-lg mb-4" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
