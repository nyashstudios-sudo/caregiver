import { PrismaClient, Role, PostStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const BUCKET = process.env.STORAGE_BUCKET ?? "caregiver-uploads";

/** Public URL for a seeded credential document in file storage. */
function credentialUrl(name: string): string {
  if (SUPABASE_URL) {
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/seed/${name}.pdf`;
  }
  return `/api/files/seed/${name}.pdf`;
}

/** Public URL for a seeded portrait avatar in file storage. */
function avatarUrl(name: string): string {
  if (SUPABASE_URL) {
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/seed/avatars/${name}.jpg`;
  }
  return `/api/files/seed/avatars/${name}.jpg`;
}

function daysFromNow(days: number, hour = 9): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function daysAgo(days: number, hour = 10): Date {
  return daysFromNow(-days, hour);
}

type SeedUser = {
  email: string;
  password: string;
  role: Role;
  phone?: string;
  fullName: string;
  location: string;
  bio?: string;
  avatar?: string;
};

async function upsertBaseUser(data: SeedUser) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.upsert({
    where: { email: data.email },
    update: {
      role: data.role,
      phone: data.phone ?? undefined,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: data.email,
      phone: data.phone ?? null,
      passwordHash,
      role: data.role,
      // Demo accounts skip the email round-trip — real signups verify via OTP.
      emailVerifiedAt: new Date(),
    },
  });

  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      fullName: data.fullName,
      location: data.location,
      bio: data.bio ?? null,
      avatarUrl: data.avatar ? avatarUrl(data.avatar) : null,
      // Demo workers arrive pre-vetted so badges render in the seed state.
      ...(data.role === "WORKER" ? { verifiedAt: new Date() } : {}),
    },
    create: {
      userId: user.id,
      fullName: data.fullName,
      location: data.location,
      bio: data.bio ?? null,
      avatarUrl: data.avatar ? avatarUrl(data.avatar) : null,
      ...(data.role === "WORKER" ? { verifiedAt: new Date() } : {}),
    },
  });

  return { user, profile };
}

async function upsertWorkerDetails(
  profileId: string,
  details: {
    hourlyRate: number;
    yearsExperience: number;
    hasFirstAid: boolean;
    isCertifiedMassage: boolean;
    skillsSummary: string;
  }
) {
  return prisma.caretakerDetails.upsert({
    where: { profileId },
    update: details,
    create: { profileId, ...details },
  });
}

async function seedCertifications(
  caretakerDetailsId: string,
  certs: { title: string; file: string; issuedAt?: Date }[]
) {
  await prisma.certification.deleteMany({ where: { caretakerDetailsId } });
  if (certs.length === 0) return;
  await prisma.certification.createMany({
    data: certs.map((c) => ({
      caretakerDetailsId,
      title: c.title,
      documentUrl: credentialUrl(c.file),
      issuedAt: c.issuedAt ?? null,
      // Demo credentials arrive approved; fresh uploads start PENDING.
      status: "APPROVED" as const,
      reviewedAt: new Date(),
    })),
  });
}

/* ------------------------------------------------------------------ */
/* Blog content — SEO-optimised for the Kenyan market                 */
/* ------------------------------------------------------------------ */

type SeedPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  daysAgo: number;
  content: string;
};

const POSTS: SeedPost[] = [
  {
    slug: "caregiver-cost-kenya-2026",
    title: "How Much Does a Caregiver Cost in Kenya in 2026?",
    excerpt:
      "A real-world breakdown of caregiver rates in Nairobi and beyond — hourly, daily and live-in pricing in KES, and what affects the price.",
    category: "Pricing",
    tags: ["pricing", "nairobi", "caregiver"],
    daysAgo: 2,
    content: `If you are budgeting for home care in Kenya, the first question is always: **how much does a caregiver cost?** Rates depend on experience, certifications and whether the care is hourly, daily or live-in.

## Caregiver rates in KES (2026)

- **Hourly help:** KES 400 – KES 900 per hour for general household and childcare support.
- **Specialised care:** KES 900 – KES 1,500 per hour for first-aid certified caregivers, massage therapists and clinical support.
- **Live-in caregivers:** KES 25,000 – KES 45,000 per month, depending on experience and duties.
- **House managers:** KES 600 – KES 1,200 per hour, or KES 40,000+ per month for full household management.

These are typical ranges you will see on [our directory](/caretakers) — every profile shows a transparent hourly rate in KES, so you can compare before you book.

## What makes a caregiver cost more?

1. **Verified certifications.** A caregiver with a valid first-aid card or massage diploma can charge more — and clients happily pay it.
2. **Experience.** Seven years of elderly care beats one year of casual help.
3. **Location.** Kilimani, Westlands and Karen commands higher rates than outlying areas.
4. **Specialisation.** Chronic-care support and infant care are premium skills.

## How to keep costs fair

Book through the platform: rates are displayed up front, bookings move through a clear PENDING → ACCEPTED → COMPLETED workflow, and you only agree to a price you can see. Create a [client account](/signup?role=CLIENT) and start comparing caregivers today.
`,
  },
  {
    slug: "hiring-nanny-nairobi-guide",
    title: "Hiring a Nanny in Nairobi: The Complete 2026 Guide",
    excerpt:
      "From vetting and interviews to first-aid checks and fair pay — everything Nairobi parents should know before hiring a nanny.",
    category: "Guides",
    tags: ["nanny", "nairobi", "parents"],
    daysAgo: 6,
    content: `Hiring a nanny in Nairobi is one of the most important decisions a family can make. This guide walks you through a process that keeps your children safe and your nanny respected.

## 1. Write a clear role description

Spell out duties: school runs, meal prep, homework help, bedtime routines. Nannies who know exactly what is expected accept jobs they are genuinely suited to.

## 2. Prioritise verified skills

On Caregiver, look for the **First Aid Certified** badge. A nanny who can respond to choking, falls and fevers is worth far more than one who cannot. You can open their uploaded certificate right on the profile.

## 3. Interview around your home's rhythm

Ask scenario questions: *"What do you do if a toddler refuses to nap?"* or *"How do you handle a fever at2 PM?"* Good nannies answer with routine, not panic.

## 4. Agree on pay in writing

Nairobi nanny rates typically run **KES 400 – KES 900 per hour**, or KES 18,000 – KES 35,000 monthly for full-time roles. Put duties, hours and pay in writing before day one.

## 5. Use a booking trail

Send your request through the platform so dates, notes and status live in one place. No disputes about what was agreed.

Ready? [Browse nannies in Nairobi](/caretakers?category=nanny) and request a booking in minutes.
`,
  },
  {
    slug: "first-aid-every-kenyan-household-should-know",
    title: "First Aid Every Kenyan Household Should Know",
    excerpt:
      "Choking, burns, malaria fevers and road accidents — the first-aid basics every family in Kenya should be ready for.",
    category: "Health",
    tags: ["first aid", "safety", "family"],
    daysAgo: 11,
    content: `Emergencies at home are rare — until they are not. Here are the first-aid basics every Kenyan household should know, straight from certified caregivers on our platform.

## Choking (especially children)

- Encourage coughing; do not slap the back of a standing child.
- If coughing fails, give **5 back blows**, then **5 abdominal thrusts** for infants or adults.
- Call for medical help immediately if the object is not dislodged.

## Burns and scalds

1. Cool the burn under clean, running water for at least 20 minutes.
2. Remove rings or tight items early.
3. Do **not** apply toothpaste, oil or ice.
4. Cover loosely with cling film or a clean cloth and seek care for anything larger than a palm.

## Fever and dehydration

- Sponging with lukewarm water and paracetamol as directed.
- ORS after every loose stool — dehydration kills faster than the fever.
- Seek urgent care for seizures, confusion or refusal to drink.

## When to trust a certified caregiver

Every caregiver carrying our **First Aid Certified** badge has uploaded a current certificate you can open on their profile. That is the difference between help and hope.

[Find a first-aid certified caregiver](/caretakers?firstAid=on) near you.
`,
  },
  {
    slug: "elder-care-at-home-kenya",
    title: "Elder Care at Home in Kenya: A Family's Guide",
    excerpt:
      "How Kenyan families can keep ageing parents comfortable at home — care plans, costs in KES, and when to hire professional help.",
    category: "Family",
    tags: ["elder care", "family", "nairobi"],
    daysAgo: 17,
    content: `Many Kenyan families prefer to care for ageing parents at home rather than in a facility. With the right support, home care keeps elders happier, calmer and closer to family.

## Build a simple care plan

- **Daily routine:** bathing, dressing, meals and medication reminders at fixed times.
- **Mobility:** non-slip mats, handrails and assisted walking.
- **Companionship:** conversation, radio, church services and family visits.
- **Appointments:** track clinic dates and lab results in one notebook.

## When to bring in a professional

Consider a professional caregiver when:

- Medication schedules have become complex.
- Night-time supervision is needed.
- Mobility has declined to the point of fall risk.
- Family caregivers are exhausted or working long hours.

## What it costs

Professional elder care in Kenya runs roughly **KES 500 – KES 1,200 per hour**, with live-in arrangements from KES 30,000 per month. Caregivers with chronic-care experience and first-aid certification sit at the top of that range.

## Finding someone you can trust

On [our directory](/caretakers?category=elder) you can filter for first-aid certified caregivers, read their bios, see years of experience and open their uploaded credentials before you book.

Start with a short daytime booking — a trial shift tells you more than any interview.
`,
  },
  {
    slug: "verified-caregiver-certificates-kenya",
    title: "Why Verified Certificates Matter When Hiring a Caregiver",
    excerpt:
      "Fake credentials are common in informal care hiring. Here's how uploaded, viewable certificates protect Kenyan families.",
    category: "Trust",
    tags: ["verification", "certificates", "trust"],
    daysAgo: 24,
    content: `In the informal care market, a claim of "I am certified" is just that — a claim. Verification changes the maths entirely.

## The problem with word-of-mouth hiring

Families hire through friends of friends, and certificates stay in a drawer — if they exist at all. There is no way to check dates, issuing bodies or authenticity before someone is alone in your home with your children or parents.

## What verification looks like on Caregiver

- Caregivers **upload their actual documents** — first-aid cards, CPR/AED competency cards, massage diplomas.
- Documents live on the profile as **openable PDFs**. You click, you read, you decide.
- Two green badges — **First Aid Certified** and **Professional Massage** — flag verified specialisations at a glance.

## What to check on any certificate

1. **Issuer** — is it a recognised body (St John Ambulance, Red Cross, accredited colleges)?
2. **Date** — first-aid cards typically expire every2 years.
3. **Name match** — does it match the profile holder?
4. **Scope** — does it cover what you need help with?

## Hire with evidence, not hope

[Browse verified caregivers](/caretakers), open their credentials, and book with the confidence that comes from evidence.
`,
  },
  {
    slug: "house-manager-vs-house-helper-kenya",
    title: "House Manager vs House Helper: What's the Difference?",
    excerpt:
      "Both keep a home running — but the scope, pay and responsibility differ a lot. A clear comparison for Kenyan households.",
    category: "Household",
    tags: ["house manager", "household", "hiring"],
    daysAgo: 31,
    content: `The terms get used interchangeably, but a house manager and a house helper do very different jobs — and should be paid accordingly.

## House helper

- **Scope:** cleaning, laundry, cooking, dishes, errands.
- **Autonomy:** works to direct instructions.
- **Pay in Kenya:** KES 400 – KES 600 per hour, or KES 15,000 – KES 25,000 monthly full-time.
- **Best for:** families who are home and happy to direct daily tasks.

## House manager

- **Scope:** runs the whole household — staff supervision, budgets, shopping, meal planning, vendor management, schedules.
- **Autonomy:** owns outcomes; solves problems without being told.
- **Pay in Kenya:** KES 600 – KES 1,200 per hour, or KES 40,000 – KES 70,000 monthly for experienced managers.
- **Best for:** busy professionals, large homes, expatriate households.

## Which do you actually need?

Ask two questions: *Do I have time to manage someone daily?* and *Is anyone accountable for the whole home?* If the answers are "no" and "no", you need a house manager.

[Compare household managers](/caretakers?category=house) on the platform — rates, experience and references are all on the profile.
`,
  },
];

/* ------------------------------------------------------------------ */

async function main() {
  console.log("Seeding Kenya demo data…");

  // Fresh demo dataset: reset in FK-safe order (test/seed data only).
  await prisma.booking.deleteMany();
  await prisma.certification.deleteMany();
  await prisma.caretakerDetails.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.contactMessage.deleteMany();

  // --- Admin (per project brief) ---------------------------------------
  await upsertBaseUser({
    email: "caregiver@info.com",
    password: "Mtemi@254#",
    role: "ADMIN",
    fullName: "Caregiver Admin",
    location: "Nairobi, Kenya",
    bio: "Platform administrator.",
    avatar: "admin",
  });

  // --- Clients ----------------------------------------------------------
  const jane = await upsertBaseUser({
    email: "jane@client.app",
    password: "Client123!",
    role: "CLIENT",
    phone: "+254711000001",
    fullName: "Jane Doe",
    location: "Kilimani, Nairobi",
    bio: "Mother of twins juggling work and family in Kilimani.",
    avatar: "jane",
  });
  const brian = await upsertBaseUser({
    email: "brian@client.app",
    password: "Client123!",
    role: "CLIENT",
    phone: "+254711000002",
    fullName: "Brian Otieno",
    location: "Westlands, Nairobi",
    bio: "Caring for my grandfather while travelling for work.",
    avatar: "brian",
  });

  // --- Workers (KES rates, Kenyan locations) ----------------------------
  type WorkerSeed = SeedUser & {
    details: {
      hourlyRate: number;
      yearsExperience: number;
      hasFirstAid: boolean;
      isCertifiedMassage: boolean;
      skillsSummary: string;
    };
    certifications: { title: string; file: string; issuedAt?: Date }[];
  };

  const workers: WorkerSeed[] = [
    {
      email: "amina@caretaker.app",
      password: "Worker123!",
      role: "WORKER",
      phone: "+254722000011",
      fullName: "Amina Wanjiku",
      location: "Kilimani, Nairobi",
      bio: "Certified nanny with5 years caring for infants and toddlers in Nairobi homes — school runs, meal prep, bedtime routines and a current first-aid card. I treat every child like my own.",
      avatar: "amina",
      details: {
        hourlyRate: 500,
        yearsExperience: 5,
        hasFirstAid: true,
        isCertifiedMassage: false,
        skillsSummary: "Nanny services, infant care, toddler routines, school runs, first aid",
      },
      certifications: [
        { title: "First Aid Certification", file: "first-aid", issuedAt: new Date("2025-03-14") },
      ],
    },
    {
      email: "james@caretaker.app",
      password: "Worker123!",
      role: "WORKER",
      phone: "+254722000012",
      fullName: "James Kariuki",
      location: "Westlands, Nairobi",
      bio: "8 years supporting elderly clients with mobility, medication reminders and daily routines. CPR/AED competent and patient with dementia care.",
      avatar: "james",
      details: {
        hourlyRate: 650,
        yearsExperience: 8,
        hasFirstAid: true,
        isCertifiedMassage: false,
        skillsSummary: "Elder care, mobility support, medication reminders, CPR, chronic care",
      },
      certifications: [
        { title: "CPR & AED Competency Card", file: "cpr-card", issuedAt: new Date("2025-06-02") },
      ],
    },
    {
      email: "sarah@caretaker.app",
      password: "Worker123!",
      role: "WORKER",
      phone: "+254722000013",
      fullName: "Sarah Njeri",
      location: "Karen, Nairobi",
      bio: "House manager for upscale homes in Karen and Lavington — staff supervision, meal planning, shopping lists and a spotless home without you lifting a finger.",
      avatar: "sarah",
      details: {
        hourlyRate: 750,
        yearsExperience: 6,
        hasFirstAid: false,
        isCertifiedMassage: false,
        skillsSummary: "Home management, household staff supervision, meal prep, laundry, deep cleaning",
      },
      certifications: [],
    },
    {
      email: "david@caretaker.app",
      password: "Worker123!",
      role: "WORKER",
      phone: "+254722000014",
      fullName: "David Ochieng",
      location: "Lavington, Nairobi",
      bio: "Sports massage therapist with9 years in studios and home visits — deep tissue, recovery work and relaxation therapy for busy professionals.",
      avatar: "david",
      details: {
        hourlyRate: 1200,
        yearsExperience: 9,
        hasFirstAid: false,
        isCertifiedMassage: true,
        skillsSummary: "Sports massage, deep tissue, massage therapy, wellness, home visits",
      },
      certifications: [
        { title: "Professional Massage Diploma", file: "massage-diploma", issuedAt: new Date("2023-09-19") },
      ],
    },
    {
      email: "grace@caretaker.app",
      password: "Worker123!",
      role: "WORKER",
      phone: "+254722000015",
      fullName: "Grace Achieng",
      location: "Nyali, Mombasa",
      bio: "Coast-based caregiver specialising in elderly and chronic-care support — first-aid certified with a gentle, respectful approach.",
      avatar: "grace",
      details: {
        hourlyRate: 550,
        yearsExperience: 7,
        hasFirstAid: true,
        isCertifiedMassage: false,
        skillsSummary: "Elder care, chronic care support, first aid, household support",
      },
      certifications: [
        { title: "First Aid Certification", file: "first-aid", issuedAt: new Date("2024-11-28") },
      ],
    },
    {
      email: "peter@caretaker.app",
      password: "Worker123!",
      role: "WORKER",
      phone: "+254722000016",
      fullName: "Peter Mwangi",
      location: "Nakuru",
      bio: "Reliable help for cleaning, errands and everyday household chores around Nakuru — on time, thorough, no supervision needed.",
      avatar: "peter",
      details: {
        hourlyRate: 500,
        yearsExperience: 3,
        hasFirstAid: false,
        isCertifiedMassage: false,
        skillsSummary: "Cleaning, laundry, errands, general household help, cooking",
      },
      certifications: [],
    },
    {
      email: "faith@caretaker.app",
      password: "Worker123!",
      role: "WORKER",
      phone: "+254722000017",
      fullName: "Faith Chebet",
      location: "Elgon View, Eldoret",
      bio: "Nanny and after-school carer — homework help, balanced meals and first-aid trained for total peace of mind.",
      avatar: "faith",
      details: {
        hourlyRate: 600,
        yearsExperience: 4,
        hasFirstAid: true,
        isCertifiedMassage: false,
        skillsSummary: "Nanny services, infant care, homework help, first aid, meal prep",
      },
      certifications: [
        { title: "First Aid Certification", file: "first-aid", issuedAt: new Date("2025-01-10") },
      ],
    },
    {
      email: "mercy@caretaker.app",
      password: "Worker123!",
      role: "WORKER",
      phone: "+254722000018",
      fullName: "Mercy Atieno",
      location: "Milimani, Kisumu",
      bio: "Wellness therapist offering relaxation and aromatherapy massage in Kisumu — certified, professional and fully mobile.",
      avatar: "mercy",
      details: {
        hourlyRate: 650,
        yearsExperience: 5,
        hasFirstAid: false,
        isCertifiedMassage: true,
        skillsSummary: "Massage therapy, relaxation massage, aromatherapy, wellness",
      },
      certifications: [
        { title: "Professional Massage Diploma", file: "massage-diploma", issuedAt: new Date("2024-04-05") },
      ],
    },
  ];

  for (const w of workers) {
    const { profile } = await upsertBaseUser(w);
    const details = await upsertWorkerDetails(profile.id, w.details);
    await seedCertifications(details.id, w.certifications);
  }

  // --- Marketplace services + portfolio -------------------------------
  await prisma.service.deleteMany();
  await prisma.portfolioItem.deleteMany();

  const serviceSeed: Record<
    string,
    {
      services: {
        title: string;
        slug: string;
        category: string;
        priceKes: number;
        durationLabel: string;
        description: string;
      }[];
      portfolio: {
        title: string;
        category: string;
        clientName: string;
        location: string;
        description: string;
        monthsAgo: number;
      }[];
    }
  > = {
    "amina@caretaker.app": {
      services: [
        {
          title: "Full-day nanny cover (8 hours)",
          slug: "full-day-nanny-cover-8-hours",
          category: "Childcare",
          priceKes: 3600,
          durationLabel: "8 hours · same week",
          description:
            "Professional nanny cover for a full working day: meals, naps, school run and homework help. First-aid certified and used to twins. Bring your own transport for school runs within Nairobi."
        },
        {
          title: "After-school babysitting (3 hours)",
          slug: "after-school-babysitting-3-hours",
          category: "Childcare",
          priceKes: 1500,
          durationLabel: "3 hours · same day",
          description:
            "Late-afternoon childcare while you wrap up at work: pick-up, snacks, homework and play time. Includes a short end-of-day report for parents."
        },
      ],
      portfolio: [
        {
          title: "Twins care, Kilimani —18 months",
          category: "Childcare",
          clientName: "The Njoroge family",
          location: "Kilimani, Nairobi",
          description:
            "Long-term nanny role caring for18-month-old twins: routine building, developmental play and after-nursery care.",
          monthsAgo: 8,
        },
        {
          title: "Newborn night shifts",
          category: "Newborn care",
          clientName: "Private household",
          location: "Lavington, Nairobi",
          description:
            "Six weeks of night doula support — feeding assistance, sleep routine and postpartum reassurance for first-time parents.",
          monthsAgo: 14,
        },
      ],
    },
    "james@caretaker.app": {
      services: [
        {
          title: "Elder care day visit (6 hours)",
          slug: "elder-care-day-visit-6-hours",
          category: "Elder care",
          priceKes: 3000,
          durationLabel: "6 hours · book1 day ahead",
          description:
            "Companion and mobility support for seniors at home: medication reminders, light exercises, meals and company. Trained in dementia-aware care."
        },
        {
          title: "Home nurse aide consultation",
          slug: "home-nurse-aide-consultation",
          category: "Elder care",
          priceKes: 1200,
          durationLabel: "1 hour · video or home visit",
          description:
            "Sit-down assessment of care needs for an elderly relative: daily living review, safety checklist and a written care plan you can act on."
        },
      ],
      portfolio: [
        {
          title: "Post-stroke recovery support",
          category: "Elder care",
          clientName: "The Kamau family",
          location: "Westlands, Nairobi",
          description:
            "Three months of daily visits supporting a74-year-old through stroke rehabilitation — physio prompts, medication tracking and meals.",
          monthsAgo: 5,
        },
      ],
    },
    "sarah@caretaker.app": {
      services: [
        {
          title: "Deep house cleaning (4 hours)",
          slug: "deep-house-cleaning-4-hours",
          category: "Housekeeping",
          priceKes: 2500,
          durationLabel: "4 hours · same day",
          description:
            "Top-to-bottom clean: kitchen degrease, bathrooms, floors, windows and laundry folding. Cleaning supplies included on request at no extra cost."
        },
        {
          title: "Weekly home management",
          slug: "weekly-home-management",
          category: "Housekeeping",
          priceKes: 8000,
          durationLabel: "Weekly · recurring",
          description:
            "Full house management once a week — cleaning, laundry, groceries list, meal prep planning and minor vendor coordination (gas, water, deliveries)."
        },
      ],
      portfolio: [
        {
          title: "Estate-wide deep clean",
          category: "Housekeeping",
          clientName: "4-bedroom estate",
          location: "Karen, Nairobi",
          description:
            "Two-day deep clean for a family relocating abroad — including pantry reset, appliance detailing and linen inventory.",
          monthsAgo: 3,
        },
      ],
    },
    "mercy@caretaker.app": {
      services: [
        {
          title: "Relaxation massage at home (1 hour)",
          slug: "relaxation-massage-at-home-1-hour",
          category: "Wellness & massage",
          priceKes: 2500,
          durationLabel: "1 hour · same day",
          description:
            "Certified therapist brings the table and oils to your home: full-body relaxation massage with aromatherapy options. Ideal for desk-strain and stress."
        },
      ],
      portfolio: [
        {
          title: "Corporate wellness day",
          category: "Wellness & massage",
          clientName: "Tech firm, Westlands",
          location: "Westlands, Nairobi",
          description:
            "Ran a6-chair chair-massage station for120 staff during their wellness week — posture-focused10-minute sessions.",
          monthsAgo: 6,
        },
      ],
    },
  };

  for (const [email, content] of Object.entries(serviceSeed)) {
    const workerId = (
      await prisma.user.findUnique({ where: { email }, select: { id: true } })
    )?.id;
    if (!workerId) continue;
    for (const [index, s] of content.services.entries()) {
      await prisma.service.create({
        data: { workerId, active: true, ...s, createdAt: daysAgo(20 - index * 3, 10) },
      });
    }
    for (const [index, p] of content.portfolio.entries()) {
      await prisma.portfolioItem.create({
        data: {
          workerId,
          title: p.title,
          category: p.category,
          clientName: p.clientName,
          location: p.location,
          description: p.description,
          completedAt: new Date(Date.now() - p.monthsAgo * 30 * 86_400_000),
          sortOrder: index,
          createdAt: daysAgo(p.monthsAgo * 30, 12),
        },
      });
    }
  }

  // --- Bookings ---------------------------------------------------------
  const idOf = async (email: string) =>
    (await prisma.user.findUnique({ where: { email }, select: { id: true } }))?.id;

  const amina = await idOf("amina@caretaker.app");
  const james = await idOf("james@caretaker.app");
  const david = await idOf("david@caretaker.app");
  const sarah = await idOf("sarah@caretaker.app");

  if (amina && james && david && sarah) {
    await prisma.booking.createMany({
      data: [
        {
          clientId: jane.user.id,
          workerId: amina,
          status: "PENDING",
          serviceDate: daysFromNow(3, 9),
          notes: "Nanny needed for our twins,9 AM –1 PM, twice a week.",
        },
        {
          clientId: jane.user.id,
          workerId: james,
          status: "ACCEPTED",
          serviceDate: daysFromNow(5, 10),
          notes: "Elder care for my grandfather in Kilimani — mobility and medication reminders.",
        },
        {
          clientId: brian.user.id,
          workerId: david,
          status: "PENDING",
          serviceDate: daysFromNow(2, 18),
          notes: "Deep tissue massage session at home after a long work week.",
        },
        {
          clientId: brian.user.id,
          workerId: sarah,
          status: "COMPLETED",
          serviceDate: daysAgo(10, 9),
          notes: "Deep cleaning and meal prep for the weekend — completed successfully.",
        },
      ],
    });
  }

  // --- Demo DMs (messaging pipeline) -----------------------------------
  const brianId = brian.user.id;
  const minsAgo = (m: number) => new Date(Date.now() - m * 60_000);
  if (amina && jane) {
    await prisma.message.createMany({
      data: [
        {
          senderId: jane.user.id,
          receiverId: amina,
          body: "Hi Amina! Are you available Tuesdays and Thursdays for the twins?",
          createdAt: minsAgo(180),
        },
        {
          senderId: amina,
          receiverId: jane.user.id,
          body: "Habari Jane! Yes, both days work —9 AM to1 PM as requested. I can start next week.",
          createdAt: minsAgo(165),
          readAt: minsAgo(160),
        },
        {
          senderId: jane.user.id,
          receiverId: amina,
          body: "Perfect. I've sent a booking request too — please accept it when you can 🙏",
          createdAt: minsAgo(150),
        },
        {
          senderId: jane.user.id,
          receiverId: amina,
          body: "One more question: are you first-aid certified? The kids have allergies.",
          createdAt: minsAgo(12),
        },
      ],
    });
  }
  if (david && brianId) {
    await prisma.message.createMany({
      data: [
        {
          senderId: brianId,
          receiverId: david,
          body: "Hi David — do you do deep tissue sessions at home in Westlands?",
          createdAt: minsAgo(90),
        },
        {
          senderId: david,
          receiverId: brianId,
          body: "Yes! Home visits across Nairobi. My rate is KES800/hr, first session includes a short assessment.",
          createdAt: minsAgo(80),
          readAt: minsAgo(75),
        },
      ],
    });
  }

  // --- Demo reviews (double-sided: client ↔ caretaker) ------------------
  const completed = await prisma.booking.findFirst({ where: { status: "COMPLETED" } });
  if (completed) {
    // Client → caretaker review
    await prisma.review.create({
      data: {
        bookingId: completed.id,
        authorId: completed.clientId,
        targetId: completed.workerId,
        rating: 5,
        comment:
          "Sarah did an excellent deep clean and meal prep — punctual, careful with the kids' things, and the house was spotless. Highly recommended!",
      },
    });
    // Caretaker → client review (double-sided)
    await prisma.review.create({
      data: {
        bookingId: completed.id,
        authorId: completed.workerId,
        targetId: completed.clientId,
        rating: 5,
        comment:
          "Brian is organised, gave a clear brief and payment was settled promptly. A pleasure to work with.",
      },
    }).catch(() => undefined);
  }

  // --- Blog posts (SEO content) ----------------------------------------
  for (const post of POSTS) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        category: post.category,
        tags: post.tags,
        status: PostStatus.PUBLISHED,
        publishedAt: daysAgo(post.daysAgo, 8),
      },
      create: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        category: post.category,
        tags: post.tags,
        status: PostStatus.PUBLISHED,
        authorName: "Caregiver Team",
        publishedAt: daysAgo(post.daysAgo, 8),
      },
    });
  }

  const [users, profiles, details, certs, bookings, posts, dms, services, portfolio] =
    await Promise.all([
      prisma.user.count(),
      prisma.profile.count(),
      prisma.caretakerDetails.count(),
      prisma.certification.count(),
      prisma.booking.count(),
      prisma.blogPost.count(),
      prisma.message.count(),
      prisma.service.count(),
      prisma.portfolioItem.count(),
    ]);
  console.log(
    `Seed complete — users: ${users}, profiles: ${profiles}, caretaker details: ${details}, certifications: ${certs}, bookings: ${bookings}, posts: ${posts}, dms: ${dms}, services: ${services}, portfolio: ${portfolio}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
