export default function PartnerAnalyticsLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-pulse">
      <div className="h-7 w-28 bg-gray-200 rounded-xl mb-6" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="h-3.5 w-20 bg-gray-200 rounded-lg" />
            <div className="h-8 w-24 bg-gray-200 rounded-xl" />
            <div className="h-3 w-14 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Hotel selector */}
      <div className="h-10 w-56 bg-gray-200 rounded-xl mb-5" />

      {/* Hotel metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="h-3.5 w-16 bg-gray-200 rounded-lg" />
            <div className="h-7 w-20 bg-gray-200 rounded-xl" />
          </div>
        ))}
      </div>

      {/* Bookings table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
        <div className="h-5 w-32 bg-gray-200 rounded-lg mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
