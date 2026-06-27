import type { Metadata } from "next";
import { Inter, Cairo, Sora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import HtmlLangUpdater from "@/app/components/HtmlLangUpdater";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});


const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://selectedroom.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SelectedRoom — Tonight's Best Hotel Prices",
    template: '%s — SelectedRoom',
  },
  description:
    "Flash deals on luxury hotel rooms — up to 50% off, tonight only. SelectedRoom connects travelers with premium unsold rooms at end-of-day prices.",
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  other: {
    'theme-color': '#12224F',
  },
  openGraph: {
    siteName: 'SelectedRoom',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: "SelectedRoom — Tonight's Best Hotel Prices",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${cairo.variable} ${sora.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <HtmlLangUpdater />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
