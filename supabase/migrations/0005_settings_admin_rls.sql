-- Allow tenant members to update their own tenant row, manage roles, see peers, and let Tenant Admins assign roles.

begin;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tenants' and policyname = 'tenants_update_own_tenant'
  ) then
    create policy tenants_update_own_tenant
    on public.tenants for update
    using (id = public.current_tenant_id())
    with check (id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_profiles' and policyname = 'user_profiles_select_same_tenant'
  ) then
    create policy user_profiles_select_same_tenant
    on public.user_profiles for select
    using (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'roles' and policyname = 'roles_insert_tenant'
  ) then
    create policy roles_insert_tenant
    on public.roles for insert
    with check (tenant_id = public.current_tenant_id() and is_system = false);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'roles' and policyname = 'roles_update_tenant'
  ) then
    create policy roles_update_tenant
    on public.roles for update
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'roles' and policyname = 'roles_delete_tenant'
  ) then
    create policy roles_delete_tenant
    on public.roles for delete
    using (tenant_id = public.current_tenant_id() and is_system = false);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_role_assignments' and policyname = 'user_role_assignments_admin_manage'
  ) then
    create policy user_role_assignments_admin_manage
    on public.user_role_assignments
    for all
    using (
      tenant_id = public.current_tenant_id()
      and public.current_app_role() = 'Tenant Admin'
    )
    with check (
      tenant_id = public.current_tenant_id()
      and public.current_app_role() = 'Tenant Admin'
    );
  end if;
end $$;

commit;
