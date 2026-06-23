/**
 * Smart 5-band risk categorization, shared across all prediction surfaces.
 *
 * Buckets are based on the probability percentage:
 *   0–20  Very Low   (green)
 *  21–40  Low        (light green)
 *  41–60  Moderate   (yellow)
 *  61–80  High       (orange)
 *  81–100 Critical   (red)
 */
export type RiskCategory = "Very Low" | "Low" | "Moderate" | "High" | "Critical";

export type RiskBand = {
  category: RiskCategory;
  /** Tailwind text color class. */
  textClass: string;
  /** Tailwind background color class (subtle). */
  bgClass: string;
  /** Tailwind border color class. */
  borderClass: string;
  /** Combined badge class. */
  badgeClass: string;
  /** Hex/CSS-var color for charts. */
  chartColor: string;
};

const BANDS: RiskBand[] = [
  {
    category: "Very Low",
    textClass: "text-emerald-700 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/40",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
    chartColor: "hsl(152 76% 36%)",
  },
  {
    category: "Low",
    textClass: "text-green-700 dark:text-green-400",
    bgClass: "bg-green-500/10",
    borderClass: "border-green-500/40",
    badgeClass: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/40",
    chartColor: "hsl(142 71% 45%)",
  },
  {
    category: "Moderate",
    textClass: "text-amber-700 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/40",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/40",
    chartColor: "hsl(38 92% 50%)",
  },
  {
    category: "High",
    textClass: "text-orange-700 dark:text-orange-400",
    bgClass: "bg-orange-500/10",
    borderClass: "border-orange-500/40",
    badgeClass: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/40",
    chartColor: "hsl(24 95% 53%)",
  },
  {
    category: "Critical",
    textClass: "text-red-700 dark:text-red-400",
    bgClass: "bg-red-500/10",
    borderClass: "border-red-500/40",
    badgeClass: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/40",
    chartColor: "hsl(0 84% 60%)",
  },
];

/** Categorize a probability in 0..1 into one of five bands. */
export function categorizeRisk(probability: number): RiskBand {
  const pct = Math.round(Math.max(0, Math.min(1, probability)) * 100);
  if (pct <= 20) return BANDS[0];
  if (pct <= 40) return BANDS[1];
  if (pct <= 60) return BANDS[2];
  if (pct <= 80) return BANDS[3];
  return BANDS[4];
}

/** True when a prediction should auto-create an early-warning alert. */
export function shouldRaiseAlert(probability: number): boolean {
  return probability >= 0.6;
}
