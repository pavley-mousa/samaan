revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.prevent_role_escalation() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

insert into public.categories (name, slug, description, sort_order)
values
  ('الأقمشة', 'fabrics', 'أقمشة تباع بالمتر', 1),
  ('الجلاليب الجاهزة', 'ready-galabiyas', 'جلاليب جاهزة للبيع بالقطعة', 2),
  ('الجلاليب التفصيل', 'custom-galabiyas', 'طلبات الجلاليب حسب المقاس والتصميم', 3)
on conflict (slug) do nothing;
