import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { PwaInstall } from "@/components/PwaInstall";
import { getSessionUser } from "@/lib/session";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Caregiver — Hire Verified Caretakers in Kenya | Home Care & Management",
    template: "%s · Caregiver",
  },
  description:
    "Find verified caretakers, nannies, home managers and wellness professionals across Nairobi and Kenya. Compare rates in KES, check real certifications and book with confidence.",
  keywords: [
    "caregiver Kenya",
    "caretaker Nairobi",
    "nanny agency Nairobi",
    "home care Kenya",
    "house manager Nairobi",
    "elder care Kenya",
    "massage therapist Nairobi",
    "first aid certified caregiver",
    "hire caretaker Nairobi",
    "wellness professionals Kenya",
  ],
  openGraph: {
    type: "website",
    siteName: "Caregiver",
    title: "Caregiver — Hire Verified Caretakers in Kenya",
    description:
      "Kenya's home care & management platform. Browse verified caretakers, compare KES hourly rates and book trusted professionals.",
    url: SITE_URL,
    locale: "en_KE",
  },
  twitter: {
    card: "summary_large_image",
    title: "Caregiver — Hire Verified Caretakers in Kenya",
    description:
      "Browse verified caretakers, nannies and wellness professionals across Kenya. Real certifications, transparent KES rates.",
  },
  robots: { index: true, follow: true },
  category: "Home care",
  // PWA: installable + native-ish shell on mobile.
  applicationName: "Caregiver",
  appleWebApp: {
    capable: true,
    title: "Caregiver",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f8f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a121b" },
  ],
  width: "device-width",
  initialScale: 1,
};

/** Applies the persisted theme before first paint (no flash of wrong theme). */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d){document.documentElement.classList.add('dark');}}catch(e){}})();`;

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Caregiver",
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
      address: {
        "@type": "PostalAddress",
        streetAddress: "Riverside Square, Westlands",
        addressLocality: "Nairobi",
        addressCountry: "KE",
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: "info@caregiver.co.ke",
        telephone: "+254-700-000-000",
        areaServed: "KE",
      },
      sameAs: [],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Caregiver",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Header user={user} />
        {/* Bottom navigation overlays the viewport on phones — keep content clear of it. */}
        <main className="min-h-[60vh] pb-24 md:pb-0">{children}</main>
        <Footer />
        <BottomNav role={user?.role} />
        <PwaInstall />
      </body>
    </html>
  );
}
