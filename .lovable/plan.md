## Plan: Fix published Supabase env error without code changes

1. **Confirm current diagnosis**
   - Treat the preview as the known-good environment.
   - Verify the error is only on the published URL and points to missing production/build-time Supabase env values, not a Vite config or application-code issue.

2. **Verify production Supabase connection**
   - Check the project’s runtime secrets for `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.
   - Confirm the connected Supabase project is the expected one for this app.

3. **Verify build-time environment availability**
   - Confirm the client-facing variables required by the browser bundle are present for the build:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Confirm the server/runtime equivalents are present for published server routes:
     - `SUPABASE_URL`
     - `SUPABASE_PUBLISHABLE_KEY`

4. **Check for stale published deployment**
   - Compare the published behavior against the healthy preview behavior.
   - If the published site still throws while preview works, treat it as a stale published bundle or production env mismatch.

5. **Trigger full rebuild and redeploy**
   - Run a fresh Lovable publish using the current environment configuration.
   - Do **not** modify `vite.config.ts` or application code.
   - After publish is scheduled, wait about a minute, then hard-refresh the published URL.

6. **Post-publish validation**
   - Reopen the published URL in a fresh tab/incognito or hard refresh.
   - Confirm the Supabase missing-env error no longer appears.
   - If it still appears, the next action is to reconnect/refresh Supabase integration for production and publish again, because the publish environment still is not receiving the build-time `VITE_SUPABASE_*` values.

## Technical notes

- The app’s Supabase browser client reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at build time, so production only updates after a new successful publish.
- `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` runtime secrets alone are not enough for browser code if the built JS bundle was created without the `VITE_*` values.
- `vite.config.ts` should remain unchanged because this TanStack Start project uses Lovable’s TanStack Vite config wrapper.