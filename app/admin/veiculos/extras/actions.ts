"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadToR2 } from "@/lib/r2";

// O proxy.ts só protege carregamentos de página — cada ação revalida sessão e
// papel de admin antes de escrever (mesmo padrão de app/actions/upload.ts).
async function adminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Inicia sessão para continuar.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Não tens permissão para gerir os extras.");
  return supabase;
}

function revalidateExtras() {
  revalidatePath("/admin/veiculos/extras");
  revalidatePath("/admin/veiculos");
  revalidatePath("/admin/veiculos/novo");
  revalidatePath("/catalogo");
  revalidatePath("/novos");
}

const parsePrice = (raw: FormDataEntryValue | null) => Number(String(raw ?? "0").replace(",", ".")) || 0;

// Upload da fotografia de um extra. Devolve a URL pública para ser guardada
// em vehicle_extra_catalog.image_url. Os erros são devolvidos (não lançados)
// para o formulário os poder mostrar sem rebentar a página.
export async function uploadVehicleExtraImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  try {
    await adminClient();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: "Escolhe uma imagem." };

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!allowed.includes(file.type)) return { error: "Formato não suportado (usa JPG, PNG, WEBP ou AVIF)." };
    if (file.size > 5 * 1024 * 1024) return { error: "Imagem demasiado grande (máx. 5 MB)." };

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const key = `extras/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const body = new Uint8Array(await file.arrayBuffer());
    const url = await uploadToR2(key, body, file.type);
    return { url };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erro ao carregar a imagem." };
  }
}

export async function createVehicleExtraCatalog(formData: FormData): Promise<{ id: string }> {
  const supabase = await adminClient();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const image_url = String(formData.get("image_url") || "").trim();
  const positionRaw = String(formData.get("position") || "0");
  const is_active = formData.get("is_active") === "on";
  const price = parsePrice(formData.get("price"));
  // Viaturas novas onde o extra deve ficar logo disponível no configurador.
  const vehicleIds = formData.getAll("vehicle_ids").map((value) => String(value)).filter(Boolean);

  if (!name) throw new Error("Nome do extra é obrigatório.");

  const { data, error } = await supabase
    .from("vehicle_extra_catalog")
    .insert({
      name,
      description,
      image_url,
      price,
      position: Number(positionRaw) || 0,
      is_active,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Associação imediata às viaturas novas escolhidas (vehicle_extras).
  if (vehicleIds.length) {
    const { error: linkError } = await supabase.from("vehicle_extras").insert(
      vehicleIds.map((vehicleId) => ({
        vehicle_id: vehicleId,
        catalog_extra_id: String(data.id),
        name,
        price,
      }))
    );
    if (linkError) throw new Error(linkError.message);
  }

  revalidateExtras();
  return { id: String(data.id) };
}

export async function updateVehicleExtraCatalog(id: string, formData: FormData) {
  const supabase = await adminClient();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const image_url = String(formData.get("image_url") || "").trim();
  const positionRaw = String(formData.get("position") || "0");
  const is_active = formData.get("is_active") === "on";

  if (!name) throw new Error("Nome do extra é obrigatório.");

  const { error } = await supabase.from("vehicle_extra_catalog").update({
    name,
    description,
    image_url,
    price: parsePrice(formData.get("price")),
    position: Number(positionRaw) || 0,
    is_active,
  }).eq("id", id);

  if (error) throw new Error(error.message);
  revalidateExtras();
}

export async function deleteVehicleExtraCatalog(id: string) {
  const supabase = await adminClient();
  const { error } = await supabase.from("vehicle_extra_catalog").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateExtras();
}

export async function createVehicleExtraVariant(extraId: string, formData: FormData) {
  const supabase = await adminClient();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Nome da variante é obrigatório.");

  const { error } = await supabase.from("vehicle_extra_variants").insert({
    extra_id: extraId,
    name,
    price: parsePrice(formData.get("price")),
    position: Number(String(formData.get("position") || "0")) || 0,
    is_active: formData.get("is_active") !== "off",
  });

  if (error) throw new Error(error.message);
  revalidateExtras();
}

export async function updateVehicleExtraVariant(id: string, formData: FormData) {
  const supabase = await adminClient();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Nome da variante é obrigatório.");

  const { error } = await supabase.from("vehicle_extra_variants").update({
    name,
    price: parsePrice(formData.get("price")),
    position: Number(String(formData.get("position") || "0")) || 0,
    is_active: formData.get("is_active") !== "off",
  }).eq("id", id);

  if (error) throw new Error(error.message);
  revalidateExtras();
}

export async function deleteVehicleExtraVariant(id: string) {
  const supabase = await adminClient();
  const { error } = await supabase.from("vehicle_extra_variants").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateExtras();
}
