-- BookFlow Pro - Booking/Calendar production hardening RPCs

begin;

create or replace function public.list_bookings_in_range(
  p_start timestamptz,
  p_end timestamptz,
  p_status text default null
)
returns table (
  booking_id uuid,
  booking_reference text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  notes text,
  status_name text,
  customer_name text,
  customer_email text,
  service_name text
)
language sql
security definer
set search_path = public
as $$
  with item_with_service as (
    select distinct on (bi.booking_id)
      bi.booking_id,
      s.name as service_name
    from public.booking_items bi
    left join public.services s
      on s.id = bi.service_id
    where bi.tenant_id = public.current_tenant_id()
    order by bi.booking_id, bi.id
  )
  select
    b.id as booking_id,
    b.booking_reference,
    b.scheduled_start,
    b.scheduled_end,
    b.notes,
    bs.name as status_name,
    c.full_name as customer_name,
    c.email as customer_email,
    iws.service_name
  from public.bookings b
  join public.booking_statuses bs
    on bs.id = b.status_id
  left join public.customers c
    on c.id = b.customer_id
  left join item_with_service iws
    on iws.booking_id = b.id
  where b.tenant_id = public.current_tenant_id()
    and b.scheduled_start >= p_start
    and b.scheduled_start < p_end
    and (p_status is null or bs.name = p_status)
  order by b.scheduled_start asc;
$$;

create or replace function public.get_booking_detail(
  p_booking_id uuid
)
returns table (
  booking_id uuid,
  booking_reference text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  notes text,
  status_name text,
  customer_name text,
  customer_email text,
  service_name text,
  branch_name text
)
language sql
security definer
set search_path = public
as $$
  select
    b.id as booking_id,
    b.booking_reference,
    b.scheduled_start,
    b.scheduled_end,
    b.notes,
    bs.name as status_name,
    c.full_name as customer_name,
    c.email as customer_email,
    s.name as service_name,
    br.name as branch_name
  from public.bookings b
  join public.booking_statuses bs on bs.id = b.status_id
  left join public.customers c on c.id = b.customer_id
  left join public.branches br on br.id = b.branch_id
  left join public.booking_items bi on bi.booking_id = b.id
  left join public.services s on s.id = bi.service_id
  where b.tenant_id = public.current_tenant_id()
    and b.id = p_booking_id
  order by bi.id asc
  limit 1;
$$;

create or replace function public.cancel_booking(
  p_booking_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_cancelled_status_id uuid;
  v_booking record;
begin
  if v_tenant_id is null then
    raise exception 'Tenant not resolved for current auth user.';
  end if;

  select b.*
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.tenant_id = v_tenant_id
  limit 1;

  if v_booking.id is null then
    raise exception 'Booking not found.';
  end if;

  select bs.id into v_cancelled_status_id
  from public.booking_statuses bs
  where bs.tenant_id = v_tenant_id
    and bs.name = 'Cancelled'
  limit 1;

  if v_cancelled_status_id is null then
    raise exception 'Cancelled status is not configured.';
  end if;

  update public.bookings
  set status_id = v_cancelled_status_id,
      notes = coalesce(v_booking.notes, '') || case when p_reason is null or btrim(p_reason) = '' then '' else E'\n[Cancellation Reason] ' || p_reason end,
      updated_at = now()
  where id = v_booking.id;

  insert into public.booking_events (
    tenant_id, booking_id, event_type, actor_user_id, event_data
  )
  values (
    v_tenant_id, v_booking.id, 'Cancelled', auth.uid(),
    jsonb_build_object('reason', p_reason)
  );

  insert into public.audit_log (
    tenant_id, actor_user_id, entity_name, entity_id, action, before_data, after_data
  )
  values (
    v_tenant_id,
    auth.uid(),
    'booking',
    v_booking.id,
    'Cancelled',
    jsonb_build_object('status_id', v_booking.status_id),
    jsonb_build_object('status_id', v_cancelled_status_id, 'reason', p_reason)
  );

  return v_booking.id;
end;
$$;

create or replace function public.reschedule_booking(
  p_booking_id uuid,
  p_new_start timestamptz,
  p_new_end timestamptz,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_booking record;
begin
  if v_tenant_id is null then
    raise exception 'Tenant not resolved for current auth user.';
  end if;
  if p_new_end <= p_new_start then
    raise exception 'p_new_end must be after p_new_start.';
  end if;

  select b.*
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.tenant_id = v_tenant_id
  limit 1;

  if v_booking.id is null then
    raise exception 'Booking not found.';
  end if;

  update public.bookings
  set scheduled_start = p_new_start,
      scheduled_end = p_new_end,
      notes = coalesce(v_booking.notes, '') || case when p_reason is null or btrim(p_reason) = '' then '' else E'\n[Reschedule Reason] ' || p_reason end,
      updated_at = now()
  where id = v_booking.id;

  update public.booking_items
  set scheduled_start = p_new_start,
      scheduled_end = p_new_end
  where tenant_id = v_tenant_id
    and booking_id = v_booking.id;

  update public.allocations
  set allocated_at = p_new_start
  where tenant_id = v_tenant_id
    and booking_item_id in (
      select bi.id
      from public.booking_items bi
      where bi.tenant_id = v_tenant_id
        and bi.booking_id = v_booking.id
    );

  insert into public.booking_events (
    tenant_id, booking_id, event_type, actor_user_id, event_data
  )
  values (
    v_tenant_id, v_booking.id, 'Rescheduled', auth.uid(),
    jsonb_build_object(
      'old_start', v_booking.scheduled_start,
      'old_end', v_booking.scheduled_end,
      'new_start', p_new_start,
      'new_end', p_new_end,
      'reason', p_reason
    )
  );

  insert into public.audit_log (
    tenant_id, actor_user_id, entity_name, entity_id, action, before_data, after_data
  )
  values (
    v_tenant_id,
    auth.uid(),
    'booking',
    v_booking.id,
    'Rescheduled',
    jsonb_build_object('scheduled_start', v_booking.scheduled_start, 'scheduled_end', v_booking.scheduled_end),
    jsonb_build_object('scheduled_start', p_new_start, 'scheduled_end', p_new_end, 'reason', p_reason)
  );

  return v_booking.id;
end;
$$;

grant execute on function public.list_bookings_in_range(timestamptz, timestamptz, text) to authenticated;
grant execute on function public.get_booking_detail(uuid) to authenticated;
grant execute on function public.cancel_booking(uuid, text) to authenticated;
grant execute on function public.reschedule_booking(uuid, timestamptz, timestamptz, text) to authenticated;

commit;

