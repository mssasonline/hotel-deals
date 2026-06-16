import type { Metadata } from 'next';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

export const metadata: Metadata = {
  title: 'Contact Us — SelectedRoom',
  description: 'Get in touch with the SelectedRoom team.',
};

const CHANNELS = [
  {
    title: 'Guest Support',
    desc: 'Questions about a booking, cancellation, or payment.',
    email: 'support@selectedroom.com',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    ),
  },
  {
    title: 'Partner Inquiries',
    desc: 'Interested in listing your hotel on SelectedRoom.',
    email: 'partners@selectedroom.com',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    ),
  },
  {
    title: 'Press & Media',
    desc: 'Media inquiries, interviews, and press kits.',
    email: 'press@selectedroom.com',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    ),
  },
  {
    title: 'Legal',
    desc: 'Privacy, data requests, and legal notices.',
    email: 'legal@selectedroom.com',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    ),
  },
];

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen" style={{ background: '#F8FAFC' }}>
        {/* Hero */}
        <section className="py-14 px-6 text-center" style={{ background: 'linear-gradient(135deg, #0A1A4F 0%, #0F2260 50%, #1A3A8F 100%)', boxShadow: '0 4px 24px rgba(15,34,96,0.18)' }}>
          <p className="text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: '#D97706' }}>Get in Touch</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: '#fff' }}>Contact Us</h1>
          <p className="max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.65)' }}>
            We typically respond within one business day.
          </p>
        </section>

        {/* Contact channels */}
        <section className="max-w-4xl mx-auto px-6 py-14">
          <div className="grid sm:grid-cols-2 gap-5">
            {CHANNELS.map(({ title, desc, email, icon }) => (
              <div key={title} className="bg-white rounded-2xl p-6 flex gap-4" style={{ border: '1px solid rgba(30,58,138,0.08)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
                <div className="w-11 h-11 rounded-xl bg-[#EEF4FF] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-[#1E3A8A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {icon}
                  </svg>
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-gray-900 mb-1">{title}</h2>
                  <p className="text-sm text-gray-500 mb-3 leading-relaxed">{desc}</p>
                  <a
                    href={`mailto:${email}`}
                    className="text-sm font-semibold text-[#1E3A8A] hover:underline break-all"
                  >
                    {email}
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Response time note */}
          <div className="mt-8 bg-[#EEF4FF] rounded-2xl border border-[#1E3A8A]/10 px-6 py-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-[#1E3A8A] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-[#1E3A8A] leading-relaxed">
              <strong>For urgent booking issues</strong>, please include your booking reference in the subject line
              so we can assist you faster.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
