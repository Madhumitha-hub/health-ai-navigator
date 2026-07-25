## Changes to `src/routes/settings.tsx`

**1. Remove the About tab**
- Remove the `<TabsTrigger value="about">` and its `<TabsContent value="about">` block.
- Update `TabsList` grid to `grid-cols-3` (md) since only Profile, System, Appearance remain.
- Remove the now-unused `Info` icon import and the `Stat` helper if unused.

**2. Sidebar collapsed by default (icon-only mode)**
- Change the default in `defaults()` from `sidebarCollapsed: false` to `sidebarCollapsed: true`.
- In `src/components/layout/app-shell.tsx`, wire the pref into `<SidebarProvider defaultOpen={!prefs.sidebarCollapsed}>` by reading `hp-app-prefs` from localStorage (already the shared key). This ensures the app actually starts in icon mode. Fallback default when no pref is stored: collapsed.

**3. Density = Comfortable for all users (Appearance tab)**
- Interpretation: make Comfortable the enforced default on Appearance; hide/remove the density Select so all users get comfortable spacing. (`document.documentElement.dataset.density = "comfortable"` still applied.)
- Alternative if you prefer to keep the choice visible: leave the Select but default to `"comfortable"` for everyone. I'll go with **remove the Select** since the ask says "Comfortable for all users." Confirm if you'd rather keep it visible.

**4. System tab visible to admins only**
- Conditionally render the `<TabsTrigger value="system">` only when `isAdmin`.
- Conditionally render `<TabsContent value="system">` only when `isAdmin`.
- Adjust `TabsList` grid: `grid-cols-2` when not admin (Profile, Appearance), `grid-cols-3` when admin (Profile, System, Appearance).
- If a non-admin somehow lands on `tab === "system"`, fall back to `"profile"` in a `useEffect`.

## Files touched
- `src/routes/settings.tsx` — tab list/content changes, density removal, default pref update.
- `src/components/layout/app-shell.tsx` — read `sidebarCollapsed` pref and pass `defaultOpen` to `SidebarProvider` (default collapsed).
