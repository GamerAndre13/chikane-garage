import { Resend } from "resend";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function sendTestEmail(email: string) {
  "use server";

  // A página não está dentro de /admin (o proxy.ts não a protege), por isso a
  // ação volta a confirmar sessão e papel de administrador.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Inicia sessão para enviar o email de teste.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Apenas administradores podem enviar o email de teste.");

  const resend = new Resend(process.env.RESEND_API_KEY!);

  // Get featured vehicle
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("brand, model, trim, price, cover_image_url, slug")
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(1);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chikanegarage.blog";

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

  const result = await resend.emails.send({
    from: "Chikane Garage <newsletter@chikanegarage.blog>",
    to: email,
    subject: "Teste - Newsletter Chikane Garage",
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
        <a href="${siteUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #666; text-decoration: underline;">Cancelar subscrição</a>
      </p>
    </div>
  </div>
</body>
</html>
    `,
  });

  return { result, vehicles };
}

export default async function TestNewsletterPage() {
  // Ferramenta interna: só administradores com sessão iniciada.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/");

  return (
    <main className="min-h-screen bg-black px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-3xl font-bold text-white">
          Teste do <span className="text-copper">Newsletter</span>
        </h1>

        <div className="rounded-lg bg-zinc-900 p-6">
          <p className="mb-6 text-zinc-400">
            Esta página permite testar o envio de emails do newsletter.
            Vai enviar um email de teste para o endereço indicado com o layout
            completo: obrigado por subscrever, texto introdutório e 1 viatura
            em destaque.
          </p>

          <form
            action={async (formData) => {
              "use server";
              const email = formData.get("email") as string;
              if (!email) return;

              const { result, vehicles } = await sendTestEmail(email);
              console.log("Email result:", JSON.stringify(result, null, 2));
              console.log("Vehicles found:", vehicles?.length || 0);
            }}
            className="flex flex-col gap-4 sm:flex-row"
          >
            <input
              type="email"
              name="email"
              placeholder="Teu email de teste"
              required
              className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500"
            />
            <button
              type="submit"
              className="rounded bg-copper px-6 py-3 font-semibold text-white hover:bg-copper-light"
            >
              Enviar Teste
            </button>
          </form>
        </div>

        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">Notas:</h2>
          <ul className="list-disc space-y-2 pl-5 text-zinc-400">
            <li>
              O email é enviado através do Resend para o domínio{" "}
              <code className="text-copper">newsletter@chikanegarage.blog</code>
            </li>
            <li>
              Se o domínio não estiver verificado no Resend, o email pode ir
              para spam ou ser rejeitado
            </li>
            <li>
              O template inclui: obrigado + texto + 1 viatura em destaque da BD
            </li>
            <li>
              Verifica a consola do servidor (terminal onde corre o `next dev`)
              para ver os logs de erro
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}