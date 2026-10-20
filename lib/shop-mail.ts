const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

export async function sendShopEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Chikane Garage <no-reply@chikanegarage.blog>", to: [to], subject, html }),
    });
  } catch {
    // A encomenda não depende da disponibilidade do serviço de email.
  }
}

export function shopEmailHtml(title: string, paragraphs: string[]) {
  return `<div style="background:#111;color:#eee;font-family:Arial,sans-serif;padding:32px"><div style="max-width:600px;margin:auto"><p style="color:#c38a58;font-weight:bold;letter-spacing:3px">CHIKANE GARAGE</p><h1 style="font-size:26px;text-transform:uppercase">${escapeHtml(title)}</h1>${paragraphs.map((paragraph) => `<p style="line-height:1.7;color:#ccc">${paragraph}</p>`).join("")}<p style="margin-top:32px;color:#999">Chikane Garage</p></div></div>`;
}

export { escapeHtml as escapeShopEmailText };
