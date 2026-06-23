import { Stethoscope, ClipboardList, CalendarClock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getClinicalSupport, getAppointmentRecommendation, CLINICAL_DISCLAIMER } from "@/lib/clinical-support";
import type { DiseaseKey, PredictionResult } from "@/lib/predict-api";

type Props = { disease: DiseaseKey; risk: PredictionResult["risk"] };

export function ClinicalDecisionSupport({ disease, risk }: Props) {
  const support = getClinicalSupport(disease, risk);
  const appt = getAppointmentRecommendation(disease, risk);
  const urgencyTone =
    support.urgency === "Within 7 days" || support.urgency === "Immediate"
      ? "destructive"
      : support.urgency === "Within 30 days"
        ? "default"
        : "secondary";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Stethoscope className="h-4 w-4 text-primary" /> Clinical Decision Support
          </CardTitle>
          <Badge variant={urgencyTone as never}>{support.urgency}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" /> Recommended Specialist
            </p>
            <p className="mt-1 font-semibold">{appt.specialist}</p>
            <p className="text-xs text-muted-foreground">{appt.reason}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ClipboardList className="h-3.5 w-3.5" /> Follow-up
            </p>
            <p className="mt-1">{support.follow_up}</p>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Suggested Tests
          </p>
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {support.suggested_tests.map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>{CLINICAL_DISCLAIMER}</span>
        </div>
      </CardContent>
    </Card>
  );
}
