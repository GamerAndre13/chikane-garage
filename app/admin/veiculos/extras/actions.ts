"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function adminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Inicia sessão para continuar.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Não tens permissão para gerir os extras.");
  return supabase;
}

export async function createVehicleExtraCatalog(formData: FormData) {
  const supabase = await adminClient();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const priceRaw = String(formData.get("price") || "0").replace(",", ".");
  const positionRaw = String(formData.get("position") || "0");
  const is_active = formData.get("is_active") === "on";

  if (!name) throw new Error("Nome do extra é obrigatório.");

  const { error } = await supabase.from("vehicle_extra_catalog").insert({
    name,
    description,
    price: Number(priceRaw) || 0,
    position: Number(positionRaw) || 0,
    is_active,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/veiculos/extras");
  revalidatePath("/admin/veiculos/novo");
  revalidatePath("/admin/veiculos");
}

export async function updateVehicleExtraCatalog(id: string, formData: FormData) {
  const supabase = await adminClient();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const priceRaw = String(formData.get("price") || "0").replace(",", ".");
  const positionRaw = String(formData.get("position") || "0");
  const is_active = formData.get("is_active") === "on";

  if (!name) throw new Error("Nome do extra é obrigatório.");

  const { error } = await supabase.from("vehicle_extra_catalog").update({
    name,
    description,
    price: Number(priceRaw) || 0,
    position: Number(positionRaw) || 0,
    is_active,
  }).eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/veiculos/extras");
  revalidatePath("/admin/veiculos/novo");
  revalidatePath("/admin/veiculos");
}

export async function deleteVehicleExtraCatalog(id: string) {
  const supabase = await adminClient();
  const { error } = await supabase.from("vehicle_extra_catalog").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/veiculos/extras");
  revalidatePath("/admin/veiculos/novo");
  revalidatePath("/admin/veiculos");
}
