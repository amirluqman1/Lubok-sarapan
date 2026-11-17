-- Lubok Sarapan — Neon project `lubok-sarapan` (lucky-truth-90617919), region aws-ap-southeast-1.
-- Applied 2026-11-17. Neon Auth (Better Auth) + Neon Data API are enabled on branch `main`.
-- Kept here as documentation / to recreate the database. Do not put secrets in this file.

create table public.menu_items (
  id text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  category text not null check (category in ('nasi-lemak','lain')),
  name text not null check (length(name) between 1 and 80),
  description text not null default '' check (length(description) <= 300),
  price numeric(8,2) check (price is null or price >= 0),
  image text check (image is null or length(image) <= 300),
  sort_order int not null default 0,
  sold_out_on date,                        -- "Habis hari ini": counts only on that day (Asia/Kuala_Lumpur)
  closed boolean not null default false,   -- "Tutup sehingga dibuka"
  updated_at timestamptz not null default now()
);

-- Admin = this exact Neon Auth user id + email. user_id is linked manually after the owner signs up.
create table public.admins (
  email text primary key check (email = lower(email)),
  user_id text unique
);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admins a
    join neon_auth."user" u on u.id::text = a.user_id
    where a.user_id = auth.user_id() and lower(u.email) = a.email and coalesce(u.banned, false) = false
  )
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anonymous;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger menu_items_touch before update on public.menu_items for each row execute function public.touch_updated_at();

-- What the public site reads. sold_out_today resets automatically after midnight Malaysia time.
create view public.menu_public with (security_invoker = on) as
  select id, category, name, description, price, image, sort_order, closed,
    (sold_out_on is not null and sold_out_on >= (now() at time zone 'Asia/Kuala_Lumpur')::date) as sold_out_today,
    updated_at
  from public.menu_items;

alter table public.menu_items enable row level security;
alter table public.admins enable row level security;   -- no policies: not readable through the API
create policy menu_read_all on public.menu_items for select to anonymous, authenticated using (true);
create policy menu_admin_update on public.menu_items for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy menu_admin_insert on public.menu_items for insert to authenticated with check ((select public.is_admin()));
create policy menu_admin_delete on public.menu_items for delete to authenticated using ((select public.is_admin()));

grant usage on schema public to anonymous, authenticated;
grant select on public.menu_items, public.menu_public to anonymous, authenticated;
grant insert, update, delete on public.menu_items to authenticated;

-- Verified 2026-11-17 (SQL role simulation): anonymous can read 9 items, cannot update, cannot read admins;
-- an authenticated non-admin user changes 0 rows; sold_out_on = today → sold out, yesterday → available.
