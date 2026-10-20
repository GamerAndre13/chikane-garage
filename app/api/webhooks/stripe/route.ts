import { NextResponse } from "next/server";
import { createPaymentAdminClient, secureEqual } from "@/lib/shop-payment";
import { escapeShopEmailText, sendShopEmail, shopEmailHtml } from "@/lib/shop-mail";

export const runtime = "nodejs";

async function verifySignature(payload: string, header: string, secret: string) {
  const parts = header.split(",").map((part) => part.split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 || signatures.length === 0) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const expected = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return signatures.some((signature) => secureEqual(expected, signature));
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature") || "";
  const body = await request.text();
  if (!secret || !await verifySignature(body, signature, secret)) return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try { event = JSON.parse(body); } catch { return NextResponse.json({ error: "Evento inválido." }, { status: 400 }); }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data?.object;
    const reference = typeof session?.id === "string" ? session.id : "";
    if (!reference || session?.payment_status !== "paid") return NextResponse.json({ received: true });
    const admin = createPaymentAdminClient();
    const { data: order } = await admin.from("orders").select("id,total,payment_status,order_number,customer_name,customer_email,access_token").eq("payment_reference", reference).eq("payment_provider", "stripe").maybeSingle();
    if (!order) return NextResponse.json({ error: "Encomenda não encontrada." }, { status: 404 });
    if (Number(session.amount_total) !== Math.round(Number(order.total) * 100) || session.currency !== "eur") return NextResponse.json({ error: "O valor do pagamento não corresponde à encomenda." }, { status: 400 });
    const { data: marked, error } = await admin.rpc("mark_order_paid", { p_reference: reference, p_provider: "stripe" });
    if (error) return NextResponse.json({ error: "Não foi possível registar o pagamento." }, { status: 500 });
    if (marked) {
      const receiptUrl = `${(process.env.NEXT_PUBLIC_SITE_URL || "https://chikanegarage.blog").replace(/\/$/, "")}/encomenda/${order.access_token}`;
      await sendShopEmail(order.customer_email, `Pagamento recebido — encomenda ${order.order_number}`, shopEmailHtml("Pagamento confirmado", [`Olá ${escapeShopEmailText(order.customer_name)}, confirmámos o pagamento de <strong>${Number(order.total).toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</strong> da encomenda <strong>${escapeShopEmailText(order.order_number)}</strong>.`, `Consulta o estado em <a href="${receiptUrl}" style="color:#c38a58">acompanhar encomenda</a>.` ]));
    }
  }
  if (event.type === "checkout.session.expired") {
    const session = event.data?.object;
    if (typeof session?.id === "string") {
      const admin = createPaymentAdminClient();
      await admin.rpc("cancel_pending_order_service", { p_reference: session.id, p_provider: "stripe" });
    }
  }
  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data?.object;
    if (typeof session?.id === "string") {
      const admin = createPaymentAdminClient();
      await admin.rpc("cancel_pending_order_service", { p_reference: session.id, p_provider: "stripe" });
    }
  }
  return NextResponse.json({ received: true });
}
