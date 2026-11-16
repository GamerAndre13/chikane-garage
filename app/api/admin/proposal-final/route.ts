import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { canManageSales } from "@/lib/roles";
import {
  calcularTotaisProposta,
  DISCOUNT_SCOPE_LABELS,
  normalizarAmbito,
} from "@/lib/proposal-pricing";

// Envio da proposta final ao cliente (item 5).
// O vendedor já contactou o cliente e fechou os valores; este email serve
// apenas como comprovativo visual e registo do que foi combinado. Por isso
// não tem botão nem link de compra — a negociação acontece no contacto
// directo com o vendedor.
// A gravação na BD é feita pelo ecrã antes do pedido — uma falha de email
// nunca faz perder os valores da proposta.

const FROM = "Chikane Garage <propostas@chikanegarage.blog>";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    console.log("RESEND_API_KEY em falta — proposta final não enviada");
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

type ProposalExtra = {
  name?: string;
  variant_name?: string | null;
  price?: number;
};

const euro = (value?: number | null) =>
  value == null ? "Sob consulta" : `${Number(value).toLocaleString("pt-PT")} €`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function extrasHtml(extras: ProposalExtra[]): string {
  if (!extras.length) return "<p style='color:#888;margin:0;'>Sem extras selecionados.</p>";
  return `<ul style="margin:0;padding-left:18px;color:#ccc;font-size:14px;line-height:1.8;">
    ${extras
      .map(
        (extra) =>
          `<li>${escapeHtml(String(extra.name || "Extra"))}${
            extra.variant_name ? ` — ${escapeHtml(String(extra.variant_name))}` : ""
          } · ${euro(extra.price)}</li>`
      )
      .join("")}
  </ul>`;
}

export async function POST(request: NextRequest) {
  try {
    // O proxy só protege páginas: cada rota de API re-verifica a sessão.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !canManageSales(profile.role)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = (await request.json()) as { proposal_id?: string };
    const proposalId = String(body?.proposal_id || "").trim();
    if (!proposalId) {
      return NextResponse.json({ error: "Proposta em falta" }, { status: 400 });
    }

    const { data: proposal } = await supabase
      .from("sale_proposals")
      .select("*")
      .eq("id", proposalId)
      .maybeSingle();
    if (!proposal) {
      return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
    }
    if (!proposal.email) {
      return NextResponse.json({ error: "A proposta não tem email de cliente" }, { status: 400 });
    }

    let vehicle: {
      brand: string | null;
      model: string | null;
      trim: string | null;
      slug: string;
      cover_image_url: string | null;
    } | null = null;
    if (proposal.vehicle_id) {
      const { data: v } = await supabase
        .from("vehicles")
        .select("brand, model, trim, slug, cover_image_url")
        .eq("id", proposal.vehicle_id)
        .maybeSingle();
      vehicle = v ?? null;
    }

    const resend = getResend();
    if (!resend) {
      return NextResponse.json({ error: "Serviço de email indisponível" }, { status: 500 });
    }

    const vehicleName = vehicle
      ? [vehicle.brand, vehicle.model, vehicle.trim].filter(Boolean).join(" ")
      : "Viatura nova";

    // Referência curta e data da proposta para o cliente poder identificá-la
    // numa conversa com o vendedor.
    const reference = String(proposal.id || "").slice(0, 8).toUpperCase();
    const proposalDate = proposal.created_at
      ? new Date(proposal.created_at).toLocaleDateString("pt-PT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : null;

    const extras = Array.isArray(proposal.selected_extras) ? (proposal.selected_extras as ProposalExtra[]) : [];
    const basePrice = proposal.base_price != null ? Number(proposal.base_price) : null;
    const extrasTotal = Number(proposal.extras_total || 0);
    const discount = Number(proposal.discount || 0);
    const discountScope = normalizarAmbito(proposal.discount_scope);
    const legalization = Number(proposal.legalization_fee || 0);
    const calculados = calcularTotaisProposta({
      basePrice,
      extrasTotal,
      discount,
      legalization,
      scope: discountScope,
    });
    // O valor gravado manda (se existir), mas o desconto mostrado é o que
    // efetivamente coube no âmbito escolhido.
    const finalPrice = proposal.final_price != null ? Number(proposal.final_price) : calculados.finalPrice;
    const appliedDiscount = calculados.appliedDiscount;

    const html = `
<!DOCTYPE html>
<html><body style="margin:0;padding:20px;background:#0a0a0a;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#111;border-radius:12px;padding:28px;">
    <h1 style="margin:0 0 10px;color:#fff;font-size:22px;text-transform:uppercase;letter-spacing:2px;">Chikane <span style="color:#f47724;">Garage</span></h1>
    <p style="color:#ccc;font-size:15px;line-height:1.7;">Olá ${escapeHtml(String(proposal.name))},</p>
    <p style="color:#ccc;font-size:15px;line-height:1.7;">O nosso vendedor já falou contigo e esta é a <strong style="color:#fff;">proposta combinada</strong> para a <strong style="color:#fff;">${escapeHtml(vehicleName)}</strong>. Este email serve apenas como comprovativo e registo dos valores acordados — não precisas de fazer nada com ele.</p>
    ${
      vehicle?.cover_image_url
        ? `<img src="${escapeHtml(vehicle.cover_image_url)}" alt="${escapeHtml(vehicleName)}" style="width:100%;max-height:280px;object-fit:cover;display:block;margin:18px 0;border-radius:10px;border:1px solid #222;" />`
        : ""
    }
    <h2 style="margin:26px 0 10px;color:#fff;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Configuração</h2>
    ${extrasHtml(extras)}
    <table style="width:100%;border-collapse:collapse;color:#ccc;font-size:14px;margin-top:18px;border-top:1px solid #333;">
      <tr><td style="padding:6px 0;color:#888;">Preço da viatura</td><td style="padding:6px 0;text-align:right;color:#fff;">${euro(basePrice)}</td></tr>
      <tr><td style="padding:6px 0;color:#888;">Extras</td><td style="padding:6px 0;text-align:right;color:#fff;">${euro(extrasTotal)}</td></tr>
      ${
        appliedDiscount > 0
          ? `<tr><td style="padding:6px 0;color:#888;">Desconto · ${DISCOUNT_SCOPE_LABELS[discountScope]}</td><td style="padding:6px 0;text-align:right;color:#22c55e;">− ${euro(appliedDiscount)}</td></tr>`
          : ""
      }
      ${
        legalization > 0
          ? `<tr><td style="padding:6px 0;color:#888;">Legalização</td><td style="padding:6px 0;text-align:right;color:#fff;">${euro(legalization)}</td></tr>`
          : ""
      }
      <tr><td style="padding:12px 0 0;border-top:1px solid #333;color:#f47724;font-weight:bold;">Total final</td><td style="padding:12px 0 0;border-top:1px solid #333;text-align:right;color:#f47724;font-weight:bold;font-size:20px;">${euro(finalPrice)}</td></tr>
    </table>
    <p style="margin-top:18px;padding-top:14px;border-top:1px solid #333;color:#888;font-size:12px;line-height:1.7;">
      Referência da proposta: <strong style="color:#ccc;">#${escapeHtml(reference)}</strong>${proposalDate ? ` &middot; ${escapeHtml(proposalDate)}` : ""}.<br />
      Se algum valor não corresponder ao que combinaste com o vendedor, responde a este email ou contacta-nos.
    </p>
    <div style="margin-top:26px;padding-top:18px;border-top:1px solid #333;">
      <p style="color:#666;font-size:12px;margin:0;">© ${new Date().getFullYear()} Chikane Garage.</p>
    </div>
  </div>
</body></html>`;

    const result = await resend.emails.send({
      from: FROM,
      to: String(proposal.email),
      subject: `Proposta combinada · ${vehicleName} · ${euro(finalPrice)}`,
      html,
    });
    if (result.error) {
      console.error("Proposta final — falha no envio:", result.error.message);
      return NextResponse.json({ error: "Não foi possível enviar o email." }, { status: 502 });
    }

    // Regista a data do envio (RLS da 035 já permite admin e gestor de vendas).
    const { error: updateError } = await supabase
      .from("sale_proposals")
      .update({ final_sent_at: new Date().toISOString(), status: "proposal_sent" })
      .eq("id", proposalId);
    if (updateError) {
      console.error("Proposta final — email enviado mas data não gravada:", updateError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Proposta final — erro:", error);
    return NextResponse.json({ error: "Erro ao enviar a proposta final." }, { status: 500 });
  }
}
