-- LAYER V6 COMMERCE MIGRATION
-- Run this ONCE in Supabase SQL Editor after the original schema.sql.
-- It preserves existing users/products/orders.

create extension if not exists pgcrypto;

alter table public.profiles add column if not exists role text not null default 'customer';

alter table public.products add column if not exists sku text;
alter table public.products add column if not exists image_urls jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists estimated_delivery_days integer not null default 1;
alter table public.products add column if not exists compare_at_price numeric(10,2);
alter table public.products add column if not exists weight_grams numeric(10,2);
alter table public.products add column if not exists customizable boolean not null default false;

alter table public.orders add column if not exists address_id uuid;
alter table public.orders add column if not exists subtotal numeric(10,2);
alter table public.orders add column if not exists discount numeric(10,2) not null default 0;
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists delivery_mode text not null default 'PICKUP';
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists payment_status text not null default 'PENDING';
alter table public.orders add column if not exists payment_link text;
alter table public.orders add column if not exists address_snapshot jsonb;

alter table public.order_items add column if not exists product_image_url text;

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  mobile text not null,
  address_line1 text not null,
  address_line2 text,
  landmark text,
  city text not null,
  state text not null,
  postal_code text not null,
  address_type text not null default 'Home',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  min_order numeric(10,2) not null default 0,
  max_discount numeric(10,2),
  usage_limit integer,
  used_count integer not null default 0,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.store_settings(key,value)
values ('checkout','{"payment_link_url":"","upi_id":"","payee_name":"LAYER Campus 3D Lab","allow_pay_at_desk":true,"payment_instructions":""}'::jsonb)
on conflict (key) do nothing;

-- Reusable admin permission check.
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path=public
as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;

-- RLS
alter table public.addresses enable row level security;
alter table public.coupons enable row level security;
alter table public.store_settings enable row level security;

-- Prevent a normal user from promoting their own profile to admin.
-- Keep self-service editing only for non-privileged profile fields.
revoke update on public.profiles from authenticated;
grant update(full_name,campus_id,user_type,department,year_of_study,mobile,updated_at) on public.profiles to authenticated;

drop policy if exists "Users manage own addresses" on public.addresses;
create policy "Users manage own addresses" on public.addresses
for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

drop policy if exists "Admins view all addresses" on public.addresses;
create policy "Admins view all addresses" on public.addresses
for select to authenticated using (public.is_admin());

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products" on public.products
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins view profiles" on public.profiles;
create policy "Admins view profiles" on public.profiles
for select to authenticated using (public.is_admin());

drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders" on public.orders
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage order items" on public.order_items;
create policy "Admins manage order items" on public.order_items
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage coupons" on public.coupons;
create policy "Admins manage coupons" on public.coupons
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Checkout settings are readable" on public.store_settings;
create policy "Checkout settings are readable" on public.store_settings
for select to anon, authenticated using (key='checkout');

drop policy if exists "Admins manage settings" on public.store_settings;
create policy "Admins manage settings" on public.store_settings
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Public product photo bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('product-images','product-images',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true;

drop policy if exists "Public reads product images" on storage.objects;
create policy "Public reads product images" on storage.objects
for select to public using (bucket_id='product-images');

drop policy if exists "Admins upload product images" on storage.objects;
create policy "Admins upload product images" on storage.objects
for insert to authenticated with check (bucket_id='product-images' and public.is_admin());

drop policy if exists "Admins update product images" on storage.objects;
create policy "Admins update product images" on storage.objects
for update to authenticated using (bucket_id='product-images' and public.is_admin()) with check (bucket_id='product-images' and public.is_admin());

drop policy if exists "Admins delete product images" on storage.objects;
create policy "Admins delete product images" on storage.objects
for delete to authenticated using (bucket_id='product-images' and public.is_admin());

-- Coupon preview used by checkout. Coupon table itself remains hidden from customers.
create or replace function public.validate_coupon(p_code text,p_subtotal numeric)
returns table(valid boolean,code text,discount_amount numeric,message text)
language plpgsql security definer set search_path=public
as $$
declare c public.coupons%rowtype; d numeric(10,2);
begin
 select * into c from public.coupons where upper(coupons.code)=upper(trim(p_code)) limit 1;
 if c.id is null then return query select false,null::text,0::numeric,'Coupon not found.'; return; end if;
 if not c.active then return query select false,c.code,0::numeric,'Coupon is inactive.'; return; end if;
 if c.starts_at is not null and now()<c.starts_at then return query select false,c.code,0::numeric,'Coupon is not active yet.'; return; end if;
 if c.ends_at is not null and now()>c.ends_at then return query select false,c.code,0::numeric,'Coupon has expired.'; return; end if;
 if c.usage_limit is not null and c.used_count>=c.usage_limit then return query select false,c.code,0::numeric,'Coupon usage limit reached.'; return; end if;
 if p_subtotal<c.min_order then return query select false,c.code,0::numeric,'Minimum order is ₹'||c.min_order::text||'.'; return; end if;
 d:=case when c.discount_type='percent' then round(p_subtotal*c.discount_value/100,2) else c.discount_value end;
 if c.max_discount is not null then d:=least(d,c.max_discount); end if;
 d:=least(d,p_subtotal);
 return query select true,c.code,d,'Coupon applied.';
end $$;
grant execute on function public.validate_coupon(text,numeric) to authenticated;

-- Secure server-side checkout: prices, stock and coupons are recalculated in the database.
create or replace function public.create_checkout_order(
  p_items jsonb,
  p_address_id uuid,
  p_delivery_mode text,
  p_coupon_code text,
  p_payment_method text
)
returns table(order_id uuid,order_number text,total numeric,payment_link text)
language plpgsql security definer set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_item jsonb; v_product public.products%rowtype; v_qty integer;
  v_subtotal numeric(10,2):=0; v_discount numeric(10,2):=0; v_total numeric(10,2);
  v_order_id uuid:=gen_random_uuid(); v_order_number text;
  v_address public.addresses%rowtype; v_snapshot jsonb:=null;
  v_coupon public.coupons%rowtype; v_link text;
begin
  if v_uid is null then raise exception 'Login required.'; end if;
  if p_delivery_mode not in ('DELIVERY','PICKUP') then raise exception 'Invalid delivery mode.'; end if;
  if jsonb_array_length(coalesce(p_items,'[]'::jsonb))=0 then raise exception 'Cart is empty.'; end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty:=greatest(1,(v_item->>'quantity')::integer);
    select * into v_product from public.products where id=v_item->>'product_id' and active=true for update;
    if v_product.id is null then raise exception 'A product is unavailable.'; end if;
    if v_product.stock>0 and v_product.stock<v_qty then raise exception '% has only % item(s) available.',v_product.name,v_product.stock; end if;
    v_subtotal:=v_subtotal+(v_product.price*v_qty);
  end loop;

  if p_delivery_mode='DELIVERY' then
    select * into v_address from public.addresses where id=p_address_id and user_id=v_uid;
    if v_address.id is null then raise exception 'Select a valid delivery address.'; end if;
    v_snapshot:=to_jsonb(v_address)-'id'-'user_id'-'created_at'-'updated_at';
  end if;

  if nullif(trim(coalesce(p_coupon_code,'')),'') is not null then
    select * into v_coupon from public.coupons where upper(code)=upper(trim(p_coupon_code)) limit 1 for update;
    if v_coupon.id is not null and v_coupon.active
      and (v_coupon.starts_at is null or now()>=v_coupon.starts_at)
      and (v_coupon.ends_at is null or now()<=v_coupon.ends_at)
      and (v_coupon.usage_limit is null or v_coupon.used_count<v_coupon.usage_limit)
      and v_subtotal>=v_coupon.min_order
    then
      v_discount:=case when v_coupon.discount_type='percent' then round(v_subtotal*v_coupon.discount_value/100,2) else v_coupon.discount_value end;
      if v_coupon.max_discount is not null then v_discount:=least(v_discount,v_coupon.max_discount); end if;
      v_discount:=least(v_discount,v_subtotal);
      update public.coupons set used_count=used_count+1,updated_at=now() where id=v_coupon.id;
    end if;
  end if;

  v_total:=greatest(0,v_subtotal-v_discount);
  v_order_number:='LYR-'||to_char(now(),'YYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  select value->>'payment_link_url' into v_link from public.store_settings where key='checkout';

  insert into public.orders(id,order_number,user_id,total,subtotal,discount,coupon_code,status,pickup_status,address_id,address_snapshot,delivery_mode,payment_method,payment_status,payment_link)
  values(v_order_id,v_order_number,v_uid,v_total,v_subtotal,v_discount,case when v_discount>0 then upper(trim(p_coupon_code)) else null end,'SUBMITTED','PENDING',p_address_id,v_snapshot,p_delivery_mode,p_payment_method,'PENDING',v_link);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty:=greatest(1,(v_item->>'quantity')::integer);
    select * into v_product from public.products where id=v_item->>'product_id';
    insert into public.order_items(order_id,product_id,product_name,quantity,unit_price,product_image_url)
    values(v_order_id,v_product.id,v_product.name,v_qty,v_product.price,coalesce(v_product.image_urls->>0,v_product.image_url));
    if v_product.stock>0 then update public.products set stock=greatest(0,stock-v_qty) where id=v_product.id; end if;
  end loop;

  return query select v_order_id,v_order_number,v_total,v_link;
end $$;
grant execute on function public.create_checkout_order(jsonb,uuid,text,text,text) to authenticated;

-- IMPORTANT: after this migration, promote your own account to admin.
-- Replace YOUR_EMAIL and run separately:
-- update public.profiles
-- set role='admin'
-- where id=(select id from auth.users where email='YOUR_EMAIL');
