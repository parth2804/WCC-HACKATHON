// ==========================================================================
// SUPABASE CLIENT INITIALIZATION
// ==========================================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://eelmsapppbhkgzmlezed.supabase.co";
const SUPABASE_KEY = "sb_publishable_57yF4bCXM_YDEuQxPHmZyw_kfjl49jd";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Supabase client initialized successfully.");
