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
