import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

const w = window as unknown as Record<string, unknown>;
const key = "__supabase_singleton__";
if (!w[key]) {
  w[key] = createClient(`https://${projectId}.supabase.co`, publicAnonKey);
}
export const supabase = w[key] as SupabaseClient;
