"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteFromR2 } from "@/lib/r2";

// Cliente admin: sessão do utilizador + verificação de role (padrão do backoffice).
async function adminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada. Volta a entrar.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Sem permissões de administrador.");
  return { supabase, user };
}

function r2KeyFromUrl(url: string) {
  try {
    const base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
    if (base && url.startsWith(base)) return url.slice(base.length).replace(/^\/+/, "");
    const parsed = new URL(url);
    return parsed.pathname.split("/").slice(1).join("/");
  } catch { return ""; }
}

// Apagar viatura: remove a linha (imagens/características em cascade) e limpa os ficheiros do R2.
export async function deleteVehicle(id: string) {
  const { supabase } = await adminClient();
  if (!id) throw new Error("Viatura inválida.");
  const { data: vehicle } = await supabase.from("vehicles").select("id,slug,cover_image_url,vehicle_images(url)").eq("id", id).maybeSingle();
  if (!vehicle) throw new Error("Viatura não encontrada.");
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw new Error("Não foi possível apagar a viatura.");
  const urls = [vehicle.cover_image_url, ...(vehicle.vehicle_images ?? []).map((image) => image.url)].filter((url): url is string => Boolean(url));
  for (const url of urls) {
    const key = r2KeyFromUrl(url);
    if (key) await deleteFromR2(key).catch(() => {}); // limpeza best effort
  }
  revalidatePath("/admin/veiculos");
  revalidatePath("/catalogo");
  if (vehicle.slug) revalidatePath(`/catalogo/${vehicle.slug}`);
}
