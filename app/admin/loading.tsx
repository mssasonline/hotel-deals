export default function AdminLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-pulse">
      {/* Page title */}
      <div className="h-7 w-40 bg-gray-200 rounded-xl mb-6" />

      {/* Generic table skeleton */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-32 bg-gray-200 rounded-lg" />
          <div className="h-8 w-24 bg-gray-200 rounded-xl" />
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-11 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
