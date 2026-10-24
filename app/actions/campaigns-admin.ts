"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";

// Gerir campanhas promocionais (página pública /campanhas).
async function adminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Inicia sessão para continuar.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Não tens permissão para gerir campanhas.");
  return { supabase };
}

const text = (form: FormData, key: string, max = 500) => String(form.get(key) ?? "").trim().slice(0, max);

function falhar(mensagem: string): never {
  redirect(`/admin/loja/campanhas?erro=${encodeURIComponent(mensagem)}`);
}

async function acaoCampanha(executar: (supabase: Awaited<ReturnType<typeof createClient>>) => Promise<void>) {
  try {
    await executar((await adminClient()).supabase);
  } catch (error) {
    console.error("[campaigns-admin]", error);
    falhar(error instanceof Error ? error.message : "Não foi possível concluir a operação. Tenta novamente.");
  }
}

function r2KeyFromUrl(url: string) {
  try {
    const base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
    if (base && url.startsWith(base)) return url.slice(base.length).replace(/^\/+/, "");
    const parsed = new URL(url);
    return parsed.pathname.split("/").slice(1).join("/");
  } catch { return ""; }
}

export async function saveCampaign(form: FormData) {
  await acaoCampanha(async (supabase) => {
    const id = text(form, "id", 64);
    const title = text(form, "title", 140);
    if (title.length < 2) throw new Error("Indica o título da campanha.");
    const startsAt = text(form, "starts_at", 30);
    const endsAt = text(form, "ends_at", 30);
    if (startsAt && endsAt && startsAt > endsAt) throw new Error("A data de início tem de ser anterior à do fim.");
    const buttonHref = text(form, "button_href", 500);
    if (buttonHref && !/^(https?:\/\/|\/|#)/i.test(buttonHref)) throw new Error("A ligação do botão deve começar por /, # ou https://.");
    const data = {
      title,
      description: text(form, "description", 1200),
      button_label: text(form, "button_label", 60),
      button_href: buttonHref,
      starts_at: startsAt || null,
      ends_at: endsAt || null,
      position: Math.max(0, Math.round(Number(text(form, "position", 10)) || 0)),
      is_active: form.get("is_active") === "on",
    };

    let campaignId = id;
    if (id) {
      const { error } = await supabase.from("campaigns").update(data).eq("id", id);
      if (error) throw new Error("Não foi possível guardar a campanha.");
    } else {
      const { data: created, error } = await supabase.from("campaigns").insert(data).select("id").single();
      if (error || !created) throw new Error("Não foi possível criar a campanha.");
      campaignId = created.id;
    }

    const image = form.get("image");
    if (image instanceof File && image.size > 0) {
      if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(image.type) || image.size > 10 * 1024 * 1024) throw new Error("Escolhe uma imagem JPG, PNG ou WEBP até 10 MB.");
      const { data: current } = await supabase.from("campaigns").select("image_url").eq("id", campaignId).maybeSingle();
      const ext = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
      const url = await uploadToR2(`campaigns/${campaignId}/${Date.now()}.${ext}`, Buffer.from(await image.arrayBuffer()), image.type);
      const { error } = await supabase.from("campaigns").update({ image_url: url }).eq("id", campaignId);
      if (error) throw new Error("A fotografia foi enviada, mas não ficou associada à campanha.");
      const oldKey = current?.image_url ? r2KeyFromUrl(current.image_url) : "";
      if (oldKey && oldKey !== r2KeyFromUrl(url)) await deleteFromR2(oldKey).catch(() => {});
    }

    revalidatePath("/campanhas"); revalidatePath("/admin/loja/campanhas");
  });
}

// Apaga a campanha e remove a fotografia do R2 quando possível.
export async function deleteCampaign(form: FormData) {
  await acaoCampanha(async (supabase) => {
    const id = text(form, "id", 64);
    if (!id) return;
    const { data: campaign } = await supabase.from("campaigns").select("image_url").eq("id", id).maybeSingle();
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) throw new Error("Não foi possível apagar a campanha.");
    const key = campaign?.image_url ? r2KeyFromUrl(campaign.image_url) : "";
    if (key) await deleteFromR2(key).catch(() => {});
    revalidatePath("/campanhas"); revalidatePath("/admin/loja/campanhas");
  });
}
