# Paper2Test-admin

Admin panel for [paper2test.app](https://paper2test.app): bundles of prebuilt tests, pricing, coupons, purchases, users, stats.
Static Preact app; talks to the main API at `https://paper2test.app/api` with an admin Google session.

```bash
npm install
npm run build        # -> dist/
```

Deploy on Vercel (build command `npm run build`, output `dist`). Set the site's origin in the API's `ADMIN_ORIGIN`
and add it to the Google OAuth client's authorized JavaScript origins.

For local development against a local API: open the site and run `localStorage.setItem('p2t.admin.api', 'http://localhost:8787/api')`.
