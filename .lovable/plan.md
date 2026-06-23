## Problem

Clicking **EDA Reports** in the sidebar shows the root 404 page, even though:

- `src/routes/eda.tsx` exists with `createFileRoute("/eda")`
- `src/routeTree.gen.ts` registers `EdaRoute` at `/eda`
- The sidebar entry in `src/components/layout/app-shell.tsx` (line 54) points to `/eda`
- A direct SSR request (`curl /eda?disease=diabetes`) returns **200** with the real "Exploratory Data Analysis" content
- The screenshot still shows the AppShell sidebar around the 404, which means it is the **root `notFoundComponent`** rendering inside `<Outlet />` — so the client router is failing to match the route at navigation time

This is a client-side route-match failure, not a missing file. The most likely cause is the `/eda` route's `validateSearch` requiring `disease` while the sidebar `<Link to="/eda">` navigates without it, plus the SSR-side 307 we observed (`/eda` → `/eda?disease=diabetes`) not being followed cleanly on client navigation.

## Fix

1. **Reproduce in the browser via Playwright** against `localhost:8080`, signed in with the Lovable Supabase session, clicking the EDA Reports link. Capture the console + final URL to confirm the 404 path.
2. **Make the `/eda` route navigation-safe**:
   - Update the sidebar `Link` for EDA Reports to pass an explicit search default: `<Link to="/eda" search={{ disease: "diabetes" }}>`, OR
   - Loosen `validateSearch` in `src/routes/eda.tsx` so it never throws and always returns a default (`disease: (s.disease as Disease) ?? "diabetes"` — already the case, so the real fix is the Link side).
3. **Verify** the routeTree still lists `/eda` after dev rebuild and that `useSearch({ from: "/eda" })` returns the default. Re-run the Playwright click flow and confirm the EDA page renders (header "Exploratory Data Analysis", tabs for the four diseases).
4. If reproduction shows a different cause (e.g. `RequireRole` denying because `profile.role` isn't `admin`/`analyst` in the DB), surface that with a clearer "Access restricted" state instead of falling through to 404, and report the role mismatch back to the user.

## Files touched

- `src/components/layout/app-shell.tsx` — add `search={{ disease: "diabetes" }}` to the EDA Reports `<Link>` (and use the typed Link form).
- `src/routes/eda.tsx` — only if step 1 shows a notFound being thrown; otherwise no change.

No backend / data changes.
