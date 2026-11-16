import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { vehicleEmailBlock } from "@/lib/email-vehicle-block";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    console.log("RESEND_API_KEY not found in environment");
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, vehicle, vehicleSlug, vehicleImage, confirmedDate } = body;

    if (!email || !confirmedDate) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const resend = getResend();
    if (!resend) {
      return NextResponse.json({ error: "Serviço de email indisponível" }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    // Link direto para o anúncio da viatura (se o slug vier do back office).
    const vehicleUrl = vehicleSlug
      ? `${siteUrl.replace(/\/$/, "")}/usados/${vehicleSlug}`
      : null;
    // Date-only ("2026-10-11") é tratada a partir das 10:00 (hora de Lisboa);
    // datas completas são interpretadas como UTC.
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(confirmedDate);
    const formattedDate = isDateOnly
      ? new Date(`${confirmedDate}T10:00:00`).toLocaleString("pt-PT", {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: "Europe/Lisbon",
        })
      : new Date(confirmedDate).toLocaleString("pt-PT", {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: "Europe/Lisbon",
        });

    const html = `
      <!DOCTYPE html>
      <html lang="pt">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Test-drive confirmado</title>
        </head>
        <body style="margin:0;padding:20px;background-color:#0a0a0a;font-family:Arial,Helvetica,sans-serif">
          <div style="max-width:600px;margin:0 auto;background:#111;border:1px solid #222;border-radius:12px;padding:30px">
            <h1 style="margin:0 0 4px;color:#fff;font-size:24px;text-transform:uppercase;letter-spacing:2px">
              Chikane <span style="color:#f47724">Garage</span>
            </h1>
            <p style="margin:0 0 24px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:3px">Garagem · Catálogo · Comunidade</p>

            <p style="margin:0 0 12px;color:#ccc;font-size:16px;line-height:1.6">Olá${name ? " " + name : ""},</p>

            <p style="margin:0 0 16px;color:#ccc;font-size:15px;line-height:1.7">
              O teu pedido de <strong style="color:#fff">test-drive</strong> foi confirmado.
            </p>

            ${vehicle ? `<p style="margin:0 0 16px;color:#ccc;font-size:14px;line-height:1.7">Viatura: <strong style="color:#fff">${vehicle}</strong></p>` : ""}
            ${vehicleEmailBlock({ url: vehicleUrl, imageUrl: vehicleImage, name: vehicle })}

            <div style="margin:20px 0;padding:16px;background:#1a1a1a;border:1px solid #222;border-radius:8px">
              <p style="margin:0;color:#ccc;font-size:14px;line-height:1.7">Data e hora confirmadas:</p>
              <p style="margin:8px 0 0;color:#fff;font-size:16px;line-height:1.6;font-weight:bold">${formattedDate}</p>
            </div>

            <p style="margin:0 0 20px;color:#888;font-size:13px;line-height:1.7">
              Se tiveres alguma dúvida, responde a este email ou contacta-nos através do site.
            </p>

            <p style="margin:0;padding-top:16px;border-top:1px solid #333;color:#666;font-size:12px;line-height:1.6">
              © Chikane Garage. Todos os direitos reservados.<br/>
              <a href="${siteUrl}" style="color:#888;text-decoration:underline">${siteUrl}</a>
            </p>
          </div>
        </body>
      </html>
    `;

    await resend.emails.send({
      from: "Chikane Garage <no-reply@chikanegarage.blog>",
      to: email,
      subject: "Test-drive confirmado — Chikane Garage",
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao enviar email de test-drive:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
