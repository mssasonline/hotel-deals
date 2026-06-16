import type { Metadata } from 'next';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service — SelectedRoom',
  description: 'Read the SelectedRoom terms of service before booking.',
};

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using SelectedRoom, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.',
  },
  {
    title: '2. Booking & Payments',
    body: 'All bookings are subject to availability and confirmation by the partner hotel. Payments are processed securely via Stripe. Prices shown include applicable taxes unless stated otherwise.',
  },
  {
    title: '3. Cancellation Policy',
    body: 'Cancellation terms vary by hotel and rate type. Free-cancellation bookings may be cancelled up to 24 hours before check-in. Non-refundable rates cannot be cancelled or modified after booking.',
  },
  {
    title: '4. User Responsibilities',
    body: 'You agree to provide accurate information when booking, comply with the hotel\'s house rules, and not use the platform for any unlawful purpose.',
  },
  {
    title: '5. Intellectual Property',
    body: 'All content on SelectedRoom — including text, images, logos, and software — is the property of SelectedRoom or its licensors and may not be reproduced without written permission.',
  },
  {
    title: '6. Limitation of Liability',
    body: 'SelectedRoom acts as an intermediary between guests and hotels. We are not liable for disputes between guests and hotels, or for force-majeure events outside our control.',
  },
  {
    title: '7. Changes to Terms',
    body: 'We may update these Terms at any time. Continued use of the platform after changes constitutes your acceptance of the revised Terms.',
  },
  {
    title: '8. Contact',
    body: 'For questions about these Terms, contact us at legal@selectedroom.com.',
  },
];

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <section className="py-14 px-6 text-center" style={{ background: 'linear-gradient(135deg, #0F2260 0%, #1E3A8A 55%, #2563EB 100%)' }}>
          <p className="text-sm font-semibold tracking-widest uppercase text-brand-gold mb-3">Legal</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-white/60 text-sm">Last updated: June 2025</p>
        </section>

        <section className="max-w-3xl mx-auto px-6 py-14 space-y-8">
          {SECTIONS.map(({ title, body }) => (
            <div key={title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-900 mb-3">{title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}
