# Staging + Production Deployment Plan
**Repository:** sdanley/fivestar-rating-kiosk
**Plan Version:** 1.0
**Created:** March 13, 2026
**Status:** Proposed (pending approval)

## Executive Summary

This document proposes a lightweight staging deployment strategy for the Five Star Rating Kiosk PWA, designed to prevent regressions and enable safer parallel development. The plan leverages GitHub Pages multi-branch deployment with clear URL designation, requiring minimal infrastructure changes and zero paid services.

**Key Components:**
- 🌐 **Production:** https://sdanley.github.io/fivestar-rating-kiosk/ (from `main` branch)
- 🧪 **Staging:** https://sdanley.github.io/fivestar-rating-kiosk/staging/ (from `staging` branch)
- 🔍 **PR Previews:** https://sdanley.github.io/fivestar-rating-kiosk/pr-{number}/ (optional, from PR branches)

---

## 1. Recommended Branching Model

### Branch Structure

```
main (production)
  ↑
  └─ staging (integration/pre-production)
      ↑
      ├─ feature/multi-product-v2
      ├─ feature/analytics-dashboard
      └─ bugfix/cache-invalidation
```

### Branch Policies

| Branch | Purpose | Deployment Target | Protection Rules |
|--------|---------|-------------------|------------------|
| **main** | Production release | GitHub Pages root (https://.../fivestar-rating-kiosk/) | ✅ Require PR from `staging` only<br>✅ Require 1+ review<br>✅ Require status checks<br>❌ No direct commits |
| **staging** | Integration & QA | GitHub Pages /staging/ path | ✅ Require PR from feature branches<br>⚠️ Optional review<br>✅ Require CI to pass<br>⚠️ Admin can push directly (for hotfixes) |
| **feature/*** | Feature development | Optional PR preview | ❌ No protection (delete after merge) |
| **bugfix/*** | Bug fixes | Optional PR preview | ❌ No protection (delete after merge) |

### Workflow

1. **Developer creates feature branch** from `staging`
   ```bash
   git checkout staging
   git pull origin staging
   git checkout -b feature/new-rating-animation
   ```

2. **Develop and test locally**
   ```bash
   # Use local server for development
   python -m http.server 8000
   ```

3. **Open PR to `staging`**
   - PR triggers automated deployment to `/pr-{number}/` (optional)
   - Review and merge to `staging`
   - Automated deployment to `/staging/` environment

4. **Validate on staging**
   - Manual QA on https://sdanley.github.io/fivestar-rating-kiosk/staging/
   - Stakeholder review
   - Regression testing

5. **Promote to production**
   - Open PR from `staging` → `main`
   - Final review
   - Merge triggers deployment to production root

6. **Cleanup**
   ```bash
   git branch -d feature/new-rating-animation
   git push origin --delete feature/new-rating-animation
   ```

---

## 2. URL Designation Strategy

### Option Comparison

| Option | Production URL | Staging URL | PR Preview URL | Pros | Cons |
|--------|----------------|-------------|----------------|------|------|
| **A. Subdomains** | https://kiosk.sdanley.dev/ | https://staging.kiosk.sdanley.dev/ | https://pr123.kiosk.sdanley.dev/ | ✅ Clear separation<br>✅ No base path issues<br>✅ Separate service workers | ❌ Requires custom domain<br>❌ DNS configuration<br>❌ SSL cert management |
| **B. Path Prefix** 🏆 | https://sdanley.github.io/fivestar-rating-kiosk/ | https://sdanley.github.io/fivestar-rating-kiosk/staging/ | https://sdanley.github.io/fivestar-rating-kiosk/pr-123/ | ✅ No custom domain needed<br>✅ Free GitHub Pages<br>✅ Simple setup | ⚠️ Requires base path handling<br>⚠️ Shared service worker scope |
| **C. Query Flag** | https://.../?env=prod | https://.../?env=staging | https://.../?env=pr123 | ✅ No path changes<br>✅ Minimal config | ❌ Easily bypassed<br>❌ Confusing UX<br>❌ No actual isolation |

**Selected:** **Option B - Path Prefix** (best balance of simplicity, cost, and isolation)

### Implementation: Path-Based Deployment

#### URL Structure
```
Production:  https://sdanley.github.io/fivestar-rating-kiosk/
Staging:     https://sdanley.github.io/fivestar-rating-kiosk/staging/
PR Preview:  https://sdanley.github.io/fivestar-rating-kiosk/pr-{number}/
```

#### Visual Indicators

Each environment will display a persistent badge:

| Environment | Badge Color | Badge Text | Position |
|-------------|-------------|------------|----------|
| Production | None | (no badge) | N/A |
| Staging | 🟡 Orange | "STAGING" | Top-left corner |
| PR Preview | 🔵 Blue | "PREVIEW: PR #{number}" | Top-left corner |

Badge implementation (added to index.html):
```html
<!-- Environment badge (staging/preview only) -->
<div id="envBadge" class="env-badge hidden" aria-label="Environment indicator">STAGING</div>
```

CSS (added to styles.css):
```css
.env-badge {
  position: fixed;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 9999;
  padding: 0.4rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  border-radius: 0.25rem;
  pointer-events: none;
  opacity: 0.9;
}
.env-badge.staging {
  background: #ff9800;
  color: #000;
}
.env-badge.preview {
  background: #2196f3;
  color: #fff;
}
```

JavaScript detection (added to app.js):
```javascript
// Detect environment from URL path
(function detectEnvironment() {
  const path = window.location.pathname;
  const badge = document.getElementById('envBadge');
  if (!badge) return;

  if (path.includes('/staging/')) {
    badge.textContent = 'STAGING';
    badge.classList.add('staging');
    badge.classList.remove('hidden');
  } else if (path.match(/\/pr-\d+\//)) {
    const prNum = path.match(/\/pr-(\d+)\//)[1];
    badge.textContent = `PREVIEW: PR #${prNum}`;
    badge.classList.add('preview');
    badge.classList.remove('hidden');
  }
  // Production: badge stays hidden
})();
```

---

## 3. Deployment Approach

### GitHub Pages Configuration

**Current Setup:**
- Deployment source: GitHub Actions (`.github/workflows/static.yml`)
- Branch: main only
- URL: https://sdanley.github.io/fivestar-rating-kiosk/

**Proposed Enhancement:**
- Deploy `main` → root path
- Deploy `staging` → `/staging/` path
- Deploy PR branches → `/pr-{number}/` path (optional)

### Workflow Files

#### A. Production Deploy (`.github/workflows/deploy-production.yml`)

```yaml
name: Deploy Production

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages-production"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

#### B. Staging Deploy (`.github/workflows/deploy-staging.yml`)

```yaml
name: Deploy Staging

on:
  push:
    branches: [staging]
  workflow_dispatch:

permissions:
  contents: write  # Needed to push to gh-pages

concurrency:
  group: "staging-deploy"
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout staging
        uses: actions/checkout@v4
        with:
          ref: staging

      - name: Checkout gh-pages
        uses: actions/checkout@v4
        with:
          ref: gh-pages
          path: gh-pages-branch

      - name: Clear staging directory
        run: |
          mkdir -p gh-pages-branch/staging
          rm -rf gh-pages-branch/staging/*

      - name: Copy staging files
        run: |
          # Copy all files except .git and gh-pages-branch
          rsync -av --exclude='.git' --exclude='gh-pages-branch' \
            --exclude='.github' --exclude='docs/REGRESSION_AUDIT.md' \
            --exclude='docs/STAGING_DEPLOYMENT_PLAN.md' \
            ./ gh-pages-branch/staging/

      - name: Add environment indicator
        run: |
          # Inject staging badge into index.html
          sed -i 's/<div id="envBadge" class="env-badge hidden"/<div id="envBadge" class="env-badge staging">STAGING<\/div><!--/' \
            gh-pages-branch/staging/index.html

      - name: Commit and push to gh-pages
        working-directory: gh-pages-branch
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add staging/
          git commit -m "Deploy staging from ${{ github.sha }}" || echo "No changes to commit"
          git push origin gh-pages
```

#### C. PR Preview Deploy (`.github/workflows/deploy-pr-preview.yml`) - Optional

```yaml
name: Deploy PR Preview

on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches: [staging]

permissions:
  contents: write
  pull-requests: write

concurrency:
  group: "pr-preview-${{ github.event.pull_request.number }}"
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout PR branch
        uses: actions/checkout@v4

      - name: Checkout gh-pages
        uses: actions/checkout@v4
        with:
          ref: gh-pages
          path: gh-pages-branch

      - name: Clear PR preview directory
        run: |
          mkdir -p gh-pages-branch/pr-${{ github.event.pull_request.number }}
          rm -rf gh-pages-branch/pr-${{ github.event.pull_request.number }}/*

      - name: Copy PR files
        run: |
          rsync -av --exclude='.git' --exclude='gh-pages-branch' \
            --exclude='.github' --exclude='docs/REGRESSION_AUDIT.md' \
            --exclude='docs/STAGING_DEPLOYMENT_PLAN.md' \
            ./ gh-pages-branch/pr-${{ github.event.pull_request.number }}/

      - name: Add preview indicator
        run: |
          sed -i 's/<div id="envBadge" class="env-badge hidden"/<div id="envBadge" class="env-badge preview">PREVIEW: PR #${{ github.event.pull_request.number }}<\/div><!--/' \
            gh-pages-branch/pr-${{ github.event.pull_request.number }}/index.html

      - name: Commit and push
        working-directory: gh-pages-branch
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add pr-${{ github.event.pull_request.number }}/
          git commit -m "Deploy PR #${{ github.event.pull_request.number }} preview" || echo "No changes"
          git push origin gh-pages

      - name: Comment preview URL on PR
        uses: actions/github-script@v7
        with:
          script: |
            const prNumber = context.issue.number;
            const previewUrl = `https://sdanley.github.io/fivestar-rating-kiosk/pr-${prNumber}/`;
            const comment = `🔍 **Preview deployed!**\n\n${previewUrl}\n\n_This preview updates automatically with new commits._`;

            // Find existing comment
            const comments = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: prNumber,
            });

            const botComment = comments.data.find(c =>
              c.user.type === 'Bot' && c.body.includes('Preview deployed')
            );

            if (botComment) {
              // Update existing comment
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body: comment,
              });
            } else {
              // Create new comment
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: prNumber,
                body: comment,
              });
            }
```

#### D. PR Preview Cleanup (`.github/workflows/cleanup-pr-preview.yml`) - Optional

```yaml
name: Cleanup PR Preview

on:
  pull_request:
    types: [closed]
    branches: [staging]

permissions:
  contents: write

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout gh-pages
        uses: actions/checkout@v4
        with:
          ref: gh-pages

      - name: Remove PR preview directory
        run: |
          rm -rf pr-${{ github.event.pull_request.number }}

      - name: Commit and push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add -A
          git commit -m "Remove PR #${{ github.event.pull_request.number }} preview" || echo "Nothing to remove"
          git push origin gh-pages
```

---

## 4. Code Changes Required

### A. Service Worker Scope Handling

**Challenge:** Service worker registered at `/sw.js` will control all paths (`/`, `/staging/`, `/pr-*/`).

**Solution:** Scope service worker per environment using path detection.

**Changes to `sw.js`:**
```javascript
// Detect environment from registration path
const ENV = self.location.pathname.includes('/staging/') ? 'staging' :
            self.location.pathname.match(/\/pr-\d+\//) ? 'preview' : 'production';

const VERSION = 'v15'; // Increment on any cache changes
const CACHE_NAME = `kiosk-${ENV}-${VERSION}`;

// Environment-specific caching strategy
const CORE_ASSETS = [
  './',
  './index.html',
  './app.js',
  './styles.css',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './assets/logo-dark.png',
  './assets/logo-light.png',
].map(path => {
  // Make paths relative to current environment
  const basePath = ENV === 'production' ? '/fivestar-rating-kiosk/' :
                   ENV === 'staging' ? '/fivestar-rating-kiosk/staging/' :
                   self.location.pathname.match(/^\/fivestar-rating-kiosk\/pr-\d+\//)[0];
  return new URL(path, self.location.origin + basePath).href;
});

// ... rest of service worker logic
```

**Changes to `app.js` (service worker registration):**
```javascript
// Register service worker with correct scope
if ('serviceWorker' in navigator) {
  const basePath = window.location.pathname.match(/^.*\//)[0]; // e.g., "/fivestar-rating-kiosk/staging/"
  navigator.serviceWorker.register(basePath + 'sw.js', { scope: basePath })
    .then(reg => {
      console.log('[SW] Registered for scope:', reg.scope);
      checkForUpdates(reg);
    })
    .catch(err => console.error('[SW] Registration failed:', err));
}
```

### B. Base Path Handling

**Challenge:** Hardcoded absolute paths will break in `/staging/` and `/pr-*/` environments.

**Audit of current code:**
```bash
# Search for absolute paths
grep -r "href=\"/" index.html
grep -r "src=\"/" index.html
```

**Current state:** Most paths are already relative (✅ good). Verify:
- `<link rel="manifest" href="manifest.webmanifest?v=3" />` ✅ Relative
- `<link rel="icon" href="icon-192.png" />` ✅ Relative
- `<link rel="stylesheet" href="styles.css" />` ✅ Relative
- `<script src="app.js" defer></script>` ✅ Relative
- `<img src="assets/logo-dark.png" />` ✅ Relative

**One exception:** GitHub Pages path correction in `index.html` (lines 23-31):
```javascript
// Current code (production-only)
(function(){
  var repo = 'fivestar-rating-kiosk';
  var path = window.location.pathname;
  if (location.hostname.endsWith('.github.io') && !path.includes('/'+repo+'/')) {
    var target = '/' + repo + '/' + (location.search ? '' : '') + (location.hash || '');
    location.replace(target);
  }
})();
```

**Updated code (multi-environment):**
```javascript
// Redirect to correct base path (production, staging, or PR preview)
(function(){
  const repo = 'fivestar-rating-kiosk';
  const path = window.location.pathname;

  if (!location.hostname.endsWith('.github.io')) return; // Not GitHub Pages

  // Detect intended environment from referrer or default to production
  const isStaging = path.includes('/staging/');
  const isPR = path.match(/\/pr-\d+\//);

  let expectedBase = `/${repo}/`;
  if (isStaging) expectedBase += 'staging/';
  else if (isPR) expectedBase += isPR[0].slice(1); // e.g., "pr-123/"

  // If not at expected base, redirect
  if (!path.startsWith(expectedBase)) {
    const target = expectedBase + location.search + (location.hash || '');
    location.replace(target);
  }
})();
```

### C. Manifest File Per Environment

**Challenge:** `manifest.webmanifest` has hardcoded `start_url` and `scope`.

**Current manifest:**
```json
{
  "name": "Five Star Rating Kiosk",
  "short_name": "Rating",
  "start_url": "/fivestar-rating-kiosk/",
  "scope": "/fivestar-rating-kiosk/",
  "display": "standalone",
  ...
}
```

**Solution:** Generate environment-specific manifests during deployment.

**Deployment script addition:**
```bash
# In deploy-staging.yml, after copying files:
- name: Update manifest for staging
  run: |
    jq '.start_url = "/fivestar-rating-kiosk/staging/" | .scope = "/fivestar-rating-kiosk/staging/" | .name = "Rating Kiosk (STAGING)"' \
      gh-pages-branch/staging/manifest.webmanifest > /tmp/manifest.json
    mv /tmp/manifest.json gh-pages-branch/staging/manifest.webmanifest
```

**Alternative (no build step):** Use dynamic manifest generation in HTML:
```html
<!-- Replace static manifest link with dynamic JS generation -->
<script>
  (function() {
    const basePath = window.location.pathname.match(/^.*\//)[0];
    const isStaging = basePath.includes('/staging/');
    const isPR = basePath.match(/\/pr-\d+\//);

    const manifest = {
      name: isStaging ? "Rating Kiosk (STAGING)" : isPR ? "Rating Kiosk (PREVIEW)" : "Five Star Rating Kiosk",
      short_name: "Rating",
      start_url: basePath,
      scope: basePath,
      display: "standalone",
      theme_color: "#0f1113",
      background_color: "#002855",
      icons: [
        { src: "icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "icon-512.png", sizes: "512x512", type: "image/png" }
      ]
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = url;
    document.head.appendChild(link);
  })();
</script>
```

---

## 5. Implementation Plan

### Phase 1: Foundation (Week 1)

- [ ] **Day 1-2: Branch setup**
  - Create `staging` branch from current `main`
  - Configure branch protection rules in GitHub Settings
  - Update team on new workflow

- [ ] **Day 3-4: Code changes**
  - Add environment badge HTML/CSS to index.html and styles.css
  - Add environment detection JS to app.js
  - Update service worker scope handling in sw.js
  - Update path correction logic in index.html
  - Test locally with different base paths

- [ ] **Day 5: Workflow creation**
  - Create `.github/workflows/deploy-production.yml` (rename existing static.yml)
  - Create `.github/workflows/deploy-staging.yml`
  - Test staging deployment manually

### Phase 2: Validation (Week 2)

- [ ] **Day 1-2: Staging deployment testing**
  - Deploy staging environment
  - Verify URL: https://sdanley.github.io/fivestar-rating-kiosk/staging/
  - Verify badge displays "STAGING"
  - Test full kiosk flow on staging
  - Test PWA install from staging URL

- [ ] **Day 3: Integration test**
  - Create test feature branch from staging
  - Make small change (e.g., update version to 1.0.21-staging)
  - Open PR to staging
  - Merge and verify auto-deploy

- [ ] **Day 4-5: Promotion flow test**
  - Open PR from staging → main
  - Review and merge
  - Verify production deployment (no badge)
  - Verify no regression from staging changes

### Phase 3: PR Previews (Optional, Week 3)

- [ ] **Day 1-2: PR preview workflows**
  - Create `.github/workflows/deploy-pr-preview.yml`
  - Create `.github/workflows/cleanup-pr-preview.yml`
  - Test with sample PR

- [ ] **Day 3-5: Documentation & rollout**
  - Update README.md with deployment workflow
  - Create CONTRIBUTING.md with branching guide
  - Train team on new process
  - Monitor first week of real usage

### Phase 4: Hardening (Ongoing)

- [ ] **Add status checks**
  - Create lint workflow (if not exists)
  - Create build verification workflow
  - Require checks to pass before merge

- [ ] **Add visual regression testing**
  - Integrate Percy or Chromatic (optional)
  - Or use simple screenshot diff script

- [ ] **Monitor and refine**
  - Track deployment success rate
  - Collect team feedback
  - Adjust process as needed

---

## 6. Rollout Plan

### Step-by-Step Deployment

#### Step 1: Create Staging Branch
```bash
# From main branch
git checkout main
git pull origin main
git checkout -b staging
git push -u origin staging
```

#### Step 2: Configure Branch Protection

Navigate to **Settings → Branches → Add rule**:

**For `main` branch:**
- Branch name pattern: `main`
- ✅ Require a pull request before merging
  - Required approvals: 1
  - ✅ Dismiss stale reviews
  - ✅ Require review from Code Owners (if CODEOWNERS file exists)
- ✅ Require status checks to pass (once CI exists)
- ✅ Require branches to be up to date
- ✅ Restrict pushes (only allow staging branch)
- ✅ Do not allow bypassing (even for admins)

**For `staging` branch:**
- Branch name pattern: `staging`
- ✅ Require a pull request before merging
  - Required approvals: 0 (optional review)
- ⚠️ Allow admin bypass (for hotfixes)

#### Step 3: Deploy Code Changes

1. Create feature branch from staging:
   ```bash
   git checkout staging
   git checkout -b feature/staging-deployment-setup
   ```

2. Apply all code changes from Section 4:
   - Update index.html (env badge + path correction)
   - Update styles.css (env badge styles)
   - Update app.js (env detection + SW registration)
   - Update sw.js (scope handling)

3. Commit and push:
   ```bash
   git add .
   git commit -m "Add staging deployment support with environment badges"
   git push -u origin feature/staging-deployment-setup
   ```

4. Open PR to staging, review, merge

#### Step 4: Deploy Workflow Files

1. Create feature branch:
   ```bash
   git checkout staging
   git pull origin staging
   git checkout -b feature/deployment-workflows
   ```

2. Create workflow files:
   - Rename `.github/workflows/static.yml` → `deploy-production.yml`
   - Create `.github/workflows/deploy-staging.yml`
   - (Optional) Create PR preview workflows

3. Commit and push:
   ```bash
   git add .github/workflows/
   git commit -m "Add staging and production deployment workflows"
   git push -u origin feature/deployment-workflows
   ```

4. Open PR to staging, review, merge

#### Step 5: Test Staging Deploy

1. Push to staging branch (should trigger deploy)
2. Wait for workflow to complete
3. Visit: https://sdanley.github.io/fivestar-rating-kiosk/staging/
4. Verify:
   - [ ] Badge shows "STAGING"
   - [ ] App functions correctly
   - [ ] Service worker registers with correct scope
   - [ ] PWA can be installed

#### Step 6: Promote to Production

1. Open PR from staging → main
2. Add description: "Initial staging deployment setup"
3. Review changes (should include env badge code, but badge hidden in production)
4. Merge PR
5. Verify production deployment:
   - [ ] https://sdanley.github.io/fivestar-rating-kiosk/ works
   - [ ] No badge visible (production mode)
   - [ ] No regressions

#### Step 7: Enforce Policy

1. Announce new workflow to team
2. Update README.md with branching guide
3. Add PR template reminder to bump versions
4. Monitor for 1 week, adjust as needed

---

## 7. Guardrails to Prevent Future Lost Changes

### A. Branch Protection Rules (GitHub Settings)

**Already covered in Section 6, Step 2.**

### B. Pull Request Template

Create `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Description
<!-- Brief description of changes -->

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Pre-Merge Checklist
- [ ] **Version bumped** (if user-facing change): updated `version.json` and `sw.js` VERSION constant
- [ ] **Tested locally**: full kiosk flow works (setup → rate → submit → auto-return)
- [ ] **Tested on staging**: validated at https://sdanley.github.io/fivestar-rating-kiosk/staging/
- [ ] **Screenshots attached**: for UI changes, include before/after images
- [ ] **Cross-browser tested**: Safari (iOS), Chrome, Edge
- [ ] **Admin panel verified**: diagnostics, export, settings still functional
- [ ] **No console errors**: checked browser DevTools

## Screenshots
<!-- Attach screenshots for UI changes -->

## Related Issues
<!-- Link related issues: Fixes #123, Closes #456 -->

## Deployment Notes
<!-- Any special instructions for deployment or rollout -->
```

### C. CODEOWNERS File

Create `.github/CODEOWNERS`:

```
# Require review from repo owner for critical files
*.js        @sdanley
*.css       @sdanley
*.html      @sdanley
sw.js       @sdanley
version.json @sdanley

# Workflows can be reviewed by maintainers
.github/workflows/ @sdanley
```

### D. Automated Version Check (GitHub Action)

Create `.github/workflows/check-version.yml`:

```yaml
name: Version Check

on:
  pull_request:
    branches: [main, staging]
    paths:
      - 'app.js'
      - 'index.html'
      - 'styles.css'

jobs:
  check-version:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout PR
        uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Check if version bumped
        run: |
          # Compare version.json and sw.js between HEAD and HEAD~1
          git diff HEAD~1 HEAD -- version.json sw.js > version_diff.txt

          if [ ! -s version_diff.txt ]; then
            echo "⚠️ Warning: Code changed but version.json or sw.js not updated"
            echo "::warning::Consider bumping version in version.json and VERSION constant in sw.js"
            # Don't fail, just warn
          else
            echo "✅ Version files updated"
          fi
```

### E. Release Checklist

Create `docs/RELEASE_CHECKLIST.md`:

```markdown
# Release Checklist

Use this checklist when promoting staging → main (production release).

## Pre-Release
- [ ] All staging tests pass
- [ ] Stakeholder sign-off received
- [ ] No open P0/P1 bugs in staging
- [ ] Version bumped: `version.json` and `sw.js` VERSION updated
- [ ] CHANGELOG.md updated (if exists)

## Release
- [ ] Open PR: staging → main
- [ ] PR description includes: version number, key changes, migration notes
- [ ] Code review completed (1+ approval)
- [ ] All CI checks pass
- [ ] Merge PR

## Post-Release
- [ ] Verify production deployment succeeded
- [ ] Smoke test: https://sdanley.github.io/fivestar-rating-kiosk/
- [ ] Check admin panel revision matches new version
- [ ] Monitor for 24 hours (watch for rollback PRs or bug reports)
- [ ] Announce release in team channel (if applicable)

## Rollback (if needed)
If critical bug found post-release:
1. Revert merge commit: `git revert <merge-sha> -m 1`
2. Push to main: `git push origin main`
3. Create hotfix branch from last known good commit
4. Fix issue, PR to staging, re-test, re-release
```

---

## 8. Constraints & Trade-offs

### What This Plan Achieves ✅
- Clear separation of staging and production environments
- URL-based identification (visible path in address bar)
- Zero cost (uses free GitHub Pages)
- Minimal infrastructure (no custom servers, DNS, or paid services)
- Parallel development support (multiple feature branches → staging)
- Safer releases (validate on staging before production)

### What This Plan Sacrifices ⚠️
- **Shared service worker scope**: Since all environments are under `github.io/fivestar-rating-kiosk/*`, service worker cache could theoretically overlap (mitigated by environment-specific cache names)
- **Path-based URLs**: Slightly less clean than subdomain-based (`/staging/` vs `staging.domain.com`)
- **Manual testing still required**: No automated E2E tests (future enhancement)
- **Single GitHub Pages site**: Can't deploy to separate infrastructure (would require custom hosting)

### Alternatives Considered ❌
1. **Separate repos for staging** - Rejected: too much duplication, hard to sync
2. **Netlify/Vercel** - Rejected: introduces paid dependency, repo owner prefers GitHub-native
3. **Query params** (`?env=staging`) - Rejected: too easy to bypass, no real isolation
4. **AWS S3 + CloudFront** - Rejected: overkill for static site, cost, complexity

---

## 9. Maintenance & Operations

### Daily Operations

**For Developers:**
- Always branch from `staging`, not `main`
- Open PRs to `staging` first
- Validate on staging URL before promoting

**For Reviewers:**
- Check PR preview link (if enabled)
- Verify version bump for user-facing changes
- Confirm screenshots attached for UI changes

**For Release Manager:**
- Weekly or bi-weekly promotion: staging → main
- Follow `docs/RELEASE_CHECKLIST.md`
- Monitor post-deployment for 24 hours

### Monitoring

**What to Monitor:**
- GitHub Actions workflow success rate (target: >95%)
- Staging environment uptime (manual checks)
- Production error rate (check browser console logs via analytics, if implemented)
- Time from merge to deployment (should be <5 minutes)

**Alerting:**
- GitHub Actions failure notifications (built-in email)
- Optional: Slack integration for deployment notifications

### Troubleshooting

**Issue:** Staging deploy failed
- Check workflow logs in GitHub Actions
- Common causes: cache conflict, invalid HTML, GitHub Pages quota exceeded
- Fix: re-run workflow, check file paths, clear cache

**Issue:** Service worker not updating
- Clear browser cache and hard refresh (Ctrl+Shift+R)
- Check admin panel → "Check Update"
- Verify VERSION constant incremented in sw.js

**Issue:** Wrong environment badge (or no badge)
- Check path in URL (must include `/staging/` or `/pr-{number}/`)
- Verify environment detection JS in app.js is correct
- Check browser console for JS errors

---

## 10. Future Enhancements (Post-MVP)

### Short-Term (1-3 Months)
- [ ] **Automated E2E tests**: Playwright or Cypress to test kiosk flow
- [ ] **Visual regression tests**: Percy or Chromatic for screenshot diffs
- [ ] **Lighthouse CI**: Automated performance and accessibility checks
- [ ] **Deployment notifications**: Slack webhook on successful deploy

### Medium-Term (3-6 Months)
- [ ] **Custom domain**: Move to `kiosk.sdanley.dev` with subdomain-based staging
- [ ] **Analytics integration**: Privacy-preserving usage tracking (Plausible or self-hosted)
- [ ] **Version telemetry**: Track which versions are running on which kiosks
- [ ] **A/B testing framework**: Test UI variants on staging before full rollout

### Long-Term (6-12 Months)
- [ ] **Backend integration**: If rating data needs server-side aggregation
- [ ] **Multi-region deployment**: CDN or edge workers for faster global load times
- [ ] **Blue-green deployments**: Zero-downtime updates with instant rollback
- [ ] **Feature flags**: Enable/disable features per environment without redeployment

---

## 11. Success Metrics

### Deployment Stability
- **Target:** <1 rollback per month
- **Measure:** Count of revert commits to main branch

### Release Velocity
- **Target:** 1-2 production releases per week
- **Measure:** Time from feature branch creation to main merge

### Regression Rate
- **Target:** <5% of releases require follow-up fix within 48 hours
- **Measure:** PRs labeled "regression" or "hotfix" divided by total releases

### Developer Satisfaction
- **Target:** Team finds staging process "easy" or "very easy"
- **Measure:** Quarterly survey (1-5 scale)

### Staging Coverage
- **Target:** 100% of user-facing changes deployed to staging before main
- **Measure:** Manual audit of PR history

---

## Appendix A: Commands Reference

### Creating a Feature Branch
```bash
git checkout staging
git pull origin staging
git checkout -b feature/my-awesome-feature
# ... make changes ...
git add .
git commit -m "Add awesome feature"
git push -u origin feature/my-awesome-feature
```

### Updating Feature Branch from Staging
```bash
git checkout feature/my-awesome-feature
git fetch origin
git merge origin/staging
# Resolve conflicts if any
git push
```

### Promoting Staging to Production
```bash
# Via GitHub UI (recommended):
# 1. Open PR: staging → main
# 2. Review, approve, merge

# Via CLI (advanced):
git checkout main
git pull origin main
git merge staging --no-ff -m "Release v1.0.21: [summary]"
git push origin main
```

### Hotfix (Direct to Staging)
```bash
# Emergency fix bypassing feature branch
git checkout staging
git pull origin staging
# ... make urgent fix ...
git add .
git commit -m "HOTFIX: Fix critical XYZ issue"
git push origin staging
# Immediately open PR to main if needed
```

---

## Appendix B: Testing Locally with Path Prefixes

To test staging/preview behavior locally:

```bash
# Serve from a subdirectory to simulate GitHub Pages paths
mkdir -p /tmp/local-pages/fivestar-rating-kiosk/staging
cp -r . /tmp/local-pages/fivestar-rating-kiosk/staging/
cd /tmp/local-pages
python -m http.server 8000
# Visit: http://localhost:8000/fivestar-rating-kiosk/staging/
```

Or use a quick symlink approach:
```bash
# Create staging-like directory structure
mkdir -p staging
cp index.html staging/
cp app.js staging/
cp styles.css staging/
# ... copy all files ...
python -m http.server 8000
# Visit: http://localhost:8000/staging/
```

---

## Approval & Sign-off

**Prepared by:** Claude (Anthropic AI Agent)
**Reviewed by:** _[Pending]_
**Approved by:** _[Pending]_

**Approval Date:** _[Pending]_

**Notes:**
- This plan is proposed pending stakeholder review
- Implementation should begin only after sign-off
- Adjustments may be made during Phase 1 based on technical discoveries

---

**Plan Version:** 1.0
**Last Updated:** March 13, 2026
**Status:** 🟡 Proposed (awaiting approval)
