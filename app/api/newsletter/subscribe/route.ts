import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

// Initialize Resend lazily to avoid build errors when API key is missing
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
    const { email } = body;

    // URL base do site: em produção o build pode não incluir NEXT_PUBLIC_SITE_URL,
    // por isso usamos a origem do próprio pedido como fallback.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    // Verifica na tabela antes de subscrever de novo (RPC SECURITY DEFINER)
    const supabase = await createClient();
    const { data: isNew, error: dbError } = await supabase.rpc("subscribe_newsletter", {
      p_email: email,
    });

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({ error: "Erro ao subscrever" }, { status: 500 });
    }

    // Já subscrito (ativo): não volta a enviar email de confirmação
    if (isNew === false) {
      return NextResponse.json({ success: true, already: true });
    }

    // Get this week's featured vehicle
    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("brand, model, trim, price, cover_image_url, slug")
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(1);

    // Build vehicles HTML
    const vehiclesHtml = vehicles?.length
      ? vehicles
          .map(
            (v) => `
        <div style="margin-bottom: 20px; padding: 15px; background: #1a1a1a; border-radius: 8px;">
          ${
            v.cover_image_url
              ? `<img src="${v.cover_image_url}" alt="${v.brand} ${v.model}" style="width: 100%; max-width: 200px; height: 120px; object-fit: cover; border-radius: 4px; margin-bottom: 10px;" />`
              : ""
          }
          <p style="margin: 0; font-size: 14px; color: #f47724; font-weight: bold; text-transform: uppercase;">${v.brand} ${v.model}</p>
          ${
            v.trim
              ? `<p style="margin: 5px 0 0; font-size: 12px; color: #888;">${v.trim}</p>`
              : ""
          }
          <p style="margin: 10px 0 0; font-size: 16px; color: #fff; font-weight: bold;">${
            v.price ? `${v.price.toLocaleString("pt-PT")} €` : "Sob consulta"
          }</p>
          <a href="${siteUrl}/catalogo/${v.slug}" style="display: inline-block; margin-top: 10px; padding: 8px 16px; background: #f47724; color: #000; text-decoration: none; font-size: 12px; font-weight: bold; border-radius: 4px;">Ver detalhes</a>
        </div>
      `
          )
          .join("")
      : "<p style='color: #888;'>De momento não temos viaturas em destaque.</p>";

    // Send confirmation email
    const resend = getResend();

    if (resend) {
      try {
        const result = await resend.emails.send({
          from: "Chikane Garage <newsletter@chikanegarage.blog>",
          to: email,
          subject: "Bem-vindo à Newsletter da Chikane Garage",
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #111; border-radius: 12px; padding: 30px;">
    <h1 style="margin: 0 0 10px; color: #fff; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">
      Chikane <span style="color: #f47724;">Garage</span>
    </h1>

    <p style="color: #ccc; font-size: 16px; line-height: 1.6;">
      Obrigado por subscrever a nossa newsletter! 🎉
    </p>

    <p style="color: #888; font-size: 14px; line-height: 1.6;">
      Serás o primeiro a saber quando entrarem novas viaturas na garagem.
      As melhores unidades saem antes de chegarem ao site.
    </p>

    <h2 style="margin: 30px 0 15px; color: #fff; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
      Em destaque esta semana
    </h2>

    ${vehiclesHtml}

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
      <p style="color: #666; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Chikane Garage. Todos os direitos reservados.<br>
        <a href="${siteUrl}/unsubscribe?email=${encodeURIComponent(
          email
        )}" style="color: #666; text-decoration: underline;">Cancelar subscrição</a>
      </p>
    </div>
  </div>
</body>
</html>
          `,
        });
        // O SDK do Resend não lança exceção em erros da API — temos de ler result.error
        if (result.error) {
          console.error("Resend API error:", JSON.stringify(result.error));
        } else {
          console.log("Email sent successfully:", result.data?.id);
        }
      } catch (emailError) {
        console.error("Email send error:", emailError);
      }
    } else {
      console.error(
        "RESEND_API_KEY em falta no ambiente - email do newsletter NAO enviado"
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Newsletter error:", error);
    return NextResponse.json(
      { error: "Erro ao processar subscrição" },
      { status: 500 }
    );
  }
}