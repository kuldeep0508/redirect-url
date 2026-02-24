# Organization distribution (without Chrome Web Store / Edge Add-ons)

This guide explains how to share this extension inside your organization **without publishing publicly to extension stores**.

## 1) Build one release artifact

From repo root:

```bash
zip -r gitlab-url-migration-redirector.zip manifest.json background.js options.html options.css options.js README.md DEPLOYMENT.md LICENSE
```

You will use this source bundle for:
- Chromium packaging (`.crx`) and updates
- Firefox packaging (`.xpi`)

---

## 2) Chrome / Edge organization rollout (recommended)

For managed devices, use enterprise policy + a privately hosted update URL.

### 2.1 Create signed `.crx`

Use your internal extension packaging pipeline (or Chrome/Edge packaging tooling) to produce:
- `gitlab-redirector.crx`
- an update manifest XML (for example `updates.xml`) that points to the CRX URL and version.

Host both files on an internal HTTPS server, for example:
- `https://intranet.example.com/extensions/gitlab-redirector.crx`
- `https://intranet.example.com/extensions/updates.xml`

### 2.2 Force-install via policy

Set policy with `ExtensionInstallForcelist`:

- **Chrome (Windows GPO / JSON policy):**
  - Value format: `<extension_id>;<update_manifest_url>`
- **Edge (Windows GPO / JSON policy):**
  - Same format

Example entry:

```text
<extension_id>;https://intranet.example.com/extensions/updates.xml
```

Users get the extension automatically, and future updates roll out when version is bumped and the update manifest changes.

---

## 3) Firefox organization rollout

Firefox has stricter signing rules.

### 3.1 Package and sign

1. Build `.xpi` from this source.
2. Sign the add-on (recommended: AMO **unlisted** signing flow for internal use).
3. Host the signed `.xpi` internally over HTTPS.

### 3.2 Install with Firefox Enterprise Policies

Configure policy (`policies.json`) with one of:
- `Extensions > Install` to install from URL
- `ExtensionSettings` to lock install/update behavior

Example concept:

```json
{
  "policies": {
    "Extensions": {
      "Install": [
        "https://intranet.example.com/extensions/gitlab-redirector.xpi"
      ]
    }
  }
}
```

> Note: Unsigned add-ons are generally blocked in standard Firefox channels.

---

## 4) If devices are not centrally managed (manual rollout)

- Share this repo ZIP internally.
- Users install as unpacked/temporary extension:
  - Chrome: `chrome://extensions` > Developer mode > Load unpacked
  - Edge: `edge://extensions` > Developer mode > Load unpacked
  - Firefox: `about:debugging#/runtime/this-firefox` > Load Temporary Add-on

This is best for pilot/testing, not for long-term managed deployment.

---

## 5) Share redirect rules with all users

To make all users use the same migration mappings:

1. Create a default rules JSON in your org docs.
2. Ask users/admins to paste/import the rules into extension Options.
3. For managed fleets, pre-seed extension storage using enterprise browser profile tooling if available.

Tip: Keep a single canonical rule:

- Include (regex): `https://innersource\.soprasteria\.com/(.*)`
- Redirect to: `https://gitlab.sbs-software.com/$1`
- Pattern type: `regex`
- Resource types: `main_frame`, `sub_frame`, `xmlhttprequest`

---

## 6) If you *do* want to publish to browser stores

Yes, you can publish to each browser's store. It is optional for internal rollout, but useful for easier updates on unmanaged devices.

### Chrome Web Store

1. Create a developer account in Chrome Web Store Developer Dashboard.
2. Zip extension source (same package content as your release zip).
3. Upload package, complete listing metadata/screenshots, and submit for review.
4. After approval, users can install directly from the store.

### Microsoft Edge Add-ons

1. Create a partner/developer account in Microsoft Partner Center (Edge Add-ons).
2. Upload extension package and fill listing data.
3. Submit for certification.
4. After publish, users install from Edge Add-ons catalog.

### Firefox Add-ons (AMO)

1. Sign in to AMO developer hub.
2. Upload `.xpi`.
3. Choose one:
   - **Listed** (public store listing), or
   - **Unlisted** (signed but not publicly listed; can still distribute internally).

---

## 7) Do you need GitHub Actions / CI pipelines?

Short answer: **No, not required**. You can publish manually from each store dashboard.

However, CI/CD is strongly recommended when you want consistency and repeatability.

### Good CI responsibilities

- Validate syntax/tests on every change.
- Build signed artifacts (`.zip`, `.crx`, `.xpi`).
- Bump version consistently.
- Attach artifacts to GitHub Releases.
- Optionally call store APIs for upload/submit.

### Practical recommendation

- Start with **manual submission** for first release.
- Add **GitHub Actions** once your release process stabilizes.
- Keep signing credentials/API keys in GitHub Secrets (never in repo).


## 8) GitHub Actions CI/CD steps (ready-to-use)

This repo now includes `.github/workflows/extension-ci-cd.yml`.

### What it does

1. **Validate** on PR/push:
   - `python -m json.tool manifest.json`
   - `node --check background.js`
   - `node --check options.js`
2. **Package** a distributable ZIP (`gitlab-url-migration-redirector.zip`).
3. **Upload artifact** to the workflow run.
4. On tags like `v1.0.0`, **attach ZIP to GitHub Releases**.

### How to run release pipeline

1. Update `manifest.json` version.
2. Commit and push changes.
3. Create and push a version tag:

```bash
git tag v1.0.1
git push origin v1.0.1
```

4. Open GitHub Actions run and download artifact or use the generated GitHub Release asset.

### Optional: fully automated store publishing

The workflow contains a placeholder job (`publish-guidance`) where you can add store API upload steps.

Recommended secrets (if automating):

- `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `CWS_EXTENSION_ID`
- Edge Partner Center/Azure app credentials (`EDGE_TENANT_ID`, `EDGE_CLIENT_ID`, `EDGE_CLIENT_SECRET`)
- `AMO_JWT_ISSUER`, `AMO_JWT_SECRET`

If you do not add store upload steps, manual dashboard submission remains fully valid.
