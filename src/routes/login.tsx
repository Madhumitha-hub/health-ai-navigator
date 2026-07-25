import { userMessage } from "@/lib/user-errors";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Brain, HeartPulse, Loader2, ShieldCheck, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Spotlight } from "@/components/ui/spotlight";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) return toast.error(userMessage(error));
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <Card className="relative w-full max-w-6xl overflow-hidden border-white/10 bg-black/[0.96] shadow-2xl">
        <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" fill="white" />

        <div className="flex min-h-[600px] flex-col md:flex-row">
          {/* Left: Sign-in form */}
          <div className="relative z-10 flex flex-1 flex-col justify-center p-8 md:p-12">
            <div className="mx-auto w-full max-w-sm">
              <div className="mb-8">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-500 shadow-lg shadow-sky-500/30">
                  <HeartPulse className="h-7 w-7 text-white" />
                </div>
                <h1 className="bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text font-display text-3xl font-bold text-transparent">
                  HealthPredict
                </h1>
                <p className="mt-1 text-sm text-neutral-400">
                  AI-Powered Clinical Decision Support
                </p>
              </div>

              <h2 className="text-xl font-semibold text-neutral-100">Sign in</h2>
              <p className="mt-1 text-sm text-neutral-400">Access your clinical workspace</p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-neutral-200">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@hospital.org"
                    className="border-white/10 bg-white/5 text-neutral-100 placeholder:text-neutral-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-neutral-200">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-white/10 bg-white/5 text-neutral-100"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-neutral-300">
                    <Checkbox
                      checked={remember}
                      onCheckedChange={(v) => setRemember(v === true)}
                      className="border-white/20"
                    />
                    Remember me
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-sky-400 hover:text-sky-300 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign in
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-neutral-400">
                New here?{" "}
                <Link to="/register" className="font-medium text-sky-400 hover:text-sky-300 hover:underline">
                  Create an account
                </Link>
              </p>
            </div>
          </div>

          {/* Right: Static hero panel */}
          <div className="relative hidden flex-1 overflow-hidden md:block">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/20 via-emerald-500/10 to-transparent" />
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="relative z-10 flex h-full flex-col justify-center p-12">
              <h2 className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text font-display text-4xl font-bold leading-tight text-transparent">
                Clinical intelligence,<br />at a glance.
              </h2>
              <p className="mt-4 max-w-md text-sm text-neutral-400">
                Predict, explain, and act on disease risk with an integrated ML workspace built for clinicians and researchers.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  { icon: Brain, label: "Multi-disease risk prediction across 5 models" },
                  { icon: Activity, label: "Real-time analytics & feature importance" },
                  { icon: Stethoscope, label: "Clinical decision support with test suggestions" },
                  { icon: ShieldCheck, label: "Role-based access & full audit trail" },
                ].map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-3 text-sm text-neutral-200">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                      <Icon className="h-4 w-4 text-sky-400" />
                    </span>
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
