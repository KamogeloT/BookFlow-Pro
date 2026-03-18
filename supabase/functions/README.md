# Supabase Functions (Phase 1)

- `notification-dispatcher.ts`: queued notification worker stub.

Next steps (not implemented here):
- Wire email/SMS provider SDK
- Deploy the function to Supabase and schedule it via cron/trigger
- Add concurrency-safe claiming (e.g., update-if-status-queued with row locking)

