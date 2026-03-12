# Dependabot alerts and notifications

This repo uses [Dependabot](https://docs.github.com/en/code-security/dependabot) for dependency and security alerts. To **stop receiving emails** about Dependabot issues, use one of the options below.

---

## Option A: Disable Dependabot alerts for this repository (stops emails for everyone)

Disabling alerts means GitHub will no longer scan this repo for vulnerable dependencies or send any Dependabot alert emails.

1. Open **Repository Settings** → **Code security and analysis**  
   Direct link: **https://github.com/VistA-Evolved/VistA-Evolved/settings/security_analysis**
2. Under **Dependabot alerts**, click **Disable**.
3. Confirm if prompted.

After this, no one will get Dependabot alert emails for this repo. You can re-enable it later if you want to resume scanning.

---

## Option B: Keep alerts, but stop email for yourself only

If you want to keep Dependabot alerts enabled for the repo but stop emails on your account:

1. Click your profile picture (top right) → **Settings**.
2. In the left sidebar, go to **Notifications**.
3. Under **Dependabot**, either:
   - **Uncheck "Email"** so you only see alerts on GitHub (web/inbox), or
   - Choose **"Email weekly digest"** to get at most one summary email per week instead of per-alert emails.

You can also use the **Manage notifications** (bell) drop-down on any page → **Notification settings** to reach the same Dependabot options.

---

## Fixing existing vulnerabilities

- **From the repo:** Run `pnpm audit` at the repo root. Fix any reported issues with `pnpm update` or by upgrading specific packages; then commit the updated lockfile.
- **From GitHub:** Open **Security** → **Dependabot alerts** to see what GitHub has flagged. Resolve or dismiss alerts there; once all are resolved or dismissed, alert emails stop for those issues.

---

## Related

- [Configuring notifications for Dependabot alerts](https://docs.github.com/en/code-security/dependabot/dependabot-alerts/configuring-notifications-for-dependabot-alerts)
- Dependabot version-update config: `.github/dependabot.yml`
