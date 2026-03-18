-- BookFlow Pro - Seed data for Phase 1
-- Run with a high-privilege role (e.g., Supabase service role) for initial setup.

begin;

-- DEV NOTE:
-- This seed script creates a dev tenant + core reference rows + example services/resources.
-- You still need to create a Supabase Auth user and insert a `user_profiles` row for that user's `auth_user_id`
-- so `public.current_tenant_id()` can resolve and RLS can allow reads.

do $$
declare
  v_tenant_id uuid := gen_random_uuid();
  v_branch_id uuid := gen_random_uuid();
  v_customer_id uuid := gen_random_uuid(); -- unused placeholder; customer will be created by booking RPC later
  v_admin_role_id uuid := gen_random_uuid();
  v_dispatcher_role_id uuid := gen_random_uuid();
  v_branch_admin_role_id uuid := gen_random_uuid();
  v_staff_role_id uuid := gen_random_uuid();
  v_customer_role_id uuid := gen_random_uuid();
begin
  insert into public.tenants (id, name, slug, default_timezone)
  values (v_tenant_id, 'BookFlow Pro Dev', 'dev', 'Africa/Johannesburg');

  -- Roles
  insert into public.roles (id, tenant_id, name, is_system) values
    (v_admin_role_id, v_tenant_id, 'Tenant Admin', true),
    (v_branch_admin_role_id, v_tenant_id, 'Branch Admin', true),
    (v_dispatcher_role_id, v_tenant_id, 'Dispatcher', true),
    (v_staff_role_id, v_tenant_id, 'Staff', true),
    (v_customer_role_id, v_tenant_id, 'Customer', true);

  -- Branch
  insert into public.branches (id, tenant_id, name, code)
  values (v_branch_id, v_tenant_id, 'Main Branch', 'MAIN');

  -- Booking statuses
  insert into public.booking_statuses (tenant_id, name, is_system) values
    (v_tenant_id, 'Pending', true),
    (v_tenant_id, 'Confirmed', true),
    (v_tenant_id, 'Cancelled', true);

  -- Notification channels
  insert into public.notification_channels (tenant_id, channel_type, name) values
    (v_tenant_id, 'email', 'Email'),
    (v_tenant_id, 'in_app', 'In-app');

  -- Resource types
  declare
    v_staff_type_id uuid := gen_random_uuid();
    v_room_type_id uuid := gen_random_uuid();
    v_seat_map_resource_id uuid := gen_random_uuid();
  begin
    insert into public.resource_types (id, tenant_id, name, code) values
      (v_staff_type_id, v_tenant_id, 'Staff', 'STAFF'),
      (v_room_type_id, v_tenant_id, 'Room', 'ROOM');

    -- Services
    declare
      v_service_room_id uuid := gen_random_uuid();
      v_sub_service_standard_id uuid := gen_random_uuid();
      v_service_staff_id uuid := gen_random_uuid();
    begin
      insert into public.services (id, tenant_id, branch_id, category_id, name, code, duration_minutes, is_active)
      values
        (v_service_room_id, v_tenant_id, v_branch_id, null, 'Room Booking (30m)', 'ROOM30', 30, true),
        (v_service_staff_id, v_tenant_id, v_branch_id, null, 'Staff Appointment (30m)', 'STAFF30', 30, true);

      insert into public.sub_services (id, tenant_id, service_id, name, code, duration_override_minutes, is_active)
      values
        (v_sub_service_standard_id, v_tenant_id, v_service_room_id, 'Standard', 'STD', null, true);

      -- Link services to resource types
      insert into public.service_resources (tenant_id, service_id, resource_type_id, is_active)
      values
        (v_tenant_id, v_service_room_id, v_room_type_id, true),
        (v_tenant_id, v_service_staff_id, v_staff_type_id, true);

      -- Resources
      declare
        v_room_resource_id uuid := gen_random_uuid();
        v_staff_resource_id uuid := gen_random_uuid();
      begin
        insert into public.resources (id, tenant_id, branch_id, resource_type_id, code, name, capacity, status)
        values
          (v_room_resource_id, v_tenant_id, v_branch_id, v_room_type_id, 'ROOM2', 'Room 2', 1, 'Active'),
          (v_staff_resource_id, v_tenant_id, v_branch_id, v_staff_type_id, 'DR_SMITH', 'Dr. Smith', 1, 'Active');

        -- Seat map for the room scenario (optional but supported)
        declare
          v_seat_map_id uuid := gen_random_uuid();
        begin
          insert into public.seat_maps (id, tenant_id, resource_id, name, is_active)
          values (v_seat_map_id, v_tenant_id, v_room_resource_id, 'Room2 Seats', true);

          insert into public.seats (seat_map_id, seat_number, row_no, col_no, seat_class, is_bookable)
          values
            (v_seat_map_id, 'S1', 1, 1, 'Standard', true),
            (v_seat_map_id, 'S2', 1, 2, 'Standard', true),
            (v_seat_map_id, 'S3', 1, 3, 'Standard', true);

          -- Availability for next 30 days at all times (simple window)
          declare
            v_start timestamptz := now();
            v_end timestamptz := now() + interval '30 days';
          begin
            insert into public.resource_availability (tenant_id, resource_id, start_time, end_time)
            values
              (v_tenant_id, v_room_resource_id, v_start, v_end),
              (v_tenant_id, v_staff_resource_id, v_start, v_end);
          end;
        end;
      end;
    end;
  end;
end $$;

commit;

