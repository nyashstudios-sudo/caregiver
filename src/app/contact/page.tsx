import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us — Caregiver Kenya Support",
  description:
    "Get in touch with the Caregiver team in Nairobi — booking help, account support, partnerships or feedback. We respond within one business day.",
  alternates: { canonical: "/contact" },
};

const DETAILS = [
  {
    icon: "📍",
    title: "Office",
    lines: ["Riverside Square, Westlands", "Nairobi, Kenya"],
  },
  {
    icon: "📞",
    title: "Phone & WhatsApp",
    lines: ["+254 700 000 000", "Mon – Fri, 8 AM – 6 PM EAT"],
  },
  {
    icon: "✉️",
    title: "Email",
    lines: ["info@caregiver.co.ke", "support@caregiver.co.ke"],
  },
  {
    icon: "🕒",
    title: "Support hours",
    lines: ["Monday – Friday: 8 AM – 6 PM", "Saturday: 9 AM – 2 PM (EAT)"],
  },
];

export default function ContactPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Contact us</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          We&apos;d love to hear from you
        </h1>
        <p className="mt-3 text-muted">
          Questions about bookings, your account or partnering with us? Reach the team in Nairobi —
          we typically reply within one business day.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {DETAILS.map((detail) => (
            <div key={detail.title} className="card flex items-start gap-3 p-4 sm:p-5">
              <span className="text-2xl" aria-hidden>
                {detail.icon}
              </span>
              <div>
                <p className="font-bold text-ink">{detail.title}</p>
                {detail.lines.map((line) => (
                  <p key={line} className="text-sm text-muted">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
