import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

export const metadata: Metadata = {
  title: 'About Us — SelectedRoom',
  description: 'Learn about SelectedRoom and our mission to make hotel booking simple and affordable.',
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen" style={{ background: '#F8FAFC' }}>
        {/* Hero */}
        <section className="py-20 px-6 text-center" style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
          <p className="text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: '#D97706' }}>About Us</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: '#fff' }}>Built for Smarter Stays</h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.65)' }}>
            SelectedRoom connects travelers with the best hotel deals — at the right price, at the right time.
          </p>
        </section>

        {/* Mission */}
        <section className="max-w-4xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We believe great hotel rooms shouldn&apos;t require endless searching. SelectedRoom surfaces last-minute deals,
              flash discounts, and time-sensitive offers so guests can book confidently and partners can fill rooms fast.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Our platform is built on transparency — real prices, real availability, and real reviews.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-8 space-y-5" style={{ border: '1px solid rgba(30,58,138,0.08)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
            {[
              { n: '500+', label: 'Partner Hotels' },
              { n: '50K+', label: 'Happy Guests' },
              { n: '12',   label: 'Cities Covered' },
            ].map(({ n, label }) => (
              <div key={label} className="flex items-center gap-4">
                <span className="text-3xl font-bold text-[#1E3A8A] w-20 shrink-0">{n}</span>
                <span className="text-gray-600 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Values */}
        <section className="bg-white border-y border-gray-100 py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">What We Stand For</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { title: 'Transparency', desc: 'No hidden fees. The price you see is the price you pay.' },
                { title: 'Speed',        desc: 'Book in under a minute. No account required for browsing.' },
                { title: 'Trust',        desc: 'Every hotel is vetted. Every review is verified.' },
              ].map(({ title, desc }) => (
                <div key={title} className="bg-white rounded-2xl p-6" style={{ border: '1px solid rgba(30,58,138,0.08)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
                  <div className="w-10 h-10 rounded-xl bg-[#EEF4FF] flex items-center justify-center mb-4">
                    <div className="w-3 h-3 rounded-full bg-[#1E3A8A]" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to find your next stay?</h2>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 text-white font-semibold px-8 py-3 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}
          >
            Browse Hotels
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
