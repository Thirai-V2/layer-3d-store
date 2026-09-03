# Deployment

## Option A — GitHub Pages

The repository includes `.github/workflows/pages.yml`.

1. Push the repository to GitHub on the `main` branch.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, select **GitHub Actions**.
4. The workflow deploys the static site automatically.
5. Add the deployed URL to Supabase **Authentication → URL Configuration**.

## Option B — Cloudflare Pages

Recommended if you want to keep the deployment pattern used for a modern production site.

1. In Cloudflare Pages, choose **Connect to Git**.
2. Select the `layer-3d-store` repository.
3. Framework preset: **None**.
4. Build command: leave empty.
5. Build output directory: `/`.
6. Deploy.
7. Add the Cloudflare Pages domain and final custom domain to Supabase Auth URL configuration.

## Supabase

Before enabling real registrations/orders:

1. Run `supabase/schema.sql` in Supabase SQL Editor.
2. Add the Project URL and anon/publishable key to `supabase-config.js`.
3. Never commit a service-role key.
