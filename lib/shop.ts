import { createClient } from "@/lib/supabase/server";
export { euro } from "@/lib/shop-format";

export type ShopImage = { id?: string; url: string; alt_text?: string | null; position?: number | null };
export type ShopCompatibility = { brand: string; model: string; year_from?: number | null; year_to?: number | null; notes?: string | null };
export type ShopVariant = {
  id: string;
  name: string;
  option1_name?: string | null;
  option1_value?: string | null;
  option2_name?: string | null;
  option2_value?: string | null;
  price_delta?: number | null;
  stock_quantity?: number | null;
  stock_mode?: string | null;
  is_active?: boolean;
};
export type ShopProduct = {
  id: string;
  slug: string;
  name: string;
  short_description?: string | null;
  description?: string | null;
  price: number;
  compare_at_price?: number | null;
  weight_grams?: number | null;
  stock_mode?: string | null;
  kind?: string | null;
  is_featured?: boolean;
  is_new?: boolean;
  product_categories?: { name: string; slug: string } | null;
  brands?: { name: string } | null;
  product_variants?: ShopVariant[];
  product_images?: ShopImage[];
  product_compatibility?: ShopCompatibility[];
};
export type ShopCategory = { id: string; slug: string; name: string; description?: string | null; image_url?: string | null; position?: number };

const PRODUCT_FIELDS = "id,slug,name,short_description,description,price,compare_at_price,weight_grams,stock_mode,kind,is_featured,is_new,product_categories(name,slug),brands(name),product_variants(id,name,option1_name,option1_value,option2_name,option2_value,price_delta,stock_quantity,is_active),product_images(id,url,alt_text,position)";
const PRODUCT_DETAIL_FIELDS = `${PRODUCT_FIELDS},product_compatibility(brand,model,year_from,year_to,notes)`;
const PRODUCT_FIELDS_WITH_CATEGORY = "id,slug,name,short_description,description,price,compare_at_price,weight_grams,stock_mode,kind,is_featured,is_new,product_categories!inner(name,slug),brands(name),product_variants(id,name,option1_name,option1_value,option2_name,option2_value,price_delta,stock_quantity,is_active),product_images(id,url,alt_text,position)";

export async function getShopCategories(): Promise<ShopCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("product_categories").select("id,slug,name,description,image_url,position").is("parent_id", null).eq("is_active", true).order("position");
  return (data ?? []) as ShopCategory[];
}

export async function getShopProducts(options: { category?: string; featured?: boolean; limit?: number } = {}): Promise<ShopProduct[]> {
  const supabase = await createClient();
  let query = supabase.from("products").select(options.category ? PRODUCT_FIELDS_WITH_CATEGORY : PRODUCT_FIELDS).eq("status", "active").order("published_at", { ascending: false }).limit(options.limit ?? 24);
  if (options.featured) query = query.eq("is_featured", true);
  if (options.category) {
    query = query.eq("product_categories.slug", options.category).eq("product_categories.is_active", true);
  }
  const { data } = await query;
  return ((data ?? []) as unknown as ShopProduct[]).map(sortProductImages);
}

export async function getShopProduct(slug: string): Promise<ShopProduct | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select(PRODUCT_DETAIL_FIELDS).eq("slug", slug).eq("status", "active").maybeSingle();
  return data ? sortProductImages(data as unknown as ShopProduct) : null;
}

export function sortProductImages<T extends ShopProduct>(product: T): T {
  return { ...product, product_images: [...(product.product_images ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)) };
}

export function availableQuantity(product: ShopProduct, variant?: ShopVariant): number | null {
  if ((variant?.stock_mode ?? product.stock_mode) === "unlimited") return null;
  return variant?.stock_quantity ?? 0;
}
