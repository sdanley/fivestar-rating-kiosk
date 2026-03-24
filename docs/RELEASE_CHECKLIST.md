# Release Checklist

Use this checklist when promoting `staging` to `main` for a production release.

## Pre-Release

- [ ] Staging validation complete (setup -> rate -> submit -> auto-return)
- [ ] No open P0/P1 issues in staging
- [ ] Stakeholder/reviewer sign-off received
- [ ] Version bump included in the same PR:
  - [ ] `version.json`
  - [ ] `sw.js` `VERSION` constant
- [ ] UI changes include screenshots in the PR

## Release

- [ ] Open PR: `staging` -> `main`
- [ ] PR includes release summary and risk notes
- [ ] At least one approval recorded
- [ ] Required checks are green
- [ ] Merge PR

## Post-Release

- [ ] Production deployment succeeded in GitHub Actions
- [ ] Smoke test production: `https://sdanley.github.io/fivestar-rating-kiosk/`
- [ ] Confirm admin panel revision/version
- [ ] Check update flow and service worker refresh
- [ ] Monitor for regressions and rollback need

## Rollback (if needed)

1. Revert the production merge commit.
2. Push revert to `main`.
3. Open a hotfix branch from the last known good commit.
4. Re-test via `staging`, then promote again.
