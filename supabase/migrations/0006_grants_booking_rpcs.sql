-- Ensure Phase-1 booking RPCs are callable by authenticated clients (matches other migrations’ pattern).

begin;

grant execute on function public.create_booking_with_allocation(uuid, uuid, timestamptz, text, text) to authenticated;
grant execute on function public.get_available_resources_for_service(uuid, uuid, timestamptz) to authenticated;
grant execute on function public.generate_booking_reference(uuid, timestamptz, text, text, text) to authenticated;

commit;
