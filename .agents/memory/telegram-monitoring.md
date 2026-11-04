---
name: Telegram monitoring and IP blocks
description: SendFlow's user-requested Telegram security alerts and Node-level IP blocking constraints.
---

For SendFlow, monitoring should remain disabled until the user configures Telegram credentials in Plesk's Node environment. Never put the bot token or webhook secret in source, Git, browser variables, or frontend responses. The intended event scope is public page views, clicks and form submissions without field contents, plus security response statuses. Telegram controls must accept actions only from explicitly configured Telegram user IDs in the configured private group.

IP blocking applies only to requests that reach Express/Node. Plesk or a CDN may serve assets before Node. Do not trust forwarded client IP headers unless the exact proxy addresses have been verified and configured; never trust all proxies. If Node only sees a private Passenger address, do not treat it as a visitor IP or offer an IP block action. The app cannot infer phone numbers, GPS, ISP/network type, or reliable country without separate user consent and a geolocation provider.

**Why:** The user requested Telegram alerts for public activity and suspicious requests, with IP block/unblock controls, and explicitly wants bot credentials configured on the Plesk server. Misidentifying Passenger's proxy IP could block every visitor.

**How to apply:** Keep the integration opt-in, explain the telemetry in the published privacy policy before activation, limit the Telegram group to authorized people, and verify proxy behavior on Plesk before enabling visitor-IP bans.
