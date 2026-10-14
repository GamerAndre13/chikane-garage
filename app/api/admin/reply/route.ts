import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { vehicleEmailBlock } from "@/lib/email-vehicle-block";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    console.log("RESEND_API_KEY not found in environment");
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Mensagem livre do back office → parágrafos HTML (respeita as linhas em branco
// e converte quebras simples em <br/>).
function messageToHtml(raw: string): string {
  return raw
    .trim()
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p style="margin:0 0 16px;color:#ccc;font-size:15px;line-height:1.7">${escapeHtml(block).replace(/\n/g, "<br/>")}</p>`
    )
    .join("");
}

// Resposta do back office a um pedido (informação, test-drive ou reserva).
// Enviada a partir de no-reply@chikanegarage.blog; as respostas do cliente
// seguem para o email de contacto configurado nas definições do site.
export async function POST(request: NextRequest) {
  try {
    // Só admins podem enviar emails em nome da garagem (proxy só protege
    // páginas; cada rota de API re-verifica a sessão).
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const { to, name, subject, message, vehicle, vehicleSlug, vehicleImage } = body;

    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to))) {
      return NextResponse.json({ error: "Email do destinatário inválido" }, { status: 400 });
    }
    if (!message || String(message).trim().length < 2) {
      return NextResponse.json({ error: "Escreve a mensagem antes de enviar" }, { status: 400 });
    }
    if (String(message).length > 5000) {
      return NextResponse.json({ error: "A mensagem é demasiado longa (máx. 5000 caracteres)" }, { status: 400 });
    }

    const resend = getResend();
    if (!resend) {
      return NextResponse.json({ error: "Serviço de email indisponível" }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const vehicleUrl = vehicleSlug ? `${siteUrl.replace(/\/$/, "")}/catalogo/${vehicleSlug}` : null;

    // Respostas do cliente devem chegar à caixa da garagem, não ao no-reply.
    const { data: settings } = await supabase.from("site_settings").select("email").limit(1).maybeSingle();
    const replyTo = (settings?.email as string | undefined) || undefined;

    const greeting = name ? `Olá ${escapeHtml(String(name))},` : "Olá,";
    const cleanSubject = String(subject || "Resposta da Chikane Garage").slice(0, 180);

    const html = `
      <!DOCTYPE html>
      <html lang="pt">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(cleanSubject)}</title>
        </head>
        <body style="margin:0;padding:20px;background-color:#0a0a0a;font-family:Arial,Helvetica,sans-serif">
          <div style="max-width:600px;margin:0 auto;background:#111;border:1px solid #222;border-radius:12px;padding:30px">
            <h1 style="margin:0 0 4px;color:#fff;font-size:24px;text-transform:uppercase;letter-spacing:2px">
              Chikane <span style="color:#f47724">Garage</span>
            </h1>
            <p style="margin:0 0 24px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:3px">Garagem · Catálogo · Comunidade</p>

            <p style="margin:0 0 16px;color:#ccc;font-size:16px;line-height:1.6">${greeting}</p>

            ${messageToHtml(String(message))}

            ${vehicleEmailBlock({ url: vehicleUrl, imageUrl: vehicleImage, name: vehicle })}

            <p style="margin:0 0 20px;color:#888;font-size:13px;line-height:1.7">
              Podes responder diretamente a este email${replyTo ? "" : " ou através do site"} — teremos todo o gosto em ajudar.
            </p>

            <p style="margin:0;padding-top:16px;border-top:1px solid #333;color:#666;font-size:12px;line-height:1.6">
              © Chikane Garage. Todos os direitos reservados.<br/>
              <a href="${siteUrl}" style="color:#888;text-decoration:underline">${siteUrl}</a>
            </p>
          </div>
        </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: "Chikane Garage <no-reply@chikanegarage.blog>",
      to: String(to),
      subject: cleanSubject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });

    if (result.error) {
      console.error("Erro da API do Resend:", JSON.stringify(result.error));
      return NextResponse.json({ error: "Não foi possível enviar o email" }, { status: 502 });
    }

    return NextResponse.json({ success: true, id: result.data?.id });
  } catch (error) {
    console.error("Erro ao enviar resposta:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
