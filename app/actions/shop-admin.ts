"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";

async function adminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Inicia sessão para continuar.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Não tens permissão para gerir a loja.");
  return { supabase, user };
}

const text = (form: FormData, key: string, max = 500) => String(form.get(key) ?? "").trim().slice(0, max);
const number = (form: FormData, key: string, fallback = 0) => { const value = Number(text(form, key, 40)); return Number.isFinite(value) ? value : fallback; };

export async function saveShopProduct(form: FormData) {
  const { supabase } = await adminClient();
  const id = text(form, "id", 64);
  const name = text(form, "name", 160);
  const slug = text(form, "slug", 160).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const price = number(form, "price", -1);
  if (name.length < 2 || !slug || price < 0 || !text(form, "category_id", 64)) throw new Error("Preenche o nome, categoria e preço do artigo.");
  const productData = {
    slug, name,
    category_id: text(form, "category_id", 64),
    brand_id: text(form, "brand_id", 64) || null,
    short_description: text(form, "short_description", 240),
    description: text(form, "description", 8000),
    price, compare_at_price: number(form, "compare_at_price", 0) || null,
    weight_grams: Math.max(0, Math.round(number(form, "weight_grams"))),
    sku: text(form, "sku", 80), status: text(form, "status", 20) === "draft" ? "draft" : "active",
    stock_mode: ["managed", "unlimited", "on_request"].includes(text(form, "stock_mode", 20)) ? text(form, "stock_mode", 20) : "managed",
    low_stock_threshold: Math.max(0, Math.round(number(form, "low_stock_threshold", 3))),
    is_featured: form.get("is_featured") === "on", is_new: form.get("is_new") === "on",
    vat_rate: Math.max(0, number(form, "vat_rate", 23)),
  };
  let productId = id;
  if (id) {
    const { error } = await supabase.from("products").update(productData).eq("id", id);
    if (error) throw new Error("Não foi possível guardar o artigo. Confirma se a referência é única.");
  } else {
    const { data, error } = await supabase.from("products").insert(productData).select("id").single();
    if (error || !data) throw new Error("Não foi possível criar o artigo. Confirma se a referência já existe.");
    productId = data.id;
  }

  const variantsRaw = text(form, "variants", 4000);
  const variantRows = variantsRaw.split("\n").map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const [variantName, sku = "", stock = "0", delta = "0"] = line.split(";").map((part) => part.trim());
    return { product_id: productId, name: variantName.slice(0, 120) || "Único", sku: sku.slice(0, 80), stock_quantity: Math.max(0, Math.round(Number(stock) || 0)), price_delta: Number(delta) || 0, position: index, is_active: true };
  });
  if (!variantsRaw && !id) variantRows.push({ product_id: productId, name: "Único", sku: productData.sku, stock_quantity: 0, price_delta: 0, position: 0, is_active: true });
  if (variantRows.length > 0) {
    if (id) await supabase.from("product_variants").delete().eq("product_id", productId);
    const { error } = await supabase.from("product_variants").insert(variantRows);
    if (error) throw new Error("O artigo foi guardado, mas não foi possível guardar as variantes.");
  }

  const compatibilityRows = text(form, "compatibility", 8000).split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [brand = "", model = "", yearFrom = "", yearTo = "", notes = ""] = line.split(";").map((part) => part.trim());
    const from = yearFrom ? Number(yearFrom) : null;
    const to = yearTo ? Number(yearTo) : null;
    if (brand.length < 2 || model.length < 1 || (from !== null && (!Number.isInteger(from) || from < 1900 || from > 2100)) || (to !== null && (!Number.isInteger(to) || to < 1900 || to > 2100)) || (from !== null && to !== null && from > to)) throw new Error("Revê as linhas de compatibilidade: marca, modelo e anos têm de ser válidos.");
    return { product_id: productId, brand: brand.slice(0, 80), model: model.slice(0, 100), year_from: from, year_to: to, notes: notes.slice(0, 240) };
  });
  const { error: compatibilityDeleteError } = await supabase.from("product_compatibility").delete().eq("product_id", productId);
  if (compatibilityDeleteError) throw new Error("O artigo foi guardado, mas não foi possível atualizar a compatibilidade.");
  if (compatibilityRows.length) {
    const { error: compatibilityInsertError } = await supabase.from("product_compatibility").insert(compatibilityRows);
    if (compatibilityInsertError) throw new Error("O artigo foi guardado, mas não foi possível guardar a compatibilidade.");
  }

  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(image.type) || image.size > 10 * 1024 * 1024) throw new Error("Escolhe uma imagem JPG, PNG ou WEBP até 10 MB.");
    const ext = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
    const url = await uploadToR2(`products/${productId}/${Date.now()}.${ext}`, Buffer.from(await image.arrayBuffer()), image.type);
    const { error } = await supabase.from("product_images").insert({ product_id: productId, url, alt_text: text(form, "name", 160), position: 0 });
    if (error) throw new Error("A fotografia foi enviada, mas não foi associada ao artigo.");
  }

  revalidatePath("/loja"); revalidatePath(`/produto/${slug}`); revalidatePath("/admin/loja/produtos");
  redirect("/admin/loja/produtos");
}

export async function deactivateShopProduct(form: FormData) {
  const { supabase } = await adminClient();
  const id = text(form, "id", 64);
  if (!id) return;
  await supabase.from("products").update({ status: "archived" }).eq("id", id);
  revalidatePath("/loja"); revalidatePath("/admin/loja/produtos");
}

export async function createShopCategory(form: FormData) {
  const { supabase } = await adminClient();
  const name = text(form, "name", 100);
  const slug = text(form, "slug", 100).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (name.length < 2 || !slug) throw new Error("Indica o nome e uma referência válida.");
  await supabase.from("product_categories").insert({ name, slug, description: text(form, "description", 400), position: Math.max(0, Math.round(number(form, "position"))) });
  revalidatePath("/loja"); revalidatePath("/admin/loja/categorias");
}

export async function deactivateShopCategory(form: FormData) {
  const { supabase } = await adminClient();
  await supabase.from("product_categories").update({ is_active: false }).eq("id", text(form, "id", 64));
  revalidatePath("/loja"); revalidatePath("/admin/loja/categorias");
}

export async function adjustShopStock(form: FormData) {
  const { supabase, user } = await adminClient();
  const variantId = text(form, "variant_id", 64);
  const delta = Math.trunc(number(form, "delta"));
  if (!variantId || !delta || Math.abs(delta) > 10000) throw new Error("Indica uma alteração de stock válida.");
  const { data: variant } = await supabase.from("product_variants").select("stock_quantity").eq("id", variantId).single();
  if (!variant) throw new Error("Variante não encontrada.");
  const next = Math.max(0, variant.stock_quantity + delta);
  const { error } = await supabase.from("product_variants").update({ stock_quantity: next }).eq("id", variantId);
  if (error) throw new Error("Não foi possível atualizar o stock.");
  await supabase.from("stock_movements").insert({ variant_id: variantId, delta: next - variant.stock_quantity, reason: text(form, "reason", 20) || "adjustment", note: text(form, "note", 240), created_by: user.id });
  revalidatePath("/admin/loja/stock"); revalidatePath("/loja");
}

export async function updateShopOrder(form: FormData) {
  const { supabase, user } = await adminClient();
  const id = text(form, "id", 64);
  const status = text(form, "status", 32);
  const statuses = ["paid", "preparing", "shipped", "delivered", "cancelled", "refunded", "returned"];
  if (!id || !statuses.includes(status)) throw new Error("Estado de encomenda inválido.");
  const trackingNumber = text(form, "tracking_number", 100);
  const trackingUrl = text(form, "tracking_url", 500);
  if (trackingUrl && !/^https:\/\//i.test(trackingUrl)) throw new Error("A ligação de seguimento deve começar por https://.");
  // Marcar como paga/refundada mantém o comprovativo coerente com o estado.
  const paymentStatus = status === "paid" ? "paid" : status === "refunded" ? "refunded" : undefined;
  const { error } = await supabase.from("orders").update({ status, payment_status: paymentStatus, tracking_number: trackingNumber, tracking_url: trackingUrl, shipped_at: status === "shipped" ? new Date().toISOString() : undefined, delivered_at: status === "delivered" ? new Date().toISOString() : undefined, admin_note: text(form, "admin_note", 2000) }).eq("id", id);
  if (error) throw new Error("Não foi possível atualizar a encomenda.");
  await supabase.from("order_status_history").insert({ order_id: id, status, note: text(form, "status_note", 300), created_by: user.id });
  revalidatePath("/admin/loja/encomendas"); revalidatePath(`/admin/loja/encomendas/${id}`);
}

export async function createShopCoupon(form: FormData) {
  const { supabase } = await adminClient();
  const code = text(form, "code", 40).toUpperCase().replace(/\s/g, "");
  const type = text(form, "discount_type", 20);
  const value = number(form, "discount_value", -1);
  if (!code || !["percent", "fixed", "free_shipping"].includes(type) || value < 0 || (type === "percent" && value > 100)) throw new Error("Confirma o código e o valor do cupão.");
  await supabase.from("coupons").insert({ code, description: text(form, "description", 240), discount_type: type, discount_value: value, min_order_total: Math.max(0, number(form, "min_order_total")), max_uses: Math.max(0, Math.round(number(form, "max_uses"))) || null, ends_at: text(form, "ends_at", 30) ? new Date(`${text(form, "ends_at", 30)}T23:59:59`).toISOString() : null });
  revalidatePath("/admin/loja/cupoes");
}

export async function createShippingRate(form: FormData) {
  const { supabase } = await adminClient();
  const zoneId = text(form, "zone_id", 64);
  const weightFrom = Math.max(0, Math.round(number(form, "weight_from_grams")));
  const weightTo = Math.max(0, Math.round(number(form, "weight_to_grams")));
  const price = number(form, "price", -1);
  if (!zoneId || price < 0 || (weightTo > 0 && weightTo < weightFrom)) throw new Error("Confirma zona, peso e preço dos portes.");
  await supabase.from("shipping_rates").insert({ zone_id: zoneId, name: text(form, "name", 80) || `Até ${weightTo || "sem limite"} g`, weight_from_grams: weightFrom, weight_to_grams: weightTo || null, price, delivery_days_min: Math.max(1, Math.round(number(form, "delivery_days_min", 2))), delivery_days_max: Math.max(1, Math.round(number(form, "delivery_days_max", 5))), position: weightFrom });
  revalidatePath("/admin/loja/portes");
}

// -----------------------------------------------------------------------------
// Definições da loja (shop_settings — uma única linha, id = 1)
// -----------------------------------------------------------------------------
export async function saveShopSettings(form: FormData) {
  const { supabase } = await adminClient();
  const supportEmail = text(form, "support_email", 200).toLowerCase();
  if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) throw new Error("O email de suporte não é válido.");
  const { error } = await supabase.from("shop_settings").upsert({
    id: 1,
    free_shipping_above: Math.max(0, number(form, "free_shipping_above")),
    stock_hold_minutes: Math.min(24 * 60, Math.max(1, Math.round(number(form, "stock_hold_minutes", 15)))),
    low_stock_default: Math.max(0, Math.round(number(form, "low_stock_default", 3))),
    returns_days: Math.max(0, Math.round(number(form, "returns_days", 14))),
    support_email: supportEmail,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error("Não foi possível guardar as definições da loja.");
  revalidatePath("/admin/loja/definicoes");
  revalidatePath("/loja");
}

// -----------------------------------------------------------------------------
// Marcas (CRUD completo; ao apagar, os produtos ficam "Sem marca")
// -----------------------------------------------------------------------------
const brandSlug = (raw: string, fallbackName: string) =>
  (raw.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    || fallbackName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")).slice(0, 80);

export async function createShopBrand(form: FormData) {
  const { supabase } = await adminClient();
  const name = text(form, "name", 80);
  if (name.length < 2) throw new Error("Indica o nome da marca.");
  const slug = brandSlug(text(form, "slug", 80), name);
  if (!slug) throw new Error("Indica o nome da marca.");
  const { error } = await supabase.from("brands").insert({ name, slug, position: Math.max(0, Math.round(number(form, "position"))) });
  if (error) throw new Error("Não foi possível criar a marca — a referência já pode existir.");
  revalidatePath("/admin/loja/marcas"); revalidatePath("/admin/loja/produtos"); revalidatePath("/loja");
}

export async function updateShopBrand(form: FormData) {
  const { supabase } = await adminClient();
  const id = text(form, "id", 64);
  const name = text(form, "name", 80);
  if (!id || name.length < 2) throw new Error("Indica o nome da marca.");
  const { error } = await supabase.from("brands").update({
    name,
    slug: brandSlug(text(form, "slug", 80), name),
    position: Math.max(0, Math.round(number(form, "position"))),
    is_active: form.get("is_active") === "on",
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error("Não foi possível guardar a marca — a referência já pode existir.");
  revalidatePath("/admin/loja/marcas"); revalidatePath("/admin/loja/produtos"); revalidatePath("/loja");
}

export async function deleteShopBrand(form: FormData) {
  const { supabase } = await adminClient();
  const id = text(form, "id", 64);
  if (!id) return;
  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) throw new Error("Não foi possível apagar a marca.");
  revalidatePath("/admin/loja/marcas"); revalidatePath("/admin/loja/produtos"); revalidatePath("/loja");
}

// -----------------------------------------------------------------------------
// Cupões — editar, ativar/desativar e apagar (criar continua em createShopCoupon)
// -----------------------------------------------------------------------------
export async function updateShopCoupon(form: FormData) {
  const { supabase } = await adminClient();
  const id = text(form, "id", 64);
  const code = text(form, "code", 40).toUpperCase().replace(/\s/g, "");
  const type = text(form, "discount_type", 20);
  const value = number(form, "discount_value", -1);
  const date = (key: string) => { const raw = text(form, key, 30); return raw ? new Date(`${raw}T23:59:59`).toISOString() : null; };
  if (!id || !code || !["percent", "fixed", "free_shipping"].includes(type) || value < 0 || (type === "percent" && value > 100)) throw new Error("Confirma o código e o valor do cupão.");
  const startsAt = date("starts_at");
  const endsAt = date("ends_at");
  if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) throw new Error("A data de início tem de ser anterior ao fim.");
  const { error } = await supabase.from("coupons").update({
    code,
    description: text(form, "description", 240),
    discount_type: type,
    discount_value: value,
    min_order_total: Math.max(0, number(form, "min_order_total")),
    max_uses: Math.max(0, Math.round(number(form, "max_uses"))) || null,
    starts_at: startsAt,
    ends_at: endsAt,
    is_active: form.get("is_active") === "on",
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error("Não foi possível guardar o cupão — o código tem de ser único.");
  revalidatePath("/admin/loja/cupoes");
}

export async function deleteShopCoupon(form: FormData) {
  const { supabase } = await adminClient();
  const id = text(form, "id", 64);
  if (!id) return;
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) throw new Error("Não foi possível apagar o cupão.");
  revalidatePath("/admin/loja/cupoes");
}

// -----------------------------------------------------------------------------
// Zonas e escalões de portes — criar/editar/apagar
// -----------------------------------------------------------------------------
const countryCodes = (raw: string) => raw.toUpperCase().split(",").map((code) => code.trim()).filter(Boolean).join(",");

export async function createShippingZone(form: FormData) {
  const { supabase } = await adminClient();
  const name = text(form, "name", 80);
  const countries = countryCodes(text(form, "country_codes", 200));
  if (name.length < 2 || !countries) throw new Error("Indica o nome e os países da zona (ISO com vírgulas, ex.: PT,ES).");
  const { error } = await supabase.from("shipping_zones").insert({ name, country_codes: countries, postal_code_from: text(form, "postal_code_from", 12), postal_code_to: text(form, "postal_code_to", 12), position: Math.max(0, Math.round(number(form, "position"))) });
  if (error) throw new Error("Não foi possível criar a zona.");
  revalidatePath("/admin/loja/portes"); revalidatePath("/loja"); revalidatePath("/checkout");
}

export async function updateShippingZone(form: FormData) {
  const { supabase } = await adminClient();
  const id = text(form, "id", 64);
  const name = text(form, "name", 80);
  const countries = countryCodes(text(form, "country_codes", 200));
  if (!id || name.length < 2 || !countries) throw new Error("Indica o nome e os países da zona.");
  const { error } = await supabase.from("shipping_zones").update({ name, country_codes: countries, postal_code_from: text(form, "postal_code_from", 12), postal_code_to: text(form, "postal_code_to", 12), position: Math.max(0, Math.round(number(form, "position"))), is_active: form.get("is_active") === "on", updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error("Não foi possível guardar a zona.");
  revalidatePath("/admin/loja/portes"); revalidatePath("/loja"); revalidatePath("/checkout");
}

export async function updateShippingRate(form: FormData) {
  const { supabase } = await adminClient();
  const id = text(form, "id", 64);
  const weightFrom = Math.max(0, Math.round(number(form, "weight_from_grams")));
  const weightTo = Math.max(0, Math.round(number(form, "weight_to_grams")));
  const price = number(form, "price", -1);
  if (!id || price < 0 || (weightTo > 0 && weightTo < weightFrom)) throw new Error("Confirma peso e preço dos portes.");
  const { error } = await supabase.from("shipping_rates").update({ name: text(form, "name", 80), weight_from_grams: weightFrom, weight_to_grams: weightTo || null, price, delivery_days_min: Math.max(1, Math.round(number(form, "delivery_days_min", 2))), delivery_days_max: Math.max(1, Math.round(number(form, "delivery_days_max", 5))), is_active: form.get("is_active") === "on", updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error("Não foi possível guardar o escalão.");
  revalidatePath("/admin/loja/portes"); revalidatePath("/loja"); revalidatePath("/checkout");
}

export async function deleteShippingRate(form: FormData) {
  const { supabase } = await adminClient();
  const id = text(form, "id", 64);
  if (!id) return;
  const { error } = await supabase.from("shipping_rates").delete().eq("id", id);
  if (error) throw new Error("Não foi possível apagar o escalão.");
  revalidatePath("/admin/loja/portes");
}

// -----------------------------------------------------------------------------
// Fotografias do artigo — adicionar, apagar e pôr em primeiro (principal)
// -----------------------------------------------------------------------------
function r2KeyFromUrl(url: string) {
  try {
    const base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
    if (base && url.startsWith(base)) return url.slice(base.length).replace(/^\/+/, "");
    const parsed = new URL(url);
    return parsed.pathname.split("/").slice(1).join("/");
  } catch { return ""; }
}

export async function uploadProductImage(form: FormData) {
  const { supabase } = await adminClient();
  const productId = text(form, "product_id", 64);
  const file = form.get("image");
  if (!productId || !(file instanceof File) || file.size === 0) throw new Error("Escolhe uma fotografia para adicionar.");
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size > 10 * 1024 * 1024) throw new Error("Escolhe uma imagem JPG, PNG ou WEBP até 10 MB.");
  const { data: product } = await supabase.from("products").select("slug,name").eq("id", productId).maybeSingle();
  if (!product) throw new Error("Artigo não encontrado.");
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const url = await uploadToR2(`products/${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`, Buffer.from(await file.arrayBuffer()), file.type);
  const { data: images } = await supabase.from("product_images").select("position").eq("product_id", productId);
  const nextPosition = (images ?? []).reduce((max, image) => Math.max(max, Number(image.position ?? 0)), -1) + 1;
  const { error } = await supabase.from("product_images").insert({ product_id: productId, url, alt_text: product.name, position: nextPosition });
  if (error) throw new Error("A fotografia foi enviada, mas não foi associada ao artigo.");
  revalidatePath("/loja"); revalidatePath(`/produto/${product.slug}`); revalidatePath("/admin/loja/produtos");
}

export async function deleteProductImage(form: FormData) {
  const { supabase } = await adminClient();
  const id = text(form, "id", 64);
  if (!id) return;
  const { data: image } = await supabase.from("product_images").select("id,product_id,url").eq("id", id).maybeSingle();
  if (!image) return;
  const { data: product } = await supabase.from("products").select("slug").eq("id", image.product_id).maybeSingle();
  const { error } = await supabase.from("product_images").delete().eq("id", id);
  if (error) throw new Error("Não foi possível apagar a fotografia.");
  const key = r2KeyFromUrl(image.url);
  if (key) await deleteFromR2(key).catch(() => {});
  revalidatePath("/loja"); if (product?.slug) revalidatePath(`/produto/${product.slug}`); revalidatePath("/admin/loja/produtos");
}

export async function makeFirstProductImage(form: FormData) {
  const { supabase } = await adminClient();
  const id = text(form, "id", 64);
  if (!id) return;
  const { data: image } = await supabase.from("product_images").select("id,product_id").eq("id", id).maybeSingle();
  if (!image) return;
  const { data: product } = await supabase.from("products").select("slug").eq("id", image.product_id).maybeSingle();
  const { data: all } = await supabase.from("product_images").select("id,position").eq("product_id", image.product_id).order("position");
  const ordered = (all ?? []).map((item) => ({ id: item.id, position: Number(item.position ?? 0) }));
  const targetIndex = ordered.findIndex((item) => item.id === id);
  if (targetIndex <= 0) return;
  const reordered = [ordered[targetIndex], ...ordered.slice(0, targetIndex), ...ordered.slice(targetIndex + 1)];
  for (let index = 0; index < reordered.length; index += 1) {
    if (reordered[index].position !== index) await supabase.from("product_images").update({ position: index }).eq("id", reordered[index].id);
  }
  revalidatePath("/loja"); if (product?.slug) revalidatePath(`/produto/${product.slug}`); revalidatePath("/admin/loja/produtos");
}

// -----------------------------------------------------------------------------
// Newsletter — gerir assinantes
// -----------------------------------------------------------------------------
export async function toggleNewsletterSubscriber(form: FormData) {
  const { supabase } = await adminClient();
  const id = text(form, "id", 64);
  const current = text(form, "status", 24);
  if (!id) return;
  const { error } = await supabase.from("newsletter_subscribers").update({ status: current === "active" ? "unsubscribed" : "active" }).eq("id", id);
  if (error) throw new Error("Não foi possível alterar o estado do subscritor.");
  revalidatePath("/admin/loja/newsletter");
}

export async function deleteNewsletterSubscriber(form: FormData) {
  const { supabase } = await adminClient();
  const id = text(form, "id", 64);
  if (!id) return;
  const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", id);
  if (error) throw new Error("Não foi possível apagar o subscritor.");
  revalidatePath("/admin/loja/newsletter");
}

// -----------------------------------------------------------------------------
// Devoluções (return_requests) — estados, reembolso e notas
// -----------------------------------------------------------------------------
export async function updateReturnRequest(form: FormData) {
  const { supabase, user } = await adminClient();
  const id = text(form, "id", 64);
  const status = text(form, "status", 24);
  const statuses = ["requested", "approved", "received", "refunded", "rejected"];
  if (!id || !statuses.includes(status)) throw new Error("Estado de devolução inválido.");
  const refundTotal = Math.max(0, number(form, "refund_total"));
  const { data: request } = await supabase.from("return_requests").select("order_id").eq("id", id).maybeSingle();
  if (!request) throw new Error("Devolução não encontrada.");
  const { error } = await supabase.from("return_requests").update({ status, refund_total: refundTotal, return_tracking: text(form, "return_tracking", 100), admin_note: text(form, "admin_note", 2000), updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error("Não foi possível atualizar a devolução.");
  // Reembolso concluído → a encomenda passa a refundada e o pagamento também.
  if (status === "refunded") {
    await supabase.from("orders").update({ status: "refunded", payment_status: "refunded" }).eq("id", request.order_id);
  }
  await supabase.from("order_status_history").insert({ order_id: request.order_id, status, note: `Devolução atualizada para «${status}»${refundTotal ? ` · reembolso de ${refundTotal.toFixed(2)} €` : ""}${text(form, "admin_note", 2000) ? ` · ${text(form, "admin_note", 2000)}` : ""}`, created_by: user.id });
  revalidatePath("/admin/loja/devolucoes"); revalidatePath(`/admin/loja/encomendas/${request.order_id}`);
}
