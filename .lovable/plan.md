# Pre-Submission Audit

I ran a full check across code, types, routes, and security. Here's the honest state.

## Green (ready)

- **TypeScript build**: passes clean (0 errors).
- **Dev server**: no runtime errors, no warnings in the log.
- **Route coverage**: all 15 page routes + 12 `/api/ml/*` server routes present (dashboard, predict, predict-full, analytics, eda, datasets, models, patients, patient detail, reports, settings, diagnostics, login, register, forgot/reset password).
- **Auth**: Supabase Auth + JWT bearer + RLS + `user_roles` via `has_role()` all wired correctly.
- **ML backend**: Render service is live (verified `/health` returns 200). Timeouts already raised to survive cold starts. Rule-based fallback wired for prediction failures.
- **Login page**: new 3D Spline background + left-side form is in.
- **Dependency scan**: 0 vulnerabilities.
- **Critical security findings**: 0.

## Yellow (works, but worth fixing before submission)

Three RLS breadth warnings from the Supabase scanner — nothing is leaked to the public internet, but any signed-in *patient* can currently read internal ML metadata:

| Table | Current | Should be |
|---|---|---|
| `datasets` | any authenticated user can SELECT | admin/doctor only |
| `models` | any authenticated user can SELECT | admin/doctor only |
| `model_metrics` | any authenticated user can SELECT | admin/doctor only |

Fix = one migration tightening the SELECT policies to `has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'doctor')`. ~5 min.

## What I'll do if you approve

1. **Migration** to tighten RLS on `datasets`, `models`, `model_metrics` (SELECT restricted to admin/doctor). This clears all 3 scanner warnings.
2. **Smoke-verify** in Playwright: land on `/`, sign in, hit `/dashboard`, `/predict`, `/analytics`, `/patients`, `/reports`, `/settings`, screenshot each, confirm no console errors.
3. **Report back** with pass/fail per page + a green light (or a punch list) for submission.

## What I will NOT touch

- Your UI, business logic, ML behavior, login design, or the Render backend.
- Larger scaling items from the earlier hardening plan (health-cache, request coalescer, per-user quotas, security headers) — not needed for submission, do them post-submit if you want.

## After the audit passes

Say the word and I'll run `publish` to push the current build to `ai-healthcare23.lovable.app`.

Approve to proceed with the RLS migration + end-to-end smoke test?
