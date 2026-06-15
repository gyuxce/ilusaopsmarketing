# Audit Fixes

This revision is based on the latest `main` branch snapshot downloaded on
June 15, 2026.

## Important deployment step

For an existing Supabase project, run `supabase_security_migration.sql` in the
Supabase SQL editor. It updates RLS policies and the auth profile trigger
without deleting existing table data.

Do not run `supabase_schema.sql` against a production database unless a full
schema reset and data deletion are intended.

## Verification

```bash
npm install
npm run lint
npx tsc --noEmit
npm run build
npm audit --omit=dev
```

All commands above pass in this revision.

## Main corrections

- Clock-in dates now use the user's local calendar date instead of UTC.
- Clock-in records are restricted to the signed-in user.
- Attendance widgets refresh immediately after clock-in.
- Sandbox users have distinct IDs and attendance records.
- RLS no longer grants anonymous read/write access.
- Project edits and soft deletes persist in offline mode.
- Work item completion consistently uses the `Done` status.
- Supabase failures no longer silently switch to local browser data.
- Next.js, ESLint tooling, and PostCSS dependencies are aligned and patched.
- Production builds run lint-compatible TypeScript validation instead of
  suppressing errors.
- The dashboard now prioritizes three KPIs and two action panels, with secondary
  workspaces grouped under a compact More menu.
- Internal database status and simulation controls are no longer exposed in the
  user-facing navigation.
