import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans, Cairo, Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import HtmlLangUpdater from "@/app/components/HtmlLangUpdater";

const cormorant = Cormorant_Garamond({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
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
    <html lang="en" data-scroll-behavior="smooth" className={`${cormorant.variable} ${jakarta.variable} ${cairo.variable} ${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <HtmlLangUpdater />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
