export default function AdminDashboardLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded-xl mb-8" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div className="h-4 w-20 bg-gray-200 rounded-lg" />
            <div className="h-8 w-28 bg-gray-200 rounded-xl" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
        <div className="h-5 w-32 bg-gray-200 rounded-lg mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
