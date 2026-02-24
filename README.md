# GitLab URL Migration Redirector (Chrome / Edge / Firefox)

This repository contains a cross-browser WebExtension that helps during GitLab URL migrations (old host to new host).

It supports:

- **Regular Expression** and **Wildcard** URL matching.
- Redirect substitutions (`$1`, `$2`, etc.) for path preservation.
- Optional exclude patterns.
- Configurable request resource types (main frame, iframe, XHR/fetch, etc.).
- Multiple redirect rules.

## Example migration rule

If your old GitLab was:

- `https://innersource.soprasteria.com/...`

and the new GitLab is:

- `https://gitlab.sbs-software.com/...`

you can create:

- **Include pattern (regex):** `https://innersource\.soprasteria\.com/(.*)`
- **Redirect to:** `https://gitlab.sbs-software.com/$1`
- **Pattern type:** `Regular Expression`
- **Apply to:** Main window + IFrames + XMLHttpRequest

## How it works

The extension stores your rules in `chrome.storage.sync` and converts enabled rules into
`declarativeNetRequest` dynamic redirect rules.

## Install locally (unpacked)

1. Clone this repo.
2. Open your browser extension page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Firefox: `about:debugging#/runtime/this-firefox`
3. Enable developer mode.
4. Load unpacked/temporary add-on from this folder.
5. Open extension **Options** and add your migration rule(s).

## Share in your org without public store publishing

Use enterprise/private rollout instead of public stores:

- **Chrome / Edge (recommended):** package to `.crx`, host internally, and force-install via `ExtensionInstallForcelist` policy.
- **Firefox:** package `.xpi`, sign as unlisted/internal add-on, host internally, and install via Firefox enterprise policies.

Detailed step-by-step guide: **[`DEPLOYMENT.md`](./DEPLOYMENT.md)**

## Browser compatibility notes

- **Chrome / Edge:** Supported via Manifest V3 + declarativeNetRequest.
- **Firefox:** Supported on recent versions with MV3 + DNR support (minimum version declared in manifest).

## Files

- `manifest.json` – extension metadata and permissions.
- `background.js` – dynamic redirect rule synchronization.
- `options.html` / `options.js` / `options.css` – rule management UI.
- `DEPLOYMENT.md` – private/org-wide deployment and update steps.
