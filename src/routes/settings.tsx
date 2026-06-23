import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Settings as Cog, Save, User, Cpu, Palette, Info, Moon, Sun, Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/components/theme-provider";
import { ML_API_URL } from "@/services/mlApi";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — HealthPredict" },
      { name: "description", content: "Configure your profile, system, appearance and learn about HealthPredict." },
    ],
  }),
  component: SettingsPage,
});

const APP_PREFS_KEY = "hp-app-prefs";

type AppPrefs = {
  apiUrl: string;
  defaultDisease: string;
  highRiskThreshold: number;
  emailHighRisk: boolean;
  sidebarCollapsed: boolean;
  density: "comfortable" | "compact";
};

function loadPrefs(): AppPrefs {
  if (typeof window === "undefined") return defaults();
  try {
    const raw = localStorage.getItem(APP_PREFS_KEY);
    return raw ? { ...defaults(), ...JSON.parse(raw) } : defaults();
  } catch {
    return defaults();
  }
}
function defaults(): AppPrefs {
  return {
    apiUrl: ML_API_URL,
    defaultDisease: "diabetes",
    highRiskThreshold: 70,
    emailHighRisk: true,
    sidebarCollapsed: false,
    density: "comfortable",
  };
}

function SettingsPage() {
  const { profile, user, refreshProfile } = useAuth();
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState("profile");
  const [prefs, setPrefs] = useState<AppPrefs>(loadPrefs);

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [institution, setInstitution] = useState(profile?.institution ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setInstitution(profile?.institution ?? "");
  }, [profile]);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(APP_PREFS_KEY, JSON.stringify(prefs));
    document.documentElement.dataset.density = prefs.density;
  }, [prefs]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, institution })
      .eq("id", user.id);
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    refreshProfile?.();
  };

  const changePassword = async () => {
    if (pw.length < 6) return toast.error("Password must be at least 6 characters");
    if (pw !== pw2) return toast.error("Passwords do not match");
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSavingPw(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setPw(""); setPw2("");
  };

  const isAdmin = profile?.role === "admin";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Settings"
        description="Profile, system, appearance and about."
        icon={Cog}
      />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="profile"><User className="mr-1.5 h-4 w-4" />Profile</TabsTrigger>
          <TabsTrigger value="system"><Cpu className="mr-1.5 h-4 w-4" />System</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="mr-1.5 h-4 w-4" />Appearance</TabsTrigger>
          <TabsTrigger value="about"><Info className="mr-1.5 h-4 w-4" />About</TabsTrigger>
        </TabsList>

        {/* ============== Profile ============== */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your name and institution.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Full name">
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </Field>
              <Field label="Institution">
                <Input value={institution} onChange={(e) => setInstitution(e.target.value)} />
              </Field>
              <Field label="Email"><Input value={user?.email ?? ""} disabled /></Field>
              <Field label="Role">
                <Input value={profile?.role ?? "—"} disabled className="capitalize" />
              </Field>
              <div className="md:col-span-2">
                <Button onClick={saveProfile} disabled={savingProfile} className="bg-gradient-primary shadow-glow">
                  {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>Choose a strong password of at least 6 characters.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="New password">
                <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
              </Field>
              <Field label="Confirm">
                <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
              </Field>
              <div className="md:col-span-2">
                <Button onClick={changePassword} disabled={savingPw}>
                  {savingPw ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============== System ============== */}
        <TabsContent value="system" className="mt-6 space-y-6">
          {!isAdmin && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              System settings are admin-only. You can view current values but cannot save changes.
            </div>
          )}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>ML Backend</CardTitle>
              <CardDescription>FastAPI endpoint used for predictions.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="API Endpoint URL">
                <Input
                  value={prefs.apiUrl}
                  onChange={(e) => setPrefs({ ...prefs, apiUrl: e.target.value })}
                  disabled={!isAdmin}
                />
              </Field>
              <Field label="Default disease">
                <Select
                  value={prefs.defaultDisease}
                  onValueChange={(v) => setPrefs({ ...prefs, defaultDisease: v })}
                  disabled={!isAdmin}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diabetes">Diabetes</SelectItem>
                    <SelectItem value="heart">Heart Disease</SelectItem>
                    <SelectItem value="kidney">Kidney Disease</SelectItem>
                    <SelectItem value="liver">Liver Disease</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Label>High Risk threshold</Label>
                  <span className="font-mono text-sm">{prefs.highRiskThreshold}%</span>
                </div>
                <Slider
                  value={[prefs.highRiskThreshold]}
                  min={50} max={95} step={1}
                  onValueChange={([v]) => setPrefs({ ...prefs, highRiskThreshold: v })}
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground">
                  Predictions with confidence ≥ this threshold trigger a high-risk alert.
                </p>
              </div>

              <ToggleRow
                label="Email notifications"
                desc="Email the doctor when a high-risk prediction is created."
                checked={prefs.emailHighRisk}
                onChange={(v) => setPrefs({ ...prefs, emailHighRisk: v })}
                disabled={!isAdmin}
              />

              <div className="md:col-span-2">
                <Button
                  onClick={() => toast.success("System settings saved")}
                  disabled={!isAdmin}
                  className="bg-gradient-primary shadow-glow"
                >
                  <Save className="mr-2 h-4 w-4" />Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============== Appearance ============== */}
        <TabsContent value="appearance" className="mt-6 space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Theme, sidebar and density.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <ToggleRow
                label="Dark mode"
                desc="Switch the entire interface to dark theme."
                checked={theme === "dark"}
                onChange={toggle}
                icon={theme === "dark" ? Moon : Sun}
              />
              <ToggleRow
                label="Sidebar collapsed by default"
                desc="Start with the sidebar in icon-only mode."
                checked={prefs.sidebarCollapsed}
                onChange={(v) => setPrefs({ ...prefs, sidebarCollapsed: v })}
              />
              <div className="md:col-span-2 space-y-1.5">
                <Label>Density</Label>
                <Select
                  value={prefs.density}
                  onValueChange={(v: "comfortable" | "compact") => setPrefs({ ...prefs, density: v })}
                >
                  <SelectTrigger className="md:w-64"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Adjusts padding and spacing globally.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============== About ============== */}
        <TabsContent value="about" className="mt-6 space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>HealthPredict</CardTitle>
              <CardDescription>AI-Based Smart Healthcare Disease Prediction System</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <Stat label="Version" value="v1.0.0" />
                <Stat label="Institution" value={profile?.institution || "[Your Institution]"} />
                <Stat label="License" value="MIT" />
              </div>
              <Separator />
              <div>
                <p className="mb-2 text-sm font-semibold">Tech stack</p>
                <div className="flex flex-wrap gap-1.5">
                  {["React 19", "TanStack Start", "Tailwind v4", "shadcn/ui", "Recharts", "Supabase", "jsPDF", "FastAPI"].map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">AI Models integrated</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Diabetes — XGBoost / Random Forest (PIMA features)</li>
                  <li>Heart Disease — Logistic Regression / SVM (UCI Cleveland)</li>
                  <li>Kidney Disease — Random Forest (UCI CKD)</li>
                  <li>Liver Disease — Gradient Boosting (Indian Liver Patient Dataset)</li>
                </ul>
              </div>
              <Separator />
              <div>
                <p className="mb-2 text-sm font-semibold">Credits</p>
                <p className="text-sm text-muted-foreground">
                  Built with ❤ using open-source healthcare datasets from the UCI Machine
                  Learning Repository and Kaggle community.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({
  label, desc, checked, onChange, disabled, icon: Icon,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="md:col-span-2 flex items-center justify-between gap-4 rounded-lg border bg-card/50 p-3">
      <div className="flex items-start gap-3">
        {Icon && <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />}
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-base font-semibold">{value}</p>
    </div>
  );
}
