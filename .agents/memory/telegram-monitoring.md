---
name: Telegram monitoring and IP blocks
description: SendFlow's user-requested Telegram security alerts and Node-level IP blocking constraints.
---

For SendFlow, monitoring is off until both the bot token and private-group chat ID are configured in Plesk's Node environment. The user wants no extra Telegram-specific settings there. Derive the webhook secret server-side from the bot token, and authorize IP-block callbacks by checking the sender's current creator/administrator role in the configured group through Telegram's API. The bot must be a group administrator. Never put the bot token or derived webhook secret in source, Git, browser variables, or frontend responses. The event scope is public page views, clicks and form submissions without field contents, plus security response statuses.

IP blocking applies only to requests that reach Express/Node. Plesk or a CDN may serve assets before Node. Do not trust forwarded client IP headers unless the exact proxy addresses have been verified and configured; never trust all proxies. If Node only sees a private Passenger address, do not treat it as a visitor IP or offer an IP block action. The app cannot infer phone numbers, GPS, ISP/network type, or reliable country without separate user consent and a geolocation provider. When Telegram monitoring and blocking are enabled, failure of the persistent block store must fail closed with a service-unavailable response; never silently pass requests when the block list cannot be checked.

**Why:** The user requested Telegram alerts for public activity and suspicious requests, with IP block/unblock controls, wants only the bot token and group ID configured in Plesk, and chose Telegram group administrators as the action allowlist. Misidentifying Passenger's proxy IP could block every visitor; silently passing traffic when the persistent deny list is unavailable would make configured bans ineffective.

**How to apply:** Keep the integration off until both Telegram values are configured; explain the telemetry in the published privacy policy before activation; restrict group membership; make the bot an administrator; verify proxy behavior on Plesk before enabling visitor-IP bans; and return 503 rather than bypassing the block check when persistent storage is unavailable.
