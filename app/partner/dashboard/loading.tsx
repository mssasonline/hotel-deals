export default function PartnerDashboardLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-pulse">
      <div className="h-8 w-40 bg-gray-200 rounded-xl mb-8" />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div className="h-4 w-16 bg-gray-200 rounded-lg" />
            <div className="h-7 w-24 bg-gray-200 rounded-xl" />
          </div>
        ))}
      </div>

      {/* Recent bookings */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
        <div className="h-5 w-36 bg-gray-200 rounded-lg mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
