import type { Prisma } from "@prisma/client";

/**
 * Service categories shown as icon chips on the home screen (per the mobile
 * mock): Nannies, Home Managers, Elder Care, Wellness & Massage. Each maps to
 * keyword matches against the worker's skills summary.
 */
export type CategoryId = "nanny" | "house" | "elder" | "wellness";

export type Category = {
  id: CategoryId;
  label: string;
  shortLabel: string;
  icon: string;
  blurb: string;
  keywords: string[];
};

export const CATEGORIES: Category[] = [
  {
    id: "nanny",
    label: "Nannies",
    shortLabel: "Nanny",
    icon: "👶",
    blurb: "Infant care, toddlers & school runs",
    keywords: ["nanny", "infant", "childcare", "toddler", "school run", "homework", "children"],
  },
  {
    id: "house",
    label: "Home Managers",
    shortLabel: "Home manager",
    icon: "🏠",
    blurb: "Household management & deep cleaning",
    keywords: [
      "home management",
      "household",
      "cleaning",
      "laundry",
      "meal prep",
      "cooking",
      "deep cleaning",
      "shopping",
    ],
  },
  {
    id: "elder",
    label: "Elder Care",
    shortLabel: "Elder care",
    icon: "🧓",
    blurb: "Seniors, mobility & chronic care",
    keywords: ["elder", "senior", "geriatric", "mobility", "chronic", "medication", "dementia"],
  },
  {
    id: "wellness",
    label: "Wellness & Massage",
    shortLabel: "Wellness",
    icon: "💆",
    blurb: "Certified massage & therapy at home",
    keywords: ["massage", "wellness", "therap", "aromatherapy", "relaxation", "deep tissue", "spa"],
  },
];

export function findCategory(id: string | undefined): Category | undefined {
  if (!id) return undefined;
  return CATEGORIES.find((c) => c.id === id);
}

/** Prisma condition matching any category keyword in the skills summary. */
export function categoryCondition(category: Category): Prisma.ProfileWhereInput {
  return {
    OR: category.keywords.map((keyword) => ({
      caretakerDetails: {
        skillsSummary: { contains: keyword, mode: "insensitive" as const },
      },
    })),
  };
}
