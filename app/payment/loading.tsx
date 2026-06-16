export default function PaymentLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 animate-pulse">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-5">
        <div className="h-7 w-40 bg-gray-200 rounded-xl" />
        <div className="h-24 bg-gray-200 rounded-xl" />
        <div className="space-y-3">
          <div className="h-5 w-28 bg-gray-200 rounded-lg" />
          <div className="h-12 bg-gray-200 rounded-xl" />
          <div className="h-12 bg-gray-200 rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-12 bg-gray-200 rounded-xl" />
            <div className="h-12 bg-gray-200 rounded-xl" />
          </div>
        </div>
        <div className="h-12 bg-gray-200 rounded-xl mt-2" />
      </div>
    </div>
  );
}
