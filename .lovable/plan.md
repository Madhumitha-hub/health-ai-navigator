## Problem

Both the preview tab and the Lovable editor freeze with "Page Unresponsive" on the login screen. Root cause: the Spline 3D scene added to `src/routes/login.tsx` loads `@splinetool/react-spline` + a WebGL scene from `prod.spline.design`, which spins a continuous render loop and pins CPU/GPU. Any unauthenticated visit (including `/` → auth gate → `/login`) mounts it, and the editor's preview iframe drags the whole tab down with it.

## Fix

Remove the Spline scene from the login page and replace the right-hand panel with a lightweight branded visual (CSS gradient + Spotlight + a few static SVG/lucide icons and product marketing text). No WebGL, no external scene fetch, no render loop.

### Edits
1. `src/routes/login.tsx` — drop `SplineScene` import and usage. Replace the right column with a static hero panel (gradient background, Spotlight, headline like "Clinical intelligence, at a glance", feature bullets with lucide icons). Keep the left sign-in form unchanged.
2. `src/components/ui/splite.tsx` — delete (unused after edit).
3. `package.json` — remove `@splinetool/react-spline` (and `@splinetool/runtime` if present) so the heavy dependency stops shipping.

### Verification
- Reload `/login` in preview — page becomes responsive immediately, no "Page Unresponsive" dialog.
- Confirm bundle no longer requests `prod.spline.design/*.splinecode`.
- Typecheck passes; login form still submits.

No backend, DB, or auth logic changes.