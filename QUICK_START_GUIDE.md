# Quick Start Guide: Staging Deployment

This guide provides immediate next steps after this PR is merged.

## Immediate Actions (Day 1)

### 1. Create Staging Branch
```bash
# From your local machine
git checkout main
git pull origin main
git checkout -b staging
git push -u origin staging
```

### 2. Configure Branch Protection

**Navigate to:** Repository → Settings → Branches → Add rule

#### For `main` branch:
- Branch name pattern: `main`
- ✅ Require a pull request before merging
  - Required approvals: 1
  - ✅ Dismiss stale reviews
- ✅ Require status checks to pass (once CI exists)
- ✅ Require branches to be up to date
- ✅ Restrict pushes that create matching branches
- ✅ Do not allow bypassing the above settings

#### For `staging` branch:
- Branch name pattern: `staging`
- ✅ Require a pull request before merging
  - Required approvals: 0 (optional review)
- ⚠️ Allow administrators to bypass

### 3. Verify Staging Deployment

After creating the `staging` branch, the workflow should automatically deploy:

1. Check **Actions** tab for "Deploy Staging" workflow
2. Wait for deployment to complete (~2-3 minutes)
3. Visit: **https://sdanley.github.io/fivestar-rating-kiosk/staging/**
4. Verify:
   - [ ] Orange "STAGING" badge appears in top-left
   - [ ] App loads without errors
   - [ ] Can complete rating flow (setup → rate → submit)
   - [ ] Admin panel works

## Testing the New Workflow (Week 1)

### Test Feature Branch → Staging
```bash
# Create test feature branch
git checkout staging
git pull origin staging
git checkout -b feature/test-staging-flow

# Make a small change (e.g., update version comment in app.js)
echo "// Staging workflow test" >> app.js

# Commit and push
git add app.js
git commit -m "Test staging workflow"
git push -u origin feature/test-staging-flow

# Open PR to staging (via GitHub UI)
# Merge PR
# Verify staging auto-deploys with your change
```

### Test Staging → Production Promotion
```bash
# After validating on staging
# Open PR: staging → main (via GitHub UI)
# Add description: "Test promotion flow"
# Get review approval
# Merge PR
# Verify production deployment

# Visit both URLs and confirm:
# - Production (no badge): https://sdanley.github.io/fivestar-rating-kiosk/
# - Staging (badge visible): https://sdanley.github.io/fivestar-rating-kiosk/staging/
```

## Daily Workflow (Normal Development)

### For Developers

```bash
# 1. Start new feature
git checkout staging
git pull origin staging
git checkout -b feature/my-new-feature

# 2. Develop and test locally
python -m http.server 8000
# Test at http://localhost:8000

# 3. Commit and push
git add .
git commit -m "Add new feature"
git push -u origin feature/my-new-feature

# 4. Open PR to staging (GitHub UI)
# - Add screenshots for UI changes
# - Check all boxes in PR template
# - Request review (optional)

# 5. After merge, validate on staging
# Visit: https://sdanley.github.io/fivestar-rating-kiosk/staging/
```

### For Release Manager

```bash
# Weekly or bi-weekly release cycle

# 1. Verify staging is stable
# - All features tested
# - No known P0/P1 bugs
# - Stakeholder approval

# 2. Open PR: staging → main
# Title: "Release v1.0.X: [Summary]"
# Use checklist from docs/STAGING_DEPLOYMENT_PLAN.md Appendix E

# 3. Get approval and merge

# 4. Post-release validation
# - Check production URL
# - Verify version in admin panel
# - Monitor for 24 hours
```

## Troubleshooting

### Staging Doesn't Show Badge
**Cause:** Path detection not matching
**Fix:** Check URL includes `/staging/` exactly
```javascript
// In browser console:
console.log(window.location.pathname);
// Should output: "/fivestar-rating-kiosk/staging/" or similar
```

### Staging Deploy Failed
**Cause:** gh-pages branch doesn't exist or workflow lacks permissions
**Fix:**
```bash
# Create gh-pages branch if missing
git checkout --orphan gh-pages
git rm -rf .
echo "GitHub Pages placeholder" > index.html
git add index.html
git commit -m "Initialize gh-pages"
git push origin gh-pages

# Then re-run staging workflow
```

### Changes Not Appearing on Staging
**Cause:** Service worker cached old version
**Fix:**
1. Open admin panel on staging
2. Click "Check Update"
3. Tap update toast when it appears
4. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R)

## Version Bump Reminder

For every user-facing change:

### 1. Update version.json
```json
{
  "version": "1.0.21"
}
```

### 2. Update sw.js cache version
```javascript
const VERSION = 'v16'; // Increment from v15
```

### 3. Why Both?
- `version.json`: User-visible version for tracking
- `sw.js VERSION`: Cache invalidation trigger

**Remember:** Version bumps should be in the SAME PR as the feature/fix, not a separate follow-up PR (avoids PR #11 → PR #13 gap).

## Key URLs

- **Production:** https://sdanley.github.io/fivestar-rating-kiosk/
- **Staging:** https://sdanley.github.io/fivestar-rating-kiosk/staging/
- **Actions:** https://github.com/sdanley/fivestar-rating-kiosk/actions
- **Settings:** https://github.com/sdanley/fivestar-rating-kiosk/settings/branches

## Success Metrics

Track these over first 30 days:
- [ ] Zero production regressions requiring rollback
- [ ] 100% of changes deployed to staging first
- [ ] Average time from feature start to production: <2 weeks
- [ ] Team feedback: process is "easy" or "very easy"

## Questions?

- Review full documentation: `docs/STAGING_DEPLOYMENT_PLAN.md`
- Check regression audit: `docs/REGRESSION_AUDIT.md`
- See implementation details: `IMPLEMENTATION_SUMMARY.md`

---

**Quick Start Version:** 1.0
**Last Updated:** March 13, 2026
