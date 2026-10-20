"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadToR2 } from "@/lib/r2";

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
  const { error } = await supabase.from("orders").update({ status, tracking_number: trackingNumber, tracking_url: trackingUrl, shipped_at: status === "shipped" ? new Date().toISOString() : undefined, delivered_at: status === "delivered" ? new Date().toISOString() : undefined, admin_note: text(form, "admin_note", 2000) }).eq("id", id);
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
