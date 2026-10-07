import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Caregiver Kenya",
  description:
    "How Caregiver collects, uses and protects your personal data — in line with Kenya's Data Protection Act, 2019. Your rights, cookies, retention and contact details.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS = [
  {
    title: "1. Who we are",
    body: "Caregiver ('we', 'us') operates a home care & management platform connecting clients with caretakers and household professionals in Kenya. We are the data controller for personal data processed through the platform. Contact: info@caregiver.co.ke.",
  },
  {
    title: "2. Data we collect",
    body: "Account data (name, email, phone number, role, password — stored only as a salted hash). Profile data you choose to add (location, bio, avatar, rates, skills). Documents you upload (certifications, identity material) are stored securely in our file storage. Booking data (dates, notes, statuses). Messages you send us through the contact form. Technical data (logs, device and approximate location derived from IP).",
  },
  {
    title: "3. How we use your data",
    body: "To create and secure your account, to display caregiver profiles to clients, to process and track bookings, to verify and show credentials you upload, to respond to support requests, and to keep the platform safe from abuse. We do not sell your personal data — ever.",
  },
  {
    title: "4. Legal bases",
    body: "We process data because it is necessary to perform our contract with you (accounts, bookings), because you have given consent (uploads, marketing), or for our legitimate interests (security, fraud prevention, improving the service), as permitted under the Data Protection Act, 2019.",
  },
  {
    title: "5. What the public sees",
    body: "Client accounts are never displayed publicly. Caregiver profiles show your display name, location, bio, avatar, rates, skills and uploaded credentials — never your email address or phone number. Bookings are visible only to the client, the caretaker and our admins.",
  },
  {
    title: "6. Sharing",
    body: "Your data is shared only with the counterparties of your bookings, with service providers who host our database, file storage and authentication systems (bound by their own data-protection terms), and where the law requires disclosure.",
  },
  {
    title: "7. Retention",
    body: "Account data is kept while your account is active. Booking records are retained for operational and legal purposes. Contact-form messages are kept up to 24 months. You may request deletion of your account at any time (see below).",
  },
  {
    title: "8. Cookies & local storage",
    body: "We use strictly necessary session cookies to keep you signed in, and local storage only to remember your light/dark theme preference. We do not use advertising or cross-site tracking cookies.",
  },
  {
    title: "9. Your rights",
    body: "Under the Data Protection Act, 2019 you have the right to access, correct, delete or restrict processing of your data, to object to certain processing, and to data portability. To exercise any right, email info@caregiver.co.ke — we respond within 30 days. You may also lodge a complaint with the Office of the Data Protection Commissioner of Kenya.",
  },
  {
    title: "10. Security",
    body: "Passwords are hashed with bcrypt. Sessions use encrypted, httpOnly cookies. Access to the platform is role-based (client, worker, admin), uploads are validated by type and size, and traffic to our database is encrypted in transit.",
  },
  {
    title: "11. Children",
    body: "The platform is not directed to children under 18, and we do not knowingly collect their data. Care provided to children is arranged by adults through the platform.",
  },
  {
    title: "12. Changes & contact",
    body: "We may update this policy and will note the revision date below. Questions? Use our contact page or email info@caregiver.co.ke.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted">Last updated: 7 October 2026</p>

        <div className="mt-6 rounded-2xl border border-brand/30 bg-brand-soft p-4 text-sm text-brand-on-soft">
          This policy is written for Kenyan users and follows the{' '}
          <strong>Data Protection Act, 2019</strong>. Short version: we collect what the product
          needs, we never sell it, and you can ask to see or delete it any time.
        </div>

        <div className="mt-8 space-y-7">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-ink">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{section.body}</p>
            </section>
          ))}
        </div>

        <p className="mt-10 text-sm text-muted">
          Questions about your data?{" "}
          <Link href="/contact" className="font-semibold text-brand">
            Contact our team
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
