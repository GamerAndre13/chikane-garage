import { createClient } from "@/lib/supabase/server";

/**
 * Arquiva as viaturas vendidas há mais de 7 dias (passam a "archived" e saem
 * do catálogo público). Falha em silêncio para nunca bloquear as páginas —
 * usa a RPC SECURITY DEFINER da migração 020.
 * Chamar antes de ler catálogo/home/ficha de viatura.
 */
export async function archiveSoldVehicles(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.rpc("archive_sold_vehicles");
  } catch {
    // Migração 020 ainda não corrida no SQL Editor — sem efeito.
  }
}
