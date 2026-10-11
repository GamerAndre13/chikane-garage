import { createClient } from "@/lib/supabase/server";

/**
 * Devolve a "available" qualquer viatura que esteja "reserved" há mais de
 * 7 dias (reserved_until vencido). Falha em silêncio para nunca bloquear
 * as páginas — usa RPC SECURITY DEFINER (migração 016).
 * Chamar antes de ler catálogo/home/ficha de viatura.
 */
export async function expireReservations(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.rpc("expire_reservations");
  } catch {
    // Migração 016 ainda não corrida no SQL Editor — sem efeito.
  }
}