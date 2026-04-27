import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client (Server Side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_DATA_API!,
  process.env.SERVICE_ROLE_KEY! // Use Service Role for bypass RLS on upload
);

export {supabase}