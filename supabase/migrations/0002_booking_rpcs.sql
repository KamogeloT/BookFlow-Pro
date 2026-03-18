-- BookFlow Pro - Phase 1 trusted RPC functions

begin;

-- Booking reference format (Phase 1):
-- BFP-{YYYYMMDD}-{HHMM}-B{branch_code}-S{resource_code}{seat_number}-{RANDOM}
-- Note: we include both resource_code and seat_number (seat_number defaults to 'NA').

create or replace function public.generate_booking_reference(
  p_tenant_id uuid,
  p_scheduled_start timestamptz,
  p_branch_code text,
  p_resource_code text,
  p_seat_number text
)
returns text
language plpgsql
stable
as $$
declare
  v_ymd text := to_char(p_scheduled_start, 'YYYYMMDD');
  v_hm text := to_char(p_scheduled_start, 'HH24MI');
  v_rand text := upper(substr(md5(random()::text), 1, 6));
begin
  return format(
    'BFP-%s-%s-B%s-S%s%s-%s',
    v_ymd,
    v_hm,
    coalesce(p_branch_code, 'NA'),
    coalesce(p_resource_code, 'RES'),
    case when p_seat_number is null or p_seat_number = '' then 'NA' else '-' || p_seat_number end,
    v_rand
  );
end;
$$;

-- RPC: create booking + allocation (phase 1 minimal)
-- Creates:
-- - bookings (Pending -> Confirmed)
-- - booking_items (1 item)
-- - allocations (1 allocation)
-- - booking_events (Created/Allocated/Confirmed)
-- - notification_queue entries (email, if seeded)
create or replace function public.create_booking_with_allocation(
  p_service_id uuid,
  p_branch_id uuid,
  p_scheduled_start timestamptz,
  p_notes text,
  p_customer_email text
)
returns table (
  booking_id uuid,
  booking_reference text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_service record;
  v_branch_id_resolved uuid;
  v_customer_id uuid;
  v_booking_status_pending uuid;
  v_booking_status_confirmed uuid;
  v_scheduled_end timestamptz;

  v_booking_id uuid;
  v_booking_item_id uuid;
  v_allocation_id uuid;

  v_resource_type_id uuid;
  v_resource_id uuid;
  v_seat_id uuid;
  v_seat_number text;

  v_branch_code text;
  v_resource_code text;
  v_email_channel_id uuid;

  v_ref text;
begin
  if v_tenant_id is null then
    raise exception 'Tenant not resolved for current auth user.';
  end if;
  if p_customer_email is null or btrim(p_customer_email) = '' then
    raise exception 'p_customer_email is required.';
  end if;

  select *
  into v_service
  from public.services
  where id = p_service_id
    and tenant_id = v_tenant_id
    and is_active = true
  limit 1;

  if v_service.id is null then
    raise exception 'Service not found or inactive.';
  end if;

  v_branch_id_resolved := coalesce(p_branch_id, v_service.branch_id);
  v_scheduled_end := p_scheduled_start + (v_service.duration_minutes * interval '1 minute');

  select id into v_booking_status_pending
  from public.booking_statuses
  where tenant_id = v_tenant_id and name = 'Pending'
  limit 1;

  select id into v_booking_status_confirmed
  from public.booking_statuses
  where tenant_id = v_tenant_id and name = 'Confirmed'
  limit 1;

  if v_booking_status_pending is null or v_booking_status_confirmed is null then
    raise exception 'Required booking_statuses rows (Pending/Confirmed) are missing.';
  end if;

  -- Customer upsert by email (phase 1 minimal)
  select c.id into v_customer_id
  from public.customers c
  where c.tenant_id = v_tenant_id and c.email = p_customer_email
  limit 1;

  if v_customer_id is null then
    insert into public.customers (tenant_id, email, full_name, phone)
    values (v_tenant_id, p_customer_email, null, null)
    returning id into v_customer_id;
  end if;

  -- Create booking header
  insert into public.bookings (
    tenant_id,
    branch_id,
    customer_id,
    booking_reference,
    status_id,
    booking_at,
    scheduled_start,
    scheduled_end,
    source,
    notes
  )
  values (
    v_tenant_id,
    v_branch_id_resolved,
    v_customer_id,
    null,
    v_booking_status_pending,
    now(),
    p_scheduled_start,
    v_scheduled_end,
    'Web',
    p_notes
  )
  returning id into v_booking_id;

  -- Audit: booking created (critical business milestone)
  insert into public.audit_log (
    tenant_id,
    actor_user_id,
    entity_name,
    entity_id,
    action,
    before_data,
    after_data
  )
  values (
    v_tenant_id,
    auth.uid(),
    'booking',
    v_booking_id,
    'Created',
    null,
    jsonb_build_object(
      'service_id', v_service.id,
      'scheduled_start', p_scheduled_start,
      'scheduled_end', v_scheduled_end,
      'status', 'Pending'
    )
  );

  -- Create one booking item
  insert into public.booking_items (
    tenant_id,
    booking_id,
    service_id,
    sub_service_id,
    quantity,
    scheduled_start,
    scheduled_end,
    allocation_status
  )
  values (
    v_tenant_id,
    v_booking_id,
    v_service.id,
    null,
    1,
    p_scheduled_start,
    v_scheduled_end,
    'Unallocated'
  )
  returning id into v_booking_item_id;

  insert into public.booking_events (
    tenant_id,
    booking_id,
    event_type,
    actor_user_id,
    event_data
  )
  values (
    v_tenant_id,
    v_booking_id,
    'Created',
    auth.uid(),
    jsonb_build_object('service_id', v_service.id, 'start', p_scheduled_start)
  );

  -- Choose allowed resource type for the service (phase 1: first active)
  select sr.resource_type_id
  into v_resource_type_id
  from public.service_resources sr
  where sr.tenant_id = v_tenant_id
    and sr.service_id = v_service.id
    and sr.is_active = true
  order by sr.created_at asc
  limit 1;

  if v_resource_type_id is null then
    raise exception 'No active resource type mapped for this service.';
  end if;

  -- Pick next available resource (least utilization)
  select r.id into v_resource_id
  from public.resources r
  where r.tenant_id = v_tenant_id
    and r.resource_type_id = v_resource_type_id
    and r.status = 'Active'
    and (
      -- availability covers the requested window
      exists (
        select 1 from public.resource_availability ra
        where ra.tenant_id = v_tenant_id
          and ra.resource_id = r.id
          and ra.start_time <= p_scheduled_start
          and ra.end_time >= v_scheduled_end
      )
    )
    and not exists (
      select 1 from public.resource_unavailability ru
      where ru.tenant_id = v_tenant_id
        and ru.resource_id = r.id
        and ru.start_time < v_scheduled_end
        and ru.end_time > p_scheduled_start
    )
    and not exists (
      -- prevent overbooking for the resource window (resource-level conflicts)
      select 1
      from public.allocations a
      join public.booking_items bi on bi.id = a.booking_item_id
      join public.bookings b on b.id = bi.booking_id
      where a.tenant_id = v_tenant_id
        and a.status = 'Confirmed'
        and a.resource_id = r.id
        and b.scheduled_start < v_scheduled_end
        and b.scheduled_end > p_scheduled_start
    )
  order by (
    select count(*)
    from public.allocations a2
    where a2.tenant_id = v_tenant_id
      and a2.status = 'Confirmed'
      and a2.resource_id = r.id
  ) asc
  limit 1;

  if v_resource_id is null then
    raise exception 'No available resource found for the requested time.';
  end if;

  -- Concurrency guard: serialize allocations for the same tenant/resource/time bucket.
  perform pg_advisory_xact_lock(
    hashtext(
      v_tenant_id::text || ':' || v_resource_id::text || ':' || to_char(p_scheduled_start, 'YYYYMMDDHH24MI')
    )::bigint
  );

  -- Optional seat allocation if the resource has bookable seats.
  v_seat_id := null;
  v_seat_number := null;

  select s.id, s.seat_number
  into v_seat_id, v_seat_number
  from public.seats s
  join public.seat_maps sm on sm.id = s.seat_map_id
  where sm.tenant_id = v_tenant_id
    and sm.resource_id = v_resource_id
    and s.is_bookable = true
    and not exists (
      -- prevent overbooking for this seat window
      select 1
      from public.allocations a
      join public.booking_items bi on bi.id = a.booking_item_id
      join public.bookings b on b.id = bi.booking_id
      where a.tenant_id = v_tenant_id
        and a.status = 'Confirmed'
        and a.seat_id = s.id
        and b.scheduled_start < v_scheduled_end
        and b.scheduled_end > p_scheduled_start
    )
  order by s.seat_number asc
  limit 1;

  -- Persist allocation
  insert into public.allocations (
    tenant_id,
    booking_item_id,
    resource_id,
    seat_id,
    allocated_at,
    status,
    algorithm_version,
    manual_override
  )
  values (
    v_tenant_id,
    v_booking_item_id,
    v_resource_id,
    v_seat_id,
    now(),
    'Confirmed',
    'phase1-v1',
    false
  )
  returning id into v_allocation_id;

  -- Audit: allocation created (critical for traceability)
  insert into public.audit_log (
    tenant_id,
    actor_user_id,
    entity_name,
    entity_id,
    action,
    before_data,
    after_data
  )
  values (
    v_tenant_id,
    auth.uid(),
    'allocation',
    v_allocation_id,
    'Allocated',
    null,
    jsonb_build_object(
      'booking_item_id', v_booking_item_id,
      'resource_id', v_resource_id,
      'seat_id', v_seat_id,
      'scheduled_start', p_scheduled_start,
      'scheduled_end', v_scheduled_end
    )
  );

  update public.booking_items
  set allocation_status = 'Allocated'
  where id = v_booking_item_id
    and tenant_id = v_tenant_id;

  insert into public.booking_events (
    tenant_id,
    booking_id,
    event_type,
    actor_user_id,
    event_data
  )
  values (
    v_tenant_id,
    v_booking_id,
    'Allocated',
    auth.uid(),
    jsonb_build_object(
      'resource_id', v_resource_id,
      'seat_id', v_seat_id
    )
  );

  -- Confirm booking
  update public.bookings
  set
    status_id = v_booking_status_confirmed,
    updated_at = now()
  where id = v_booking_id
    and tenant_id = v_tenant_id;

  -- Generate reference and update booking
  select coalesce(b.code, b.name) into v_branch_code
  from public.branches b
  where b.id = v_branch_id_resolved
  limit 1;

  select r.code into v_resource_code
  from public.resources r
  where r.id = v_resource_id
  limit 1;

  v_ref := public.generate_booking_reference(
    v_tenant_id,
    p_scheduled_start,
    v_branch_code,
    v_resource_code,
    v_seat_number
  );

  update public.bookings
  set booking_reference = v_ref,
      updated_at = now()
  where id = v_booking_id
    and tenant_id = v_tenant_id;

  -- Audit: reference assigned + booking confirmed milestone
  insert into public.audit_log (
    tenant_id,
    actor_user_id,
    entity_name,
    entity_id,
    action,
    before_data,
    after_data
  )
  values (
    v_tenant_id,
    auth.uid(),
    'booking',
    v_booking_id,
    'Confirmed',
    null,
    jsonb_build_object(
      'booking_reference', v_ref,
      'resource_code', v_resource_code,
      'seat_number', v_seat_number
    )
  );

  insert into public.booking_events (
    tenant_id,
    booking_id,
    event_type,
    actor_user_id,
    event_data
  )
  values (
    v_tenant_id,
    v_booking_id,
    'Confirmed',
    auth.uid(),
    jsonb_build_object(
      'reference', v_ref,
      'resource_code', v_resource_code,
      'seat_number', v_seat_number
    )
  );

  -- Enqueue notification (email only if seeded)
  select id into v_email_channel_id
  from public.notification_channels
  where tenant_id = v_tenant_id
    and channel_type = 'email'
    and is_active = true
  limit 1;

  if v_email_channel_id is not null then
    insert into public.notification_queue (
      tenant_id,
      channel_id,
      booking_id,
      recipient,
      payload,
      status,
      queued_at,
      try_count
    )
    values (
      v_tenant_id,
      v_email_channel_id,
      v_booking_id,
      p_customer_email,
      jsonb_build_object(
        'booking_reference', v_ref,
        'scheduled_start', p_scheduled_start,
        'scheduled_end', v_scheduled_end,
        'service_id', v_service.id,
        'resource_code', v_resource_code,
        'seat_number', v_seat_number
      ),
      'Queued',
      now(),
      0
    );
  end if;

  return query
  select v_booking_id, v_ref;
end;
$$;

-- Query helper: list available resources for a service/time window (phase 1)
create or replace function public.get_available_resources_for_service(
  p_service_id uuid,
  p_branch_id uuid,
  p_scheduled_start timestamptz
)
returns table (
  resource_id uuid,
  resource_code text,
  seat_id uuid,
  seat_number text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_service record;
  v_branch_id_resolved uuid;
  v_scheduled_end timestamptz;
  v_resource_type_id uuid;
begin
  if v_tenant_id is null then
    return;
  end if;

  select * into v_service
  from public.services
  where id = p_service_id
    and tenant_id = v_tenant_id
    and is_active = true
  limit 1;

  if v_service.id is null then
    return;
  end if;

  v_branch_id_resolved := coalesce(p_branch_id, v_service.branch_id);
  v_scheduled_end := p_scheduled_start + (v_service.duration_minutes * interval '1 minute');

  select sr.resource_type_id
  into v_resource_type_id
  from public.service_resources sr
  where sr.tenant_id = v_tenant_id
    and sr.service_id = v_service.id
    and sr.is_active = true
  order by sr.created_at asc
  limit 1;

  if v_resource_type_id is null then
    return;
  end if;

  return query
  select
    r.id as resource_id,
    r.code as resource_code,
    s.id as seat_id,
    s.seat_number
  from public.resources r
  left join public.seat_maps sm on sm.resource_id = r.id and sm.tenant_id = v_tenant_id and sm.is_active = true
  left join public.seats s on s.seat_map_id = sm.id and s.is_bookable = true
  where r.tenant_id = v_tenant_id
    and r.resource_type_id = v_resource_type_id
    and r.status = 'Active'
    and exists (
      select 1 from public.resource_availability ra
      where ra.tenant_id = v_tenant_id
        and ra.resource_id = r.id
        and ra.start_time <= p_scheduled_start
        and ra.end_time >= v_scheduled_end
    )
    and not exists (
      select 1 from public.resource_unavailability ru
      where ru.tenant_id = v_tenant_id
        and ru.resource_id = r.id
        and ru.start_time < v_scheduled_end
        and ru.end_time > p_scheduled_start
    )
    and not exists (
      -- resource-level conflicts
      select 1
      from public.allocations a
      join public.booking_items bi on bi.id = a.booking_item_id
      join public.bookings b on b.id = bi.booking_id
      where a.tenant_id = v_tenant_id
        and a.status = 'Confirmed'
        and a.resource_id = r.id
        and b.scheduled_start < v_scheduled_end
        and b.scheduled_end > p_scheduled_start
    )
    and (
      -- seat-level conflicts (if seat_id exists)
      s.id is null or not exists (
        select 1
        from public.allocations a
        join public.booking_items bi on bi.id = a.booking_item_id
        join public.bookings b on b.id = bi.booking_id
        where a.tenant_id = v_tenant_id
          and a.status = 'Confirmed'
          and a.seat_id = s.id
          and b.scheduled_start < v_scheduled_end
          and b.scheduled_end > p_scheduled_start
      )
    )
  order by r.id, s.seat_number
  limit 50;
end;
$$;

commit;

