# LAYER V6 — Full Commerce Patch

## What V6 adds
- Footer typography increased to match header/menu scale.
- Dynamic products loaded from Supabase.
- Dedicated Amazon-style product detail page (without copying Amazon branding/layout).
- Multiple real product photos.
- Price, compare price, stock, material, finish and estimated delivery days.
- Add to Cart and Buy Now.
- Quantity controls in cart.
- Dedicated secure checkout page.
- Saved delivery addresses + campus pickup.
- Coupon validation.
- External online payment link.
- UPI payment deep link.
- Pay-at-campus-desk option.
- Server-side checkout calculation in Supabase.
- Admin console for Products, Orders, Coupons and Payment Settings.
- Admin product photo upload to Supabase Storage.

## Upload these files to GitHub
At repository root:
- index.html
- styles.css
- script.js
- auth.js
- catalog.js
- product.html
- product.js
- checkout.html
- checkout.js
- commerce.css
- admin.html
- admin.js
- admin.css

Keep your existing:
- supabase-config.js

Upload:
- supabase/migration-v6-commerce.sql

Your existing assets/ folder can remain.

## Database step
Open Supabase > SQL Editor and run:
`supabase/migration-v6-commerce.sql`

Then promote your own account:

```sql
update public.profiles
set role='admin'
where id=(select id from auth.users where email='YOUR_LOGIN_EMAIL');
```

Use the SAME email you use to log in to LAYER.

## Admin
After logging in with the promoted account:
`https://YOUR-SITE/admin.html`

The ADMIN button also appears in the main header for admin users.

## Real product photos
Admin > Products > New/Edit Product > Product Photos.
The photos are uploaded to the public `product-images` bucket. Use real printed product photos here.

## Payment
Admin > Payments:
- Online Payment Page URL: paste a hosted payment-page/payment-link URL from your chosen payment provider.
- UPI ID: optional direct UPI payment.
- Pay at Campus Desk: can be enabled/disabled.

V6 does not claim that an external payment was automatically verified. Online/UPI orders stay `PENDING` until the admin changes payment status to `PAID`, unless you later integrate a payment provider webhook.
