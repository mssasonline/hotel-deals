import Link from 'next/link';

export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F8FAFC' }}>
      <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center" style={{ border: '1px solid rgba(30,58,138,0.08)', boxShadow: '0 2px 12px rgba(15,34,96,0.06)' }}>
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">Account Suspended</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Your partner account has been suspended. Contact our support team to appeal or get more information.
        </p>

        <div className="space-y-3">
          <a
            href="mailto:support@selectedroom.com"
            className="block w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #0F2260 0%, #1A3A8F 100%)', boxShadow: '0 4px 14px rgba(15,34,96,0.25)' }}
          >
            Contact Support
          </a>
          <Link
            href="/"
            className="block w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Go to Homepage
          </Link>
          <Link
            href="/login"
            className="block w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Sign in with a different account
          </Link>
        </div>

        <p className="text-gray-400 text-xs mt-5">
          support@selectedroom.com
        </p>
      </div>
    </div>
  );
}
