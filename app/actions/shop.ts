"use server";

import { createClient } from "@/lib/supabase/server";
import { escapeShopEmailText, sendShopEmail, shopEmailHtml } from "@/lib/shop-mail";
import { createPaymentAdminClient } from "@/lib/shop-payment";

type OrderItemInput = { variant_id: string; quantity: number };
type CheckoutInput = { items: OrderItemInput[]; customer: Record<string, FormDataEntryValue>; paymentMethod: string; couponCode?: string };
type OrderResult = { order_id: string; order_number: string; access_token: string; total: number; on_request_shipping?: boolean };

export async function createShopOrder(input: CheckoutInput): Promise<{ error?: string; redirectUrl?: string; orderToken?: string }> {
  let pending: { supabase: Awaited<ReturnType<typeof createClient>>; order: OrderResult } | null = null;
  let providerCreated = false;
  try {
    if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50) return { error: "O carrinho está vazio ou tem demasiados artigos." };
    if (!input.items.every((item) => /^[0-9a-f-]{36}$/i.test(item.variant_id) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99)) return { error: "Confirma as quantidades no carrinho." };
    if (!new Set(["card", "mb_way"]).has(input.paymentMethod)) return { error: "Escolhe um método de pagamento válido." };

    const text = (key: string) => String(input.customer[key] ?? "").trim();
    const customerName = text("customer_name");
    const email = text("customer_email").toLowerCase();
    const phone = text("customer_phone");
    const address = text("shipping_line1");
    const city = text("shipping_city");
    const postal = text("shipping_postal_code");
    if (customerName.length < 2 || customerName.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || phone.length < 6 || phone.length > 30 || address.length < 3 || address.length > 160 || city.length < 2 || city.length > 100 || postal.length < 3 || postal.length > 20) return { error: "Confirma o nome, email, telemóvel e morada." };
    if (input.paymentMethod === "mb_way" && phone.replace(/\D/g, "").length < 9) return { error: "Indica um número de telemóvel válido para receber o pedido MB WAY." };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const paymentAdmin = createPaymentAdminClient();
    const customer = {
      customer_name: customerName,
      customer_email: email,
      customer_phone: phone,
      nif: text("nif").slice(0, 20),
      shipping_name: text("shipping_name").slice(0, 120) || customerName,
      shipping_phone: text("shipping_phone").slice(0, 30) || phone,
      shipping_line1: address,
      shipping_line2: text("shipping_line2").slice(0, 160),
      shipping_city: city,
      shipping_postal_code: postal,
      shipping_country: text("shipping_country").toUpperCase() || "PT",
      billing_same_as_shipping: true,
      billing_name: text("shipping_name").slice(0, 120) || customerName,
      billing_line1: address,
      billing_line2: text("shipping_line2").slice(0, 160),
      billing_city: city,
      billing_postal_code: postal,
      billing_country: text("shipping_country").toUpperCase() || "PT",
      customer_note: text("customer_note").slice(0, 1000),
      user_id: user?.id ?? null,
    };
    const { data, error } = await paymentAdmin.rpc("place_order", {
      p_items: input.items,
      p_customer: customer,
      p_payment_method: input.paymentMethod,
      p_coupon_code: input.couponCode?.trim().slice(0, 64) || null,
    });
    if (error || !data) return { error: "Não foi possível criar a encomenda. Confirma o carrinho e tenta novamente." };
    const order = data as OrderResult;
    if (!order.order_id || !order.access_token || !Number.isFinite(Number(order.total))) return { error: "Não foi possível confirmar os dados da encomenda." };
    pending = { supabase, order };
    if (order.on_request_shipping) {
      await paymentAdmin.rpc("cancel_order", { p_order_id: order.order_id, p_access_token: order.access_token, p_reason: "Portes a confirmar" });
      return { error: "Ainda não conseguimos calcular os portes para este destino ou peso. Contacta a garagem para confirmar a entrega." };
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://chikanegarage.blog").replace(/\/$/, "");
    const receiptPath = `/encomenda/${order.access_token}`;
    let redirectUrl: string;
    let providerReference: string;

    if (input.paymentMethod === "card") {
      const secret = process.env.STRIPE_SECRET_KEY;
      if (!secret) return await cancelCreatedOrder(paymentAdmin, order, "O pagamento por cartão ainda não está configurado.");
      const body = new URLSearchParams({
        mode: "payment",
        "payment_method_types[0]": "card",
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "eur",
        "line_items[0][price_data][unit_amount]": String(Math.round(Number(order.total) * 100)),
        "line_items[0][price_data][product_data][name]": `Encomenda Chikane ${order.order_number}`,
        success_url: `${siteUrl}${receiptPath}?pagamento=confirmado&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}${receiptPath}?pagamento=cancelado`,
        client_reference_id: order.order_id,
        customer_email: email,
        "metadata[order_id]": order.order_id,
        "metadata[access_token]": order.access_token,
        "payment_intent_data[metadata][order_id]": order.order_id,
        "payment_intent_data[metadata][access_token]": order.access_token,
      });
      const response = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" }, body });
      const session = await response.json() as { id?: string; url?: string; error?: { message?: string } };
      if (!response.ok || !session.id || !session.url) return await cancelCreatedOrder(paymentAdmin, order, "O pagamento por cartão não foi iniciado. Tenta novamente.");
      redirectUrl = session.url;
      providerCreated = true;
      providerReference = session.id;
      const { data: saved, error: saveError } = await paymentAdmin.rpc("set_order_payment_reference", { p_order_id: order.order_id, p_access_token: order.access_token, p_provider: "stripe", p_reference: providerReference });
      if (saveError || !saved) return await cancelCreatedOrder(paymentAdmin, order, "Não foi possível associar o pagamento à encomenda.");
    } else {
      const gatewayKey = process.env.IFTHENPAY_GATEWAY_KEY;
      const mbwayKey = process.env.IFTHENPAY_MBWAY_KEY;
      if (!gatewayKey || !mbwayKey) return await cancelCreatedOrder(paymentAdmin, order, "O pagamento MB WAY ainda não está configurado.");
      const id = order.order_number.replace(/\D/g, "").slice(-15);
      if (!id) return await cancelCreatedOrder(paymentAdmin, order, "Não foi possível preparar o pedido MB WAY.");
      const response = await fetch(`https://api.ifthenpay.com/gateway/pinpay/${encodeURIComponent(gatewayKey)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, amount: Number(order.total).toFixed(2), description: `Encomenda ${order.order_number}`, lang: "pt", accounts: `MBWAY|${mbwayKey}`, success_url: `${siteUrl}${receiptPath}?pagamento=confirmado`, cancel_url: `${siteUrl}${receiptPath}?pagamento=cancelado` }),
      });
      const payment = await response.json() as { PinCode?: string; RedirectUrl?: string };
      if (!response.ok || !payment.RedirectUrl) return await cancelCreatedOrder(paymentAdmin, order, "O pedido MB WAY não foi iniciado. Confirma o número e tenta novamente.");
      redirectUrl = payment.RedirectUrl;
      providerCreated = true;
      providerReference = id;
      const { data: saved, error: saveError } = await paymentAdmin.rpc("set_order_payment_reference", { p_order_id: order.order_id, p_access_token: order.access_token, p_provider: "ifthenpay", p_reference: providerReference });
      if (saveError || !saved) return await cancelCreatedOrder(paymentAdmin, order, "Não foi possível associar o pagamento à encomenda.");
    }

    if (user?.id) await supabase.from("addresses").insert({ user_id: user.id, label: "Principal", name: customer.shipping_name, phone: customer.shipping_phone, line1: customer.shipping_line1, line2: customer.shipping_line2, city: customer.shipping_city, postal_code: customer.shipping_postal_code, country: customer.shipping_country, is_default_shipping: true, is_default_billing: true });
    await sendShopEmail(email, `Encomenda ${order.order_number} registada`, shopEmailHtml("Encomenda registada", [
      `Olá ${escapeShopEmailText(customerName)}, recebemos a tua encomenda <strong>${escapeShopEmailText(order.order_number)}</strong>.`,
      "A encomenda só será preparada depois de o pagamento estar confirmado.",
      `Consulta o estado e o resumo da encomenda em <a href="${siteUrl}${receiptPath}" style="color:#c38a58">acompanhar encomenda</a>.`,
      `Total: <strong>${Number(order.total).toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</strong>.`,
    ]));
    return { redirectUrl, orderToken: order.access_token };
  } catch {
    if (pending && !providerCreated) {
      try { await cancelCreatedOrder(pending.supabase, pending.order, "Não foi possível iniciar o pagamento."); } catch { /* A encomenda mantém-se consultável para apoio manual. */ }
    }
    return { error: "Ocorreu um erro ao preparar o pagamento. Tenta novamente ou contacta a garagem." };
  }
}

async function cancelCreatedOrder(supabase: ReturnType<typeof createPaymentAdminClient>, order: OrderResult, message: string) {
  await supabase.rpc("cancel_order", { p_order_id: order.order_id, p_access_token: order.access_token, p_reason: message });
  return { error: message };
}
