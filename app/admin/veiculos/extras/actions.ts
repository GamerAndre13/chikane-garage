"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

export async function createVehicleExtraCatalog(formData: FormData) {
  const supabase = await adminClient();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const positionRaw = String(formData.get("position") || "0");
  const is_active = formData.get("is_active") === "on";

  if (!name) throw new Error("Nome do extra é obrigatório.");

  const { error } = await supabase.from("vehicle_extra_catalog").insert({
    name,
    description,
    price: parsePrice(formData.get("price")),
    position: Number(positionRaw) || 0,
    is_active,
  });

  if (error) throw new Error(error.message);
  revalidateExtras();
}

export async function updateVehicleExtraCatalog(id: string, formData: FormData) {
  const supabase = await adminClient();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const positionRaw = String(formData.get("position") || "0");
  const is_active = formData.get("is_active") === "on";

  if (!name) throw new Error("Nome do extra é obrigatório.");

  const { error } = await supabase.from("vehicle_extra_catalog").update({
    name,
    description,
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
