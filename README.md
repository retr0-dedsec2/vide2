# Bridge Core v1

Universal execution bridge between ChatGPT/MCP clients and a Windows PC.

## Components

- `apps/relay` — HTTP + WebSocket relay
- `apps/daemon` — Windows execution daemon
- `apps/mcp-server` — MCP interface
- `apps/browser-extension` — Chrome/Edge MV3 bridge
- `adapters/*` — browser, Windows and file execution adapters
- `packages/*` — protocol, permissions, journal, verification and SDK

## Local development

```powershell
npm install
Copy-Item .env.example .env
npm run dev:relay
npm run dev:daemon
npm run dev:mcp
```

Never commit `.env`. Replace the placeholder tokens before using the relay remotely.

## Security defaults

Read/preparation operations may run automatically. External writes, sends, publishing and deletion require exact-action approval. Financial actions are denied by default.

See `docs/SECURITY.md` for the security model.
