# LAYER — Campus 3D Print Lab

Premium, scroll-driven campus ecommerce and fabrication portal for 3D printed objects.

## V4 additions

- Increased display-letter spacing for cleaner premium typography.
- Replaced the flat SVG catalogue artwork with locally rendered 3D object previews.
- Added **LOGIN**, **REGISTER** and **MY LAYER** account UI.
- Added Supabase-ready authentication.
- Added user profile creation from registration metadata.
- Added authenticated campus-order creation.
- Added authenticated custom-print requests with private model upload support.
- Added My LAYER dashboard for orders, custom jobs, pickup count and profile.
- Added PostgreSQL schema, RLS policies and Storage policies in `supabase/schema.sql`.

## Important about the current product images

The included PNGs are 3D-render previews so the site is no longer using flat illustration cards. For the final production catalogue, replace them with photographs of the **actual printed products**. The layout is already photo-ready; keep the same filenames or update the `image` fields in `script.js`.

## Run locally

Use a local HTTP server rather than opening `index.html` with `file://`:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

## Connect Supabase

1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. Open **Project Settings → API**.
4. Copy the Project URL and anon/publishable key into `supabase-config.js`.
5. In **Authentication → URL Configuration**, add your deployed domain and local development URL.
6. Deploy the folder to Cloudflare Pages / GitHub Pages / another static host.

`supabase-config.js` contains only the public browser key. Security is enforced by the RLS rules in `supabase/schema.sql`. Never place a Supabase service-role key in this repository.

## GitHub workflow

Recommended repository name: `layer-3d-store`

```bash
git init
git add .
git commit -m "LAYER v4: premium storefront with auth"
git branch -M main
git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
git push -u origin main
```

## Next production phase

- Upload real product photography.
- Move catalogue CRUD to an admin dashboard.
- Read product stock/prices directly from Supabase instead of the current static fallback.
- Add order status updates and QR pickup tokens.
- Add STL geometry analysis / filament-weight / print-time estimation.
