import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export const MEDICAL_DISCLAIMER_TEXT =
  "This system provides AI-based risk estimates for educational and research purposes only. It is not a medical diagnosis and should not replace professional consultation.";

type Props = {
  variant?: "banner" | "inline" | "compact";
  className?: string;
};

export function MedicalDisclaimer({ variant = "banner", className }: Props) {
  if (variant === "compact") {
    return (
      <p className={cn("text-[11px] italic text-muted-foreground", className)}>
        {MEDICAL_DISCLAIMER_TEXT}
      </p>
    );
  }
  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-muted-foreground",
          className,
        )}
      >
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
        <span>{MEDICAL_DISCLAIMER_TEXT}</span>
      </div>
    );
  }
  return (
    <div
      role="note"
      aria-label="Medical disclaimer"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200",
        className,
      )}
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <p className="leading-relaxed">
        <strong className="font-semibold">Medical Disclaimer · </strong>
        {MEDICAL_DISCLAIMER_TEXT}
      </p>
    </div>
  );
}
