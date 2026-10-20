import { NextResponse } from "next/server";
import { createPaymentAdminClient, secureEqual } from "@/lib/shop-payment";
import { escapeShopEmailText, sendShopEmail, shopEmailHtml } from "@/lib/shop-mail";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const expectedKey = process.env.IFTHENPAY_CALLBACK_KEY || "";
  const suppliedKey = url.searchParams.get("key") || "";
  const reference = url.searchParams.get("id") || "";
  const amount = Number(url.searchParams.get("amount"));
  if (!expectedKey || !secureEqual(suppliedKey, expectedKey) || !reference || !Number.isFinite(amount) || amount <= 0) return new NextResponse("Pedido inválido", { status: 400 });
  const admin = createPaymentAdminClient();
  const { data: order } = await admin.from("orders").select("total,payment_status,order_number,customer_name,customer_email,access_token").eq("payment_reference", reference).eq("payment_provider", "ifthenpay").maybeSingle();
  if (!order) return new NextResponse("Encomenda não encontrada", { status: 404 });
  if (Math.round(amount * 100) !== Math.round(Number(order.total) * 100)) return new NextResponse("Valor inválido", { status: 400 });
  const { data: marked, error } = await admin.rpc("mark_order_paid", { p_reference: reference, p_provider: "ifthenpay" });
  if (error) return new NextResponse("Erro ao registar pagamento", { status: 500 });
  if (marked) {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://chikanegarage.blog").replace(/\/$/, "");
    const receiptUrl = `${siteUrl}/encomenda/${order.access_token}`;
    await sendShopEmail(order.customer_email, `Pagamento recebido — encomenda ${order.order_number}`, shopEmailHtml("Pagamento confirmado", [`Olá ${escapeShopEmailText(order.customer_name)}, confirmámos o pagamento de <strong>${Number(order.total).toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</strong> da encomenda <strong>${escapeShopEmailText(order.order_number)}</strong>.`, `Consulta o estado em <a href="${receiptUrl}" style="color:#c38a58">acompanhar encomenda</a>.` ]));
  }
  return new NextResponse("OK", { status: 200 });
}
