import HotelCard, { type Hotel } from "./HotelCard";

interface DealsSectionProps {
  id?: string;
  title: string;
  subtitle?: string;
  hotels: Hotel[];
  viewAllLabel?: string;
  dark?: boolean;
}

export default function DealsSection({
  id,
  title,
  subtitle,
  hotels,
  viewAllLabel = "View All Deals",
  dark = false,
}: DealsSectionProps) {
  return (
    <section
      id={id}
      className={`py-14 ${dark ? "bg-brand-blue-dark" : "bg-white"}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className={`text-2xl sm:text-3xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>
              {title}
            </h2>
            {subtitle && (
              <p className={`mt-1 text-sm ${dark ? "text-white/55" : "text-gray-500"}`}>
                {subtitle}
              </p>
            )}
            <div className="mt-2.5 h-0.5 w-14 rounded-full" style={{ background: 'linear-gradient(90deg, #B45309, #D97706)' }} />
          </div>
          <a
            href="#"
            className="text-brand-gold hover:text-yellow-400 text-sm font-semibold flex items-center gap-1 transition-colors shrink-0 ml-4"
          >
            {viewAllLabel}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotels.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} />
          ))}
        </div>

      </div>
    </section>
  );
}
