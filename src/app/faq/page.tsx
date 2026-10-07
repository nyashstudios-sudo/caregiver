import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ — Caregiver Kenya: Rates, Bookings & Safety",
  description:
    "Answers to common questions about hiring caregivers in Kenya — KES rates, verified certificates, the booking workflow, phone login, privacy and safety.",
  alternates: { canonical: "/faq" },
};

type Item = { q: string; a: string };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "General",
    items: [
      {
        q: "What is Caregiver?",
        a: "Caregiver is a Kenyan home care & management platform where clients discover and book verified caretakers, nannies, home managers and wellness professionals — and where care workers showcase their skills, rates and certificates.",
      },
      {
        q: "Which areas do you cover?",
        a: "Caregivers list across Kenya — Nairobi neighbourhoods like Kilimani, Westlands, Karen and Lavington, plus Mombasa, Kisumu, Nakuru, Eldoret and beyond. Use the location filter on the directory to check your area.",
      },
      {
        q: "How much does it cost to join?",
        a: "Creating an account and browsing caretakers is free. Hourly rates are set by each caretaker and shown openly in KES on their profile.",
      },
    ],
  },
  {
    title: "Bookings & payments",
    items: [
      {
        q: "How does a booking work?",
        a: "Open a caretaker's profile, pick a date and time, add notes and send the request. It starts as PENDING, moves to ACCEPTED when the caretaker agrees, and COMPLETED after the job. Either side can cancel before completion.",
      },
      {
        q: "How much does a caregiver cost in Kenya?",
        a: "General household and childcare help typically runs KES 400–900 per hour. Certified specialisations such as first aid, clinical support and professional massage run KES 900–1,500 per hour. Every profile publishes its exact rate.",
      },
      {
        q: "Can I cancel a booking?",
        a: "Yes — while a booking is PENDING or ACCEPTED, either the client or the caretaker can cancel it from the bookings dashboard. Completed bookings cannot be cancelled.",
      },
    ],
  },
  {
    title: "Trust & safety",
    items: [
      {
        q: "Are certificates verified?",
        a: "Caregivers upload their actual documents — first-aid cards, CPR/AED cards and massage diplomas — as PDFs or photos you can open directly on their profile. Always check the issuing body and dates.",
      },
      {
        q: "What does the First Aid Certified badge mean?",
        a: "It means the caregiver has flagged first aid as a specialisation and has at least one uploaded credential supporting it. Open their credentials section to read the document itself.",
      },
      {
        q: "How is my data protected?",
        a: "We follow Kenya's Data Protection Act, 2019. Your contact details are never shown publicly, sessions are secured with encrypted cookies, and role-based access controls keep clients, workers and admins in their own lanes.",
      },
    ],
  },
  {
    title: "Accounts",
    items: [
      {
        q: "How do I sign up as a worker instead of a client?",
        a: "On the signup page choose 'I want to work' — you will get access to the worker portal where you set your KES rate, skills, bio and upload certifications.",
      },
      {
        q: "Can I log in with my phone number?",
        a: "Yes. Add a phone number to your account, then use the 'Phone code' tab on the sign-in page — we send a one-time code you enter to start your session.",
      },
      {
        q: "How do I showcase my certifications?",
        a: "Sign in, open the Worker portal and use the Certifications card to upload PDFs or images of your credentials. They appear immediately on your public profile.",
      },
    ],
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: GROUPS.flatMap((group) =>
    group.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    }))
  ),
};

export default function FaqPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Help centre</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Frequently asked questions
        </h1>
        <p className="mt-3 text-muted">
          Everything about rates, bookings, verification and safety on Caregiver — if you are still
          stuck, <Link href="/contact" className="font-semibold text-brand">talk to us</Link>.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-3xl space-y-10">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="mb-4 text-xl font-bold text-ink">{group.title}</h2>
            <div className="space-y-3">
              {group.items.map((item) => (
                <details key={item.q} className="card group p-5">
                  <summary className="cursor-pointer list-none font-bold text-ink marker:hidden">
                    <span className="float-right text-brand transition group-open:rotate-45">
                      +
                    </span>
                    {item.q}
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="card mx-auto mt-12 max-w-3xl p-8 text-center">
        <h2 className="text-xl font-bold text-ink">Still have questions?</h2>
        <p className="mt-2 text-sm text-muted">
          Our Nairobi team responds within one business day.
        </p>
        <Link href="/contact" className="btn btn-primary mt-4">
          Contact support
        </Link>
      </div>
    </div>
  );
}
