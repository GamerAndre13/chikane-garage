import { createClient } from "@supabase/supabase-js";

export function createPaymentAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("A confirmação de pagamentos ainda não está configurada.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function secureEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
