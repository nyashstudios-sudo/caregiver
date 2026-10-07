import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Caregiver Kenya",
  description:
    "The rules that govern use of the Caregiver platform in Kenya — accounts, bookings, worker responsibilities, payments, acceptable use and liability.",
  alternates: { canonical: "/terms" },
};

const SECTIONS = [
  {
    title: "1. Acceptance",
    body: "By creating an account or using Caregiver ('the platform'), you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use the platform.",
  },
  {
    title: "2. Accounts",
    body: "You must provide accurate information and keep your credentials confidential. You are responsible for all activity under your account. One person or household may operate only one account per role, and you must be at least 18 years old to register.",
  },
  {
    title: "3. Roles",
    body: "Clients browse profiles and send booking requests. Workers maintain their profiles, set their rates and accept or decline requests. Admins moderate the platform. Role permissions are enforced technically; misrepresenting your role is a breach of these Terms.",
  },
  {
    title: "4. Bookings & payments",
    body: "A booking request is non-binding until the caretaker accepts it. All agreed work, pricing and payment arrangements take place directly between client and caretaker — hourly rates shown on profiles are in KES and are the caretaker's own rates. Caregiver does not process payment on the platform at this time and is not a party to the care agreement.",
  },
  {
    title: "5. Worker responsibilities",
    body: "Workers must accurately represent their skills, experience and certifications. Uploading documents you do not own, or falsifying credentials, is grounds for immediate removal. Workers are responsible for their own tax obligations and any permits required to work in Kenya.",
  },
  {
    title: "6. Client responsibilities",
    body: "Clients must treat caretakers with respect, provide a safe working environment, and honour the agreed schedule. Cancellations should be made through the platform so both sides see the status change.",
  },
  {
    title: "7. Content & documents",
    body: "You retain ownership of the content you upload. By uploading it, you grant us the licence needed to store it and display it on your profile. You may not upload content that is unlawful, infringing or harmful.",
  },
  {
    title: "8. Acceptable use",
    body: "No harassment, discrimination, fraud, scraping, spamming, or attempt to circumvent the platform for unlawful purposes. We may suspend accounts that endanger other users or violate these Terms.",
  },
  {
    title: "9. Service availability",
    body: "We aim to keep Caregiver available but the platform is provided 'as is' without guarantees of uninterrupted access. We may modify, suspend or discontinue features with reasonable notice where practical.",
  },
  {
    title: "10. Limitation of liability",
    body: "To the maximum extent permitted by Kenyan law, Caregiver is not liable for indirect or consequential losses, or for disputes arising directly between clients and caretakers. Our total liability for any claim is limited to the greater of KES 10,000 or amounts paid to us in the 12 months before the claim.",
  },
  {
    title: "11. Governing law",
    body: "These Terms are governed by the laws of Kenya, and the courts of Nairobi have exclusive jurisdiction over disputes arising from them.",
  },
  {
    title: "12. Changes & contact",
    body: "We may update these Terms; material changes will be announced on the platform. Continued use after changes means acceptance. Questions? Contact info@caregiver.co.ke.",
  },
];

export default function TermsPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted">Last updated: 7 October 2026</p>

        <div className="mt-8 space-y-7">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-ink">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{section.body}</p>
            </section>
          ))}
        </div>

        <p className="mt-10 text-sm text-muted">
          Questions about these Terms?{" "}
          <Link href="/contact" className="font-semibold text-brand">
            Contact our team
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
