/** Kenyan-shilling formatting helpers used across the UI. */

const formatter = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 });

/** 500 -> "KES 500", 1200 -> "KES 1,200" */
export function formatKES(amount: number): string {
  return `KES ${formatter.format(Math.round(amount))}`;
}

/** 500 -> "KES 500/hr" (directory cards, quick facts). */
export function formatKESRate(amount: number): string {
  return `${formatKES(amount)}/hr`;
}
