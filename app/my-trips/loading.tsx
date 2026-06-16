export default function MyTripsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 max-w-4xl mx-auto animate-pulse">
      <div className="h-8 w-36 bg-gray-200 rounded-xl mb-6" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex gap-4">
            <div className="w-24 h-20 bg-gray-200 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2.5">
              <div className="h-5 w-1/2 bg-gray-200 rounded-lg" />
              <div className="h-4 w-1/3 bg-gray-200 rounded-lg" />
              <div className="h-4 w-1/4 bg-gray-200 rounded-lg" />
            </div>
            <div className="w-20 h-8 bg-gray-200 rounded-xl self-start" />
          </div>
        ))}
      </div>
    </div>
  );
}
