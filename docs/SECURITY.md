# Security model

- Rotate `BRIDGE_DEVICE_TOKEN` and `BRIDGE_MCP_TOKEN`; never commit `.env`.
- Keep browser cookies and service credentials in their native local stores.
- File access is deny-by-default outside `BRIDGE_ALLOWED_ROOTS`.
- Publishing, sending, external writes and deletes require an exact action approval.
- Financial actions are denied in v1.
- Never use Bridge to bypass CAPTCHAs, bans, platform rate limits or authentication controls.
- For internet deployment, terminate TLS at a reverse proxy, use WSS, rate-limit relay APIs and replace shared tokens with device public-key signatures.
