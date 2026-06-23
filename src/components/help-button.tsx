import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const HELP: Record<string, { title: string; body: string[] }> = {
  "/dashboard": {
    title: "Dashboard",
    body: [
      "Overview of all prediction activity in real time.",
      "Cards show today's totals, risk distribution and recent predictions.",
      "The System Status widget shows live Supabase and ML API health.",
    ],
  },
  "/predict": {
    title: "Disease Prediction",
    body: [
      "1. Choose a disease model.",
      "2. Select or add a patient.",
      "3. Enter clinical parameters — hover the icons for guidance.",
      "4. Review the result and save it to the patient record.",
    ],
  },
  "/analytics": {
    title: "EDA & Analytics",
    body: [
      "Visual insights computed from all stored predictions.",
      "Filter by disease and date range, then export raw data to CSV.",
    ],
  },
  "/datasets": {
    title: "Dataset Manager",
    body: ["Upload CSV datasets and inspect rows/features.", "Reference popular healthcare datasets."],
  },
  "/models": {
    title: "Model Performance",
    body: ["Compare model metrics — accuracy, F1, AUC-ROC.", "Click a row for confusion matrix and ROC."],
  },
  "/patients": {
    title: "Patient Records",
    body: ["Search and filter patients.", "Click a patient to view full medical history and prediction trends."],
  },
  "/reports": {
    title: "Reports",
    body: [
      "Pick a report type to generate a downloadable PDF.",
      "All generated reports are stored and listed at the bottom of this page.",
    ],
  },
  "/settings": {
    title: "Settings",
    body: ["Update your profile, change password, configure the ML API and theme."],
  },
};

export function HelpButton() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState(false);
  const key = Object.keys(HELP).find((k) => pathname.startsWith(k)) ?? "/dashboard";
  const guide = HELP[key];

  return (
    <>
      <Button
        aria-label="Help"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full bg-gradient-primary p-0 shadow-glow"
      >
        {open ? <X className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label="Help guide"
          className="fixed bottom-20 right-5 z-40 w-[320px] max-w-[calc(100vw-2.5rem)] animate-in fade-in-0 slide-in-from-bottom-2 rounded-xl border bg-card p-4 shadow-xl"
        >
          <p className="font-display text-sm font-bold">{guide.title} — quick guide</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {guide.body.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </div>
      )}
    </>
  );
}
