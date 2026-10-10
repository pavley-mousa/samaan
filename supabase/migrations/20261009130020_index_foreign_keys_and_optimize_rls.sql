create index if not exists addresses_user_id_idx on public.addresses(user_id);
create index if not exists favorites_product_id_idx on public.favorites(product_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);
create index if not exists order_items_variant_id_idx on public.order_items(variant_id);
create index if not exists orders_address_id_idx on public.orders(address_id);
create index if not exists product_images_product_id_idx on public.product_images(product_id);
create index if not exists product_images_variant_id_idx on public.product_images(variant_id);
create index if not exists tailoring_requests_product_id_idx on public.tailoring_requests(product_id);
create index if not exists tailoring_requests_fabric_variant_id_idx on public.tailoring_requests(fabric_variant_id);
create index if not exists wholesale_price_tiers_variant_id_idx on public.wholesale_price_tiers(variant_id);

do $$
declare
  policy_row record;
  statement text;
begin
  for policy_row in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') like '%auth.uid()%' or coalesce(with_check, '') like '%auth.uid()%')
  loop
    statement := format('alter policy %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
    if policy_row.qual is not null then
      statement := statement || ' using (' || replace(policy_row.qual, 'auth.uid()', '(select auth.uid())') || ')';
    end if;
    if policy_row.with_check is not null then
      statement := statement || ' with check (' || replace(policy_row.with_check, 'auth.uid()', '(select auth.uid())') || ')';
    end if;
    execute statement;
  end loop;
end $$;
