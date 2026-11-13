import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Resposta do cliente a uma data proposta para o test drive.
// A alteração na base de dados é feita pela função respond_test_drive
// (SECURITY DEFINER, supabase/031_test_drive_resposta.sql): valida o token,
// aceita (fica confirmado) ou recusa (volta a pendente).
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { token?: string; action?: string } | null;
    const token = body?.token?.trim();
    const action = body?.action;

    if (!token || (action !== "accept" && action !== "reject")) {
      return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("respond_test_drive", {
      p_token: token,
      p_action: action,
    });

    if (error) {
      console.error("Erro ao responder ao test drive:", error);
      return NextResponse.json({ error: "Não foi possível registar a resposta." }, { status: 500 });
    }

    const result = data as
      | { ok?: boolean; reason?: string; action?: string; name?: string; vehicle?: string | null; vehicle_slug?: string | null }
      | null;

    if (!result?.ok) {
      const messages: Record<string, string> = {
        not_found: "Este link já não é válido.",
        no_proposal: "Esta data já não está à espera de resposta.",
        invalid_action: "Pedido inválido.",
      };
      return NextResponse.json(
        { error: messages[result?.reason || ""] || "Não foi possível registar a resposta." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Test drive — erro ao responder:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
