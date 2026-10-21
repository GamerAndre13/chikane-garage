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

// ----------------------------------------------------------------------------
// Pedido de encomenda de viatura nova (configurador /catalogo/<slug>/configurar):
// não há compra direta nem pagamento online. O cliente configura a viatura com
// os acessórios compatíveis e envia o pedido; a equipa contacta-o para fechar
// configuração, preço final, financiamento e entrega. Fica registado como
// encomenda sem pagamento (payment_method NULL) para o backoffice dar
// seguimento, e o cliente acompanha o percurso pelo link do comprovativo.
// ----------------------------------------------------------------------------
export type QuoteAccessoryInput = { product_id: string; variant_id?: string | null };

type QuoteRequestInput = {
  vehicleId: string;
  accessories?: QuoteAccessoryInput[];
  customer: { customer_name?: string; customer_email?: string; customer_phone?: string; customer_note?: string };
};

export async function createVehicleQuoteRequest(input: QuoteRequestInput): Promise<{ error?: string; orderToken?: string }> {
  try {
    if (typeof input?.vehicleId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.vehicleId)) return { error: "Confirma a viatura selecionada." };
    const accessories = Array.isArray(input.accessories) ? input.accessories.slice(0, 20) : [];
    if (!accessories.every((item) => typeof item?.product_id === "string" && /^[0-9a-f-]{36}$/i.test(item.product_id) && (item.variant_id == null || /^[0-9a-f-]{36}$/i.test(item.variant_id)))) return { error: "Confirma os acessórios selecionados." };
    if (new Set(accessories.map((item) => item.product_id)).size !== accessories.length) return { error: "Há acessórios repetidos na seleção." };

    const name = String(input.customer?.customer_name ?? "").trim();
    const email = String(input.customer?.customer_email ?? "").trim().toLowerCase();
    const phone = String(input.customer?.customer_phone ?? "").trim();
    const note = String(input.customer?.customer_note ?? "").trim().slice(0, 1000);
    if (name.length < 2 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || phone.length < 6 || phone.length > 30) return { error: "Confirma o nome, o email e o telemóvel." };

    const paymentAdmin = createPaymentAdminClient();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Preço e disponibilidade são sempre lidos da base de dados — o browser
    // não manda valores aqui.
    const { data: vehicle, error: vehicleError } = await paymentAdmin
      .from("vehicles")
      .select("id, slug, brand, model, trim, price, condition, status, registration_year")
      .eq("id", input.vehicleId)
      .maybeSingle();
    if (vehicleError || !vehicle) return { error: "Não foi possível confirmar a viatura. Volve a tentar ou contacta a garagem." };
    if (vehicle.condition !== "new" || vehicle.status !== "available") return { error: `A viatura ${[vehicle.brand, vehicle.model].filter(Boolean).join(" ")} já não está disponível para encomenda. Vê alternativas no catálogo.` };
    if (vehicle.price == null || !Number.isFinite(Number(vehicle.price)) || Number(vehicle.price) <= 0) return { error: "Esta viatura não tem preço publicado — pede proposta pela ficha." };

    // Acessórios: só produtos ativos, e a compatibilidade com a viatura é
    // revalidada no servidor (marca/compatibilidade declarada na loja).
    type QueriedProduct = { id: string; name: string; price: number; status: string; product_categories?: { slug?: string | null } | null; product_compatibility?: { brand?: string | null; model?: string | null; year_from?: number | null; year_to?: number | null }[] | null; product_variants?: { id: string; name: string; price_delta: number; is_active: boolean }[] | null };
    let chosen: QueriedProduct[] = [];
    if (accessories.length) {
      const { data: products, error: productsError } = await paymentAdmin
        .from("products")
        .select("id, name, price, status, product_categories(slug), product_compatibility(brand, model, year_from, year_to), product_variants(id, name, price_delta, is_active)")
        .in("id", accessories.map((item) => item.product_id));
      if (productsError || !products || products.length !== accessories.length) return { error: "Não foi possível confirmar os acessórios selecionados." };
      const brand = (vehicle.brand ?? "").trim().toLowerCase();
      const model = (vehicle.model ?? "").trim().toLowerCase();
      const year = vehicle.registration_year ?? null;
      const partCategories = new Set(["pecas-e-manutencao", "jantes-e-pneus", "extras-e-acessorios"]);
      chosen = (products as unknown as QueriedProduct[]).filter((product) => {
        if (product.status !== "active") return false;
        const compatible = brand !== "" && (product.product_compatibility ?? []).some((entry) =>
          (entry.brand ?? "").trim().toLowerCase() === brand &&
          (!(entry.model ?? "").trim() || (entry.model ?? "").trim().toLowerCase() === model) &&
          (year == null || ((entry.year_from ?? 0) <= year && (entry.year_to ?? 9999) >= year)));
        const brandMatch = brand !== "" && ((product.product_categories?.slug && partCategories.has(product.product_categories.slug)) || compatible);
        return compatible || brandMatch;
      });
      if (chosen.length !== accessories.length) return { error: "Um dos acessórios selecionados não é compatível com esta viatura. Ajusta a seleção ou fala connosco." };
    }

    // Cada acessório usa a variante escolhida no configurador (ou a primeira
    // ativa). Os valores de referência são os da loja, com IVA incluído.
    const lines = chosen.map((product) => {
      const requested = accessories.find((item) => item.product_id === product.id);
      const variant = product.product_variants?.find((item) => item.id === requested?.variant_id && item.is_active) ?? product.product_variants?.find((item) => item.is_active) ?? null;
      return {
        product_id: product.id,
        variant_id: variant?.id ?? null,
        product_name: product.name,
        variant_name: variant?.name ?? "",
        unit_price: Number(product.price) + Number(variant?.price_delta ?? 0),
      };
    });
    const subtotal = Number(vehicle.price) + lines.reduce((sum, line) => sum + line.unit_price, 0);
    const vatTotal = Number((Number(vehicle.price) - Number(vehicle.price) / 1.23).toFixed(2)) +
      Number((lines.reduce((sum, line) => sum + (line.unit_price - line.unit_price / 1.23), 0)).toFixed(2));

    const { data: orderNumber, error: numberError } = await paymentAdmin.rpc("next_order_number");
    if (numberError || !orderNumber) return { error: "Não foi possível gerar o número do pedido." };
    const accessToken = globalThis.crypto.randomUUID();
    const vehicleName = [vehicle.brand, vehicle.model, vehicle.trim].filter(Boolean).join(" ");

    const { data: order, error: orderError } = await paymentAdmin
      .from("orders")
      .insert({
        order_number: String(orderNumber),
        access_token: accessToken,
        user_id: user?.id ?? null,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        customer_note: note,
        billing_same_as_shipping: true,
        subtotal,
        discount_total: 0,
        shipping_total: 0,
        vat_total: vatTotal,
        total: subtotal,
        payment_method: null,
        payment_status: "pending",
        status: "pending_payment",
      })
      .select("id")
      .single();
    if (orderError || !order) return { error: "Não foi possível registar o pedido. Tenta novamente ou contacta a garagem." };

    const items = [
      {
        order_id: order.id,
        product_id: null,
        variant_id: null,
        product_name: `Viatura nova: ${vehicleName}`,
        variant_name: "Configuração por encomenda",
        sku: `VH-${vehicle.slug}`,
        unit_price: Number(vehicle.price),
        quantity: 1,
        vat_rate: 23,
        line_total: Number(vehicle.price),
        weight_grams: 0,
      },
      ...lines.map((line) => ({
        order_id: order.id,
        product_id: line.product_id,
        variant_id: line.variant_id,
        product_name: line.product_name,
        variant_name: line.variant_name,
        sku: "",
        unit_price: line.unit_price,
        quantity: 1,
        vat_rate: 23,
        line_total: line.unit_price,
        weight_grams: 0,
      })),
    ];
    const { error: itemsError } = await paymentAdmin.from("order_items").insert(items);
    if (itemsError) {
      await paymentAdmin.from("orders").delete().eq("id", order.id);
      return { error: "Não foi possível registar o pedido. Tenta novamente ou contacta a garagem." };
    }
    await paymentAdmin.from("order_status_history").insert({ order_id: order.id, status: "pending_payment", note: `Pedido de encomenda de viatura nova (${vehicleName}) — a equipa contacta o cliente para confirmar configuração e condições.` });

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://chikanegarage.blog").replace(/\/$/, "");
    await sendShopEmail(email, `Pedido de encomenda ${String(orderNumber)} recebido`, shopEmailHtml("Pedido de encomenda recebido", [
      `Olá ${escapeShopEmailText(name)}, recebemos o teu pedido de encomenda <strong>${escapeShopEmailText(String(orderNumber))}</strong> pela viatura <strong>${escapeShopEmailText(vehicleName)}</strong>${lines.length ? ` com <strong>${lines.length}</strong> acessório${lines.length > 1 ? "s" : ""}` : ""}.`,
      "Agora é connosco: a equipa contacta-te nas próximas 24 horas úteis para confirmar a configuração, o preço final, financiamento e prazo de entrega. Só depois disso é que o pagamento é combinado — não há qualquer cobrança agora.",
      `Acompanha o percurso do pedido e as atualizações em <a href="${siteUrl}/encomenda/${accessToken}" style="color:#c38a58">acompanhar pedido</a>.`,
      `Valor de referência: <strong>${subtotal.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</strong> (IVA incluído, sujeito a confirmação).`,
    ]));
    return { orderToken: accessToken };
  } catch {
    return { error: "Ocorreu um erro ao enviar o pedido. Tenta novamente ou contacta a garagem." };
  }
}

// ----------------------------------------------------------------------------
// Pedido de compra de um artigo "só por encomenda" (stock_mode on_request):
// peças e acessórios que não estão em stock imediato (jantes, lips, capas…)
// são compráveis por pedido — sem pagamento online. A equipa confirma prazo e
// custo e o cliente acompanha o pedido pelo link do comprovativo.
// ----------------------------------------------------------------------------
type ProductQuoteInput = { product_id: string; variant_id?: string; quantity?: number; customer: { customer_name?: string; customer_email?: string; customer_phone?: string; customer_note?: string } };

export async function createProductQuoteRequest(input: ProductQuoteInput): Promise<{ error?: string; orderToken?: string }> {
  try {
    if (typeof input?.product_id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.product_id)) return { error: "Confirma o artigo selecionado." };
    const quantity = Number.isInteger(input.quantity) ? Math.min(Math.max(Number(input.quantity), 1), 20) : 1;
    if (input.variant_id != null && !/^[0-9a-f-]{36}$/i.test(input.variant_id)) return { error: "Confirma a opção selecionada." };

    const name = String(input.customer?.customer_name ?? "").trim();
    const email = String(input.customer?.customer_email ?? "").trim().toLowerCase();
    const phone = String(input.customer?.customer_phone ?? "").trim();
    const note = String(input.customer?.customer_note ?? "").trim().slice(0, 1000);
    if (name.length < 2 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || phone.length < 6 || phone.length > 30) return { error: "Confirma o nome, o email e o telemóvel." };

    const paymentAdmin = createPaymentAdminClient();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    type QueriedProduct = { id: string; name: string; price: number; status: string; stock_mode: string | null; weight_grams: number | null; product_variants?: { id: string; name: string; price_delta: number; is_active: boolean; stock_mode: string | null }[] | null };
    const { data: product, error: productError } = await paymentAdmin
      .from("products")
      .select("id, name, price, status, stock_mode, weight_grams, product_variants(id, name, price_delta, is_active, stock_mode)")
      .eq("id", input.product_id)
      .maybeSingle();
    if (productError || !product) return { error: "Não foi possível confirmar o artigo. Tenta novamente ou contacta a garagem." };
    const queried = product as unknown as QueriedProduct;
    if (queried.status !== "active") return { error: `O artigo ${queried.name} já não está disponível.` };

    const variant = queried.product_variants?.find((item) => item.id === input.variant_id && item.is_active)
      ?? queried.product_variants?.find((item) => item.is_active)
      ?? null;
    if ((queried.product_variants?.length ?? 0) > 0 && !variant) return { error: "Escolhe uma opção disponível para este artigo." };
    const unitPrice = Number(queried.price) + Number(variant?.price_delta ?? 0);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return { error: "Este artigo não tem preço publicado — fala connosco." };

    const subtotal = Number((unitPrice * quantity).toFixed(2));
    const vatTotal = Number((subtotal - subtotal / 1.23).toFixed(2));
    const { data: orderNumber, error: numberError } = await paymentAdmin.rpc("next_order_number");
    if (numberError || !orderNumber) return { error: "Não foi possível gerar o número do pedido." };
    const accessToken = globalThis.crypto.randomUUID();

    const { data: order, error: orderError } = await paymentAdmin
      .from("orders")
      .insert({
        order_number: String(orderNumber),
        access_token: accessToken,
        user_id: user?.id ?? null,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        customer_note: note,
        billing_same_as_shipping: true,
        subtotal,
        discount_total: 0,
        shipping_total: 0,
        vat_total: vatTotal,
        total: subtotal,
        payment_method: null,
        payment_status: "pending",
        status: "pending_payment",
      })
      .select("id")
      .single();
    if (orderError || !order) return { error: "Não foi possível registar o pedido. Tenta novamente ou contacta a garagem." };

    const { error: itemsError } = await paymentAdmin.from("order_items").insert({
      order_id: order.id,
      product_id: queried.id,
      variant_id: variant?.id ?? null,
      product_name: queried.name,
      variant_name: variant?.name ?? "",
      sku: "",
      unit_price: unitPrice,
      quantity,
      vat_rate: 23,
      line_total: subtotal,
      weight_grams: Number(queried.weight_grams ?? 0),
    });
    if (itemsError) {
      await paymentAdmin.from("orders").delete().eq("id", order.id);
      return { error: "Não foi possível registar o pedido. Tenta novamente ou contacta a garagem." };
    }
    await paymentAdmin.from("order_status_history").insert({ order_id: order.id, status: "pending_payment", note: `Pedido de compra por encomenda (${queried.name}) — a equipa confirma prazo e custos com o cliente.` });

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://chikanegarage.blog").replace(/\/$/, "");
    await sendShopEmail(email, `Pedido de compra ${String(orderNumber)} recebido`, shopEmailHtml("Pedido de compra recebido", [
      `Olá ${escapeShopEmailText(name)}, recebemos o teu pedido de compra <strong>${escapeShopEmailText(String(orderNumber))}</strong> pelo artigo <strong>${escapeShopEmailText(queried.name)}</strong>${variant ? ` (${escapeShopEmailText(variant.name)})` : ""} — ${quantity} unidade${quantity > 1 ? "s" : ""}.`,
      "Este artigo é fornecido por encomenda: a equipa confirma o prazo de entrega e os custos finais contigo antes de qualquer pagamento.",
      `Acompanha o percurso do pedido em <a href="${siteUrl}/encomenda/${accessToken}" style="color:#c38a58">acompanhar pedido</a>.`,
      `Valor de referência: <strong>${subtotal.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</strong> (IVA incluído, portes a confirmar).`,
    ]));
    return { orderToken: accessToken };
  } catch {
    return { error: "Ocorreu um erro ao enviar o pedido. Tenta novamente ou contacta a garagem." };
  }
}
