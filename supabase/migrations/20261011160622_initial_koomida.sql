-- Koomida: private pantry and favorites. Run once via Supabase migrations.
create table public.pantry_items (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 80),
 quantity numeric(12,3) not null check (quantity >= 0 and quantity <= 100000),
 unit text not null check (unit in ('g','kg','ml','l','ud')),
 category text not null check (category in ('Verduras','Frutas','Legumbres','Cereales','Proteínas','Lácteos','Básicos')),
 expires_on date,
 created_at timestamptz not null default now()
);
create index pantry_items_user_id_idx on public.pantry_items(user_id);
create table public.favorites (
 user_id uuid not null references auth.users(id) on delete cascade,
 recipe_id text not null check (length(recipe_id) between 1 and 100),
 primary key (user_id,recipe_id)
);
alter table public.pantry_items enable row level security;
alter table public.favorites enable row level security;
revoke all on public.pantry_items, public.favorites from anon;
grant select, insert, update, delete on public.pantry_items, public.favorites to authenticated;
create policy pantry_owner on public.pantry_items for all to authenticated
 using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy favorites_owner on public.favorites for all to authenticated
 using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Atomic approximate deduction; never converts units to mass or volume.
create function public.cook_recipe(ingredients jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare ingredient jsonb; item record; remaining numeric; wanted numeric; available numeric;
 factor numeric; used numeric; ingredient_unit text; normalized_name text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if jsonb_typeof(ingredients) <> 'array' or jsonb_array_length(ingredients) not between 1 and 20 then
  raise exception 'Invalid ingredients';
 end if;
 -- Serialize deductions within this account, including separate ingredients/lots.
 perform id from public.pantry_items where user_id = auth.uid() order by id for update;
 for ingredient in select value from jsonb_array_elements(ingredients) loop
  remaining := (ingredient->>'quantity')::numeric;
  ingredient_unit := ingredient->>'unit';
  if remaining is null or remaining <= 0 or remaining > 100000 or ingredient_unit is null or ingredient_unit not in ('g','kg','ml','l','ud') then raise exception 'Invalid quantity or unit'; end if;
  normalized_name := regexp_replace(translate(lower(trim(ingredient->>'name')), 'áéíóúüñ', 'aeiouun'), '\s+', ' ', 'g');
  for item in select * from public.pantry_items
    where user_id = auth.uid()
      and regexp_replace(translate(lower(trim(name)), 'áéíóúüñ', 'aeiouun'), '\s+', ' ', 'g') = normalized_name
      and (expires_on is null or expires_on >= (now() at time zone 'Europe/Madrid')::date)
    order by expires_on asc nulls last, created_at, id
  loop
   factor := case
    when item.unit = ingredient_unit then 1
    when (item.unit='kg' and ingredient_unit='g') or (item.unit='l' and ingredient_unit='ml') then 1000
    when (item.unit='g' and ingredient_unit='kg') or (item.unit='ml' and ingredient_unit='l') then 0.001
    else null end;
   if factor is not null and remaining > 0 then
    used := least(item.quantity, remaining / factor);
    update public.pantry_items set quantity = greatest(0,round(quantity-used,3)) where id=item.id and user_id=auth.uid();
    remaining := greatest(0,remaining-used*factor);
   end if;
  end loop;
 end loop;
end;
$$;
revoke all on function public.cook_recipe(jsonb) from public, anon;
grant execute on function public.cook_recipe(jsonb) to authenticated;
