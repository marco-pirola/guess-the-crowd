/**
 * Data-access facade. Every route/component imports from here, never from a
 * specific backend file. Swapping the MVP's local JSON store for real
 * Supabase later is a one-line change: point this export at a new
 * `supabaseStore.ts` that implements the same function signatures against
 * the schema in supabase/schema.sql.
 */
export * from "@/lib/store/localFileStore";
