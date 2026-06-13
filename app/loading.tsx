export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm">Loading deals&hellip;</p>
      </div>
    </div>
  );
}
