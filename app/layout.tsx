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


export const metadata: Metadata = {
  title: "SelectedRoom — Tonight's Best Hotel Prices",
  description:
    "Flash deals on luxury hotel rooms — up to 50% off, tonight only. SelectedRoom connects travelers with premium unsold rooms at end-of-day prices.",
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
