# Beauty Cloud

Salon management platform for ERPNext: online booking, reception, POS, beautician workspace, and customer portal.

## Repository layout

| Path | Description |
|------|-------------|
| `apps/beauty_cloud/` | Frappe app (ERPNext backend, APIs, DocTypes) |
| `beauty-cloud-web/` | Next.js staff + customer web UI |

## Install on Frappe Bench

```bash
# From your bench directory
bench get-app /path/to/this-repo/apps/beauty_cloud
bench --site yoursite install-app beauty_cloud

# Web UI (separate process)
cd beauty-cloud-web
npm install
npm run build
npm run start
```

Configure site URL, Beauty Cloud Settings, and outgoing email in ERPNext before enabling customer OTP and booking confirmation emails.
