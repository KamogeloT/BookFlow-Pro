# Supabase migrations

Apply migrations in order on your Supabase project (CLI: `supabase db push`, or paste SQL in the SQL editor).

| File | Purpose |
|------|---------|
| `0001_core_schema_and_rls.sql` | Core booking, resources, tenants, RLS |
| `0002_booking_rpcs.sql` | Booking + allocation RPCs |
| `0003_platform_expansion_and_sps.sql` | Platform tables, templates, webhooks, extra RPCs |
| `0004_booking_calendar_hardening.sql` | Calendar/list/cancel/reschedule RPCs |
| `0005_settings_admin_rls.sql` | **Required for settings UI:** tenant update, roles CRUD, user list, Tenant Admin role assignments |
| `0006_grants_booking_rpcs.sql` | **`EXECUTE` for authenticated** on `create_booking_with_allocation`, `get_available_resources_for_service`, `generate_booking_reference` (needed for **Bookings** + **Allocation** preview if defaults were missing) |
| `0007_create_booking_customer_name_phone.sql` | **Booking form:** extends `create_booking_with_allocation` with `p_customer_name` / `p_customer_phone` so `customers.full_name` matches the name entered in the UI (replaces the 5-arg overload). |

After adding `0005` or `0006`, redeploy or reset local DB so policies/grants match the app. Apply **`0007`** so new bookings persist the customer name from the form.

The web app (`createBookingWithAllocationCompat`) will **fall back to the 5-argument RPC** if PostgREST returns `PGRST202` (schema cache has only the pre-`0007` function). Bookings still work; name/phone are not written to `customers` until **`0007`** is applied.
