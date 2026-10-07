import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Caregiver — Home Care & Management Kenya",
    short_name: "Caregiver",
    description:
      "Hire verified nannies, elder caregivers, home managers and wellness professionals across Kenya. Transparent KES rates, real certificates, M-Pesa payments.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f8f7",
    theme_color: "#0d9488",
    lang: "en-KE",
    categories: ["business", "lifestyle", "medical"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Find caretakers", url: `${SITE_URL}/caretakers` },
      { name: "My bookings", url: `${SITE_URL}/dashboard` },
      { name: "Messages", url: `${SITE_URL}/messages` },
      { name: "Wallet", url: `${SITE_URL}/wallet` },
    ],
  };
}
