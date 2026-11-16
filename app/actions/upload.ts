"use server";

import { uploadToR2, deleteFromR2 } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { canManageContent, canManageVehicles } from "@/lib/roles";

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

// Executa `fn` sobre cada item com um limite de paralelismo. Mantém a ordem
// dos resultados e evita lançar todos os uploads R2 ao mesmo tempo.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

// Upload de imagens de viatura para R2
export async function uploadVehicleImages(formData: FormData): Promise<{ urls?: string[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  // Verificar se é admin ou gestor de vendas (quem cria/edita viaturas).
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !canManageVehicles(profile.role)) return { error: "Sem permissão" };

  const vehicleId = formData.get("vehicleId") as string;
  if (!vehicleId) return { error: "ID da viatura não fornecido" };

  const files = formData.getAll("files") as File[];
  if (!files.length) return { error: "Nenhum ficheiro fornecido" };

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxSize = 10 * 1024 * 1024; // 10MB por imagem

  const validFiles = files.filter((file) => allowedTypes.includes(file.type) && file.size <= maxSize);

  // Uploads em paralelo (limitado): antes eram sequenciais e cada PUT esperava
  // pelo anterior — com muitas fotos somava vários segundos.
  const outcomes = await mapWithConcurrency(validFiles, 6, async (file, i) => {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "jpg";
    const key = `vehicles/${vehicleId}/${Date.now()}-${i}.${ext}`;
    try {
      const url = await uploadToR2(key, buffer, file.type);
      return { url, error: null as string | null };
    } catch (err) {
      return { url: null as string | null, error: err instanceof Error ? err.message : "Erro ao enviar imagem para o R2" };
    }
  });

  const urls: string[] = [];
  let uploadError: string | null = null;
  for (const outcome of outcomes) {
    if (outcome.url) urls.push(outcome.url);
    else if (outcome.error) uploadError = outcome.error;
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

  // Capa: se o cliente indicou que foto é a capa (índice), define-a já aqui —
  // evita uma segunda Server Action (setCoverImage) e uma leitura extra à BD.
  const coverIndexRaw = formData.get("coverIndex");
  const coverIndex =
    coverIndexRaw != null && String(coverIndexRaw) !== "" ? Number(coverIndexRaw) : null;

  if (coverIndex != null && Number.isInteger(coverIndex) && coverIndex >= 0 && coverIndex < urls.length) {
    await supabase.from("vehicles").update({ cover_image_url: urls[coverIndex] }).eq("id", vehicleId);
  } else {
    // Sem índice: só define a primeira imagem como capa se ainda não houver.
    const { data: vehicle } = await supabase.from("vehicles").select("cover_image_url").eq("id", vehicleId).single();
    if (vehicle && !vehicle.cover_image_url) {
      await supabase.from("vehicles").update({ cover_image_url: urls[0] }).eq("id", vehicleId);
    }
  }

  revalidatePath(`/admin/veiculos/editar/${vehicleId}`);
  revalidatePath("/admin/veiculos");
  revalidatePath("/usados");

  return { urls };
}

// Definir imagem como capa
export async function setCoverImage(vehicleId: string, imageUrl: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !canManageVehicles(profile.role)) return { error: "Sem permissão" };

  const { error } = await supabase
    .from("vehicles")
    .update({ cover_image_url: imageUrl })
    .eq("id", vehicleId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/veiculos/editar/${vehicleId}`);
  revalidatePath("/usados");
  return {};
}

// Reordenar imagens
export async function reorderVehicleImages(vehicleId: string, imageIds: string[]): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !canManageVehicles(profile.role)) return { error: "Sem permissão" };

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
  if (!profile || !canManageVehicles(profile.role)) return { error: "Sem permissão" };

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

// Upload de fotos das páginas (home / sobre) para R2 — usado em /admin/definicoes
export async function uploadSiteImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  // Verificar se é admin ou editor (conteúdo do site)
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !canManageContent(profile.role)) return { error: "Sem permissão" };

  const file = formData.get("file") as File;
  if (!file) return { error: "Ficheiro não fornecido" };

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) return { error: "Tipo de ficheiro não suportado (JPG, PNG ou WEBP)" };
  if (file.size > 10 * 1024 * 1024) return { error: "Ficheiro demasiado grande (máx. 10MB)" };

  // Identificador do slot vem do backoffice (photo_home_hero, photo_about_hero, ...)
  const name = String(formData.get("name") || "");
  if (!/^[a-z0-9_]{3,64}$/.test(name)) return { error: "Identificador de foto inválido" };

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const rawExt = (file.name.split(".").pop() || "").toLowerCase();
  const ext = /^[a-z0-9]{1,5}$/.test(rawExt) ? rawExt : "jpg";
  const key = `site/${name}-${Date.now()}.${ext}`;

  try {
    const url = await uploadToR2(key, buffer, file.type);
    return { url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro no upload" };
  }
}
