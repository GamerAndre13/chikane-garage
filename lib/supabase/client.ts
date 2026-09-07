import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// createBrowserClient guarda a sessão em cookies (sb-<ref>-auth-token),
// o que permite ao middleware e às server components autenticar o mesmo user.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
