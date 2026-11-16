import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { vehicleEmailBlock } from "@/lib/email-vehicle-block";

// Notificação das propostas de viaturas novas.
// Envia para os emails configurados em /admin/definicoes e para o cliente.
// A proposta é sempre guardada na BD pelo cliente antes deste pedido — uma
// falha de email nunca a invalida.

const FROM = "Chikane Garage <propostas@chikanegarage.blog>";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    console.log("RESEND_API_KEY em falta — emails de propostas não enviados");
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

type ProposalExtra = {
  name?: string;
  variant_name?: string | null;
  price?: number;
};

type ProposalPayload = {
  proposal_id?: string | null;
  name?: string;
  email?: string;
  phone?: string;
  nif?: string;
  message?: string;
  base_price?: number | null;
  extras_total?: number;
  total_price?: number | null;
  selected_extras?: ProposalExtra[];
  vehicle_name?: string;
  vehicle_slug?: string;
  vehicle_image?: string | null;
};

const euro = (value?: number | null) =>
  value == null ? "Sob consulta" : `${Number(value).toLocaleString("pt-PT")} €`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function splitEmails(raw?: string | null): string[] {
  return String(raw || "")
    .split(/[,;\s]+/)
    .map((value) => value.trim())
    .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

function extrasHtml(extras: ProposalExtra[]): string {
  if (!extras.length) return "<p style='color:#888;margin:0;'>Sem extras selecionados.</p>";
  return `<ul style="margin:0;padding-left:18px;color:#ccc;font-size:14px;line-height:1.7;">
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
    const payload = (await request.json()) as ProposalPayload;

    if (!payload?.name || !payload?.email || !payload?.nif) {
      return NextResponse.json({ error: "Dados da proposta incompletos." }, { status: 400 });
    }

    // Definições do site (leitura pública) — emails a notificar.
    let settings: { email?: string | null; proposal_notify_emails?: string | null } | null = null;
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("site_settings")
        .select("email, proposal_notify_emails")
        .limit(1)
        .maybeSingle();
      settings = data || null;
    } catch {
      settings = null;
    }

    const owners = splitEmails(settings?.proposal_notify_emails);
    if (!owners.length && settings?.email) owners.push(...splitEmails(settings.email));

    const resend = getResend();
    if (!resend) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const vehicleName = escapeHtml(String(payload.vehicle_name || "Viatura nova"));
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
    const vehicleUrl = siteUrl && payload.vehicle_slug ? `${siteUrl}/usados/${payload.vehicle_slug}` : null;
    // Link direto para a proposta no backoffice (email ao gestor).
    const proposalUrl = siteUrl && payload.proposal_id ? `${siteUrl}/admin/propostas/${payload.proposal_id}` : null;
    const extras = Array.isArray(payload.selected_extras) ? payload.selected_extras : [];
    // Total sempre com o valor da viatura incluído — mesmo quando o pedido só
    // traz base + extras (propostas antigas ou falha de cálculo no cliente).
    const basePrice = payload.base_price != null ? Number(payload.base_price) : null;
    const extrasTotal = Number(payload.extras_total || 0);
    const totalPrice =
      payload.total_price != null
        ? Number(payload.total_price)
        : basePrice != null
          ? basePrice + extrasTotal
          : null;
    const vehicleBlock = vehicleEmailBlock({
      url: vehicleUrl,
      imageUrl: payload.vehicle_image || null,
      name: payload.vehicle_name || "Viatura nova",
    });

    const internalHtml = `
<!DOCTYPE html>
<html><body style="margin:0;padding:20px;background:#0a0a0a;font-family:Arial,sans-serif;">
  <div style="max-width:620px;margin:0 auto;background:#111;border-radius:12px;padding:28px;">
    <p style="margin:0;color:#f47724;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Chikane Garage</p>
    <h1 style="margin:8px 0 18px;color:#fff;font-size:22px;text-transform:uppercase;letter-spacing:1px;">Nova proposta · ${vehicleName}</h1>
    ${vehicleBlock}
    <table style="width:100%;border-collapse:collapse;color:#ccc;font-size:14px;">
      <tr><td style="padding:6px 0;color:#888;">Cliente</td><td style="padding:6px 0;text-align:right;color:#fff;">${escapeHtml(String(payload.name))}</td></tr>
      <tr><td style="padding:6px 0;color:#888;">Email</td><td style="padding:6px 0;text-align:right;color:#fff;">${escapeHtml(String(payload.email))}</td></tr>
      <tr><td style="padding:6px 0;color:#888;">Telefone</td><td style="padding:6px 0;text-align:right;color:#fff;">${escapeHtml(String(payload.phone || "—"))}</td></tr>
      <tr><td style="padding:6px 0;color:#888;">NIF</td><td style="padding:6px 0;text-align:right;color:#fff;">${escapeHtml(String(payload.nif))}</td></tr>
    </table>
    <h2 style="margin:24px 0 10px;color:#fff;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Extras</h2>
    ${extrasHtml(extras)}
    <table style="width:100%;border-collapse:collapse;color:#ccc;font-size:14px;margin-top:18px;border-top:1px solid #333;">
      <tr><td style="padding:8px 0;color:#888;">Preço base</td><td style="padding:8px 0;text-align:right;color:#fff;">${euro(basePrice)}</td></tr>
      <tr><td style="padding:8px 0;color:#888;">Extras</td><td style="padding:8px 0;text-align:right;color:#fff;">${euro(extrasTotal)}</td></tr>
      <tr><td style="padding:8px 0;color:#f47724;font-weight:bold;">Total</td><td style="padding:8px 0;text-align:right;color:#f47724;font-weight:bold;font-size:18px;">${euro(totalPrice)}</td></tr>
    </table>
    ${
      payload.message
        ? `<div style="margin-top:20px;padding:14px;background:#1a1a1a;border-radius:8px;color:#ccc;font-size:14px;line-height:1.6;">${escapeHtml(String(payload.message))}</div>`
        : ""
    }
    ${
      proposalUrl
        ? `<a href="${proposalUrl}" style="display:inline-block;margin-top:22px;padding:12px 20px;background:#f47724;color:#000;text-decoration:none;font-size:13px;font-weight:bold;border-radius:4px;">Abrir a proposta no backoffice</a>
           <p style="margin-top:10px;color:#666;font-size:12px;word-break:break-all;">${proposalUrl}</p>`
        : `<p style="margin-top:22px;color:#666;font-size:12px;">Gerir em ${siteUrl}/admin/propostas</p>`
    }
  </div>
</body></html>`;

    const customerHtml = `
<!DOCTYPE html>
<html><body style="margin:0;padding:20px;background:#0a0a0a;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#111;border-radius:12px;padding:28px;">
    <h1 style="margin:0 0 10px;color:#fff;font-size:22px;text-transform:uppercase;letter-spacing:2px;">Chikane <span style="color:#f47724;">Garage</span></h1>
    <p style="color:#ccc;font-size:15px;line-height:1.7;">Olá ${escapeHtml(String(payload.name))},</p>
    <p style="color:#ccc;font-size:15px;line-height:1.7;">Recebemos o teu pedido de proposta para a <strong style="color:#fff;">${vehicleName}</strong>. Vamos analisar a configuração e contactar-te brevemente com todos os detalhes.</p>
    ${vehicleBlock}
    <h2 style="margin:26px 0 10px;color:#fff;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Resumo da configuração</h2>
    <table style="width:100%;border-collapse:collapse;color:#ccc;font-size:14px;">
      <tr><td style="padding:8px 0;color:#888;">Preço da viatura</td><td style="padding:8px 0;text-align:right;color:#fff;">${euro(basePrice)}</td></tr>
      <tr><td style="padding:8px 0;color:#888;">Extras</td><td style="padding:8px 0;text-align:right;color:#fff;">${euro(extrasTotal)}</td></tr>
    </table>
    ${extrasHtml(extras)}
    <p style="margin:16px 0 0;padding-top:14px;border-top:1px solid #333;color:#f47724;font-size:18px;font-weight:bold;">Total indicativo: ${euro(totalPrice)}</p>
    <p style="color:#888;font-size:13px;line-height:1.6;margin-top:16px;">Valores sem custos de legalização. Confirmamos tudo contigo antes de qualquer compromisso.</p>
    <div style="margin-top:26px;padding-top:18px;border-top:1px solid #333;">
      <p style="color:#666;font-size:12px;margin:0;">© ${new Date().getFullYear()} Chikane Garage.</p>
    </div>
  </div>
</body></html>`;

    const errors: string[] = [];

    // 1. Notificação interna
    if (owners.length) {
      const result = await resend.emails.send({
        from: FROM,
        to: owners,
        subject: `Nova proposta · ${payload.vehicle_name || "Viatura nova"} · ${payload.name}`,
        html: internalHtml,
        replyTo: payload.email,
      });
      if (result.error) errors.push(`interna: ${result.error.message}`);
    }

    // 2. Confirmação ao cliente
    const confirmation = await resend.emails.send({
      from: FROM,
      to: String(payload.email),
      subject: `Proposta recebida · ${payload.vehicle_name || "Chikane Garage"}`,
      html: customerHtml,
    });
    if (confirmation.error) errors.push(`cliente: ${confirmation.error.message}`);

    if (errors.length) console.error("Falhas ao enviar emails de proposta:", errors);
    return NextResponse.json({ success: true, errors });
  } catch (error) {
    console.error("Proposta — erro ao notificar:", error);
    return NextResponse.json({ error: "Erro ao notificar a proposta." }, { status: 500 });
  }
}
