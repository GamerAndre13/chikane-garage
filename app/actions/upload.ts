"use server";

import { uploadToR2, deleteFromR2 } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Upload de avatar do utilizador para R2
export async function uploadAvatar(formData: FormData): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  const file = formData.get("file") as File;
  if (!file) return { error: "Ficheiro não fornecido" };

  // Validar tipo e tamanho
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) return { error: "Tipo de ficheiro não suportado" };
  if (file.size > 5 * 1024 * 1024) return { error: "Ficheiro demasiado grande (máx. 5MB)" };

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Key: avatars/<user-id>-<timestamp>.<ext>
  const ext = file.name.split(".").pop() || "jpg";
  const key = `avatars/${user.id}-${Date.now()}.${ext}`;

  try {
    const url = await uploadToR2(key, buffer, file.type);

    // Atualizar perfil com nova URL
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: url, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) return { error: error.message };

    revalidatePath("/conta/perfil");
    return { url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro no upload" };
  }
}

// Upload de imagens de viatura para R2
export async function uploadVehicleImages(formData: FormData): Promise<{ urls?: string[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  // Verificar se é admin
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { error: "Sem permissão" };

  const vehicleId = formData.get("vehicleId") as string;
  if (!vehicleId) return { error: "ID da viatura não fornecido" };

  const files = formData.getAll("files") as File[];
  if (!files.length) return { error: "Nenhum ficheiro fornecido" };

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxSize = 10 * 1024 * 1024; // 10MB por imagem

  const urls: string[] = [];
  let uploadError: string | null = null;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!allowedTypes.includes(file.type)) continue;
    if (file.size > maxSize) continue;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.name.split(".").pop() || "jpg";
    const key = `vehicles/${vehicleId}/${Date.now()}-${i}.${ext}`;

    try {
      const url = await uploadToR2(key, buffer, file.type);
      urls.push(url);
    } catch (err) {
      uploadError = err instanceof Error ? err.message : "Erro ao enviar imagem para o R2";
    }
  }

  if (!urls.length) return { error: uploadError || "Nenhuma imagem válida para upload" };

  // Inserir na tabela vehicle_images
  const imagesToInsert = urls.map((url, idx) => ({
    vehicle_id: vehicleId,
    url,
    position: idx,
    alt_text: "",
  }));

  const { error } = await supabase.from("vehicle_images").insert(imagesToInsert);
  if (error) return { error: error.message };

  // Se for a primeira imagem e não há cover_image_url, atualizar
  const { data: vehicle } = await supabase.from("vehicles").select("cover_image_url").eq("id", vehicleId).single();
  if (vehicle && !vehicle.cover_image_url) {
    await supabase.from("vehicles").update({ cover_image_url: urls[0] }).eq("id", vehicleId);
  }

  revalidatePath(`/admin/veiculos/editar/${vehicleId}`);
  revalidatePath(`/catalogo/${vehicleId}`);

  return { urls };
}

// Definir imagem como capa
export async function setCoverImage(vehicleId: string, imageUrl: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { error: "Sem permissão" };

  const { error } = await supabase
    .from("vehicles")
    .update({ cover_image_url: imageUrl })
    .eq("id", vehicleId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/veiculos/editar/${vehicleId}`);
  revalidatePath(`/catalogo/${vehicleId}`);
  return {};
}

// Reordenar imagens
export async function reorderVehicleImages(vehicleId: string, imageIds: string[]): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { error: "Sem permissão" };

  // Atualizar positions em batch
  for (let i = 0; i < imageIds.length; i++) {
    await supabase.from("vehicle_images").update({ position: i }).eq("id", imageIds[i]);
  }

  revalidatePath(`/admin/veiculos/editar/${vehicleId}`);
  return {};
}

// Apagar imagem de viatura
export async function deleteVehicleImage(imageId: string, vehicleId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { error: "Sem permissão" };

  // Buscar URL para apagar do R2
  const { data: image } = await supabase.from("vehicle_images").select("url").eq("id", imageId).single();
  if (image?.url) {
    // Extrair key da URL
    const url = new URL(image.url);
    const key = url.pathname.split("/").slice(1).join("/"); // remove leading slash
    await deleteFromR2(key).catch(() => {}); // best effort
  }

  const { error } = await supabase.from("vehicle_images").delete().eq("id", imageId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/veiculos/editar/${vehicleId}`);
  return {};
}
