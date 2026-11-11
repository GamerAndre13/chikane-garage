"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { uploadSiteImage } from "@/app/actions/upload";

interface Campaign {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  badge: string | null;
  image_url: string | null;
  price_from: number | null;
  vehicle_id: string | null;
  cta_label: string | null;
  cta_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  position: number;
  created_at: string;
}

interface VehicleOption {
  id: string;
  slug: string;
  brand: string | null;
  model: string | null;
  trim: string | null;
  registration_year: number | null;
  sale_type: string | null;
}

interface CampaignImage {
  url: string;
  position: number | null;
}

const emptyForm = {
  title: "",
  slug: "",
  subtitle: "",
  description: "",
  badge: "",
  price_from: "",
  vehicle_id: "",
  cta_label: "",
  cta_url: "",
  starts_at: "",
  ends_at: "",
  position: "",
  is_active: true,
};

type CampaignForm = typeof emptyForm;

const fieldLabel = "mb-1 block text-[11px] uppercase tracking-[0.12em]";
const inputClass =
  "w-full rounded border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-copper";

// "Jantes de Inverno 2026" → "jantes-de-inverno-2026"
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Data ISO → valor de <input type="date"> no fuso local.
function toDateInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Valor de <input type="date"> → ISO. O fim do dia é 23:59:59.
function fromDateInput(value: string, endOfDay = false): string | null {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

const dateLabel = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
    : null;

export default function AdminCampanhasPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  // Fotografias da campanha: a primeira é a capa dos cartões.
  const [images, setImages] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [campaignsRes, vehiclesRes] = await Promise.all([
      supabase.from("campaigns").select("*").order("position", { ascending: true }).order("created_at", { ascending: false }),
      supabase
        .from("vehicles")
        .select("id, slug, brand, model, trim, registration_year, sale_type")
        .order("brand", { ascending: true })
        .order("model", { ascending: true }),
    ]);
    setCampaigns((campaignsRes.data as Campaign[]) || []);
    setVehicles((vehiclesRes.data as VehicleOption[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [campaignsRes, vehiclesRes] = await Promise.all([
        supabase.from("campaigns").select("*").order("position", { ascending: true }).order("created_at", { ascending: false }),
        supabase
          .from("vehicles")
          .select("id, slug, brand, model, trim, registration_year, sale_type")
          .order("brand", { ascending: true })
          .order("model", { ascending: true }),
      ]);
      if (cancelled) return;
      setCampaigns((campaignsRes.data as Campaign[]) || []);
      setVehicles((vehiclesRes.data as VehicleOption[]) || []);
      // A tabela pode ainda não existir (migração 027 por executar).
      if (campaignsRes.error) setError("A tabela de campanhas ainda não existe. Executa supabase/027_campaigns.sql no SQL Editor do Supabase.");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const nextPosition = useMemo(
    () => campaigns.reduce((highest, campaign) => Math.max(highest, Number(campaign.position) || 0), 0) + 1,
    [campaigns]
  );

  const vehicleLabel = (vehicle: VehicleOption) =>
    [vehicle.brand, vehicle.model, vehicle.trim, vehicle.registration_year].filter(Boolean).join(" · ");

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImages([]);
    setError(null);
  };

  const startEdit = async (campaign: Campaign) => {
    setEditingId(campaign.id);
    setForm({
      title: campaign.title,
      slug: campaign.slug,
      subtitle: campaign.subtitle || "",
      description: campaign.description || "",
      badge: campaign.badge || "",
      price_from: campaign.price_from != null ? String(campaign.price_from) : "",
      vehicle_id: campaign.vehicle_id || "",
      cta_label: campaign.cta_label || "",
      cta_url: campaign.cta_url || "",
      starts_at: toDateInput(campaign.starts_at),
      ends_at: toDateInput(campaign.ends_at),
      position: String(campaign.position ?? ""),
      is_active: campaign.is_active,
    });
    setError(null);
    // Fotos guardadas; se a migração 029 ainda não correu, usa a capa antiga.
    const { data: imageRows } = await supabase
      .from("campaign_images")
      .select("url, position")
      .eq("campaign_id", campaign.id)
      .order("position", { ascending: true });
    const saved = ((imageRows || []) as CampaignImage[]).map((image) => image.url).filter(Boolean);
    setImages(saved.length ? saved : campaign.image_url ? [campaign.image_url] : []);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Várias fotos de uma vez: cada uma é enviada para o R2 e acrescentada
  // à galeria da campanha.
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    const uploaded: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", `campaign_${Date.now()}_${uploaded.length}`);
        const result = await uploadSiteImage(formData);
        if (result.error) {
          setError(result.error);
          break;
        }
        if (result.url) uploaded.push(result.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar as imagens.");
    } finally {
      if (uploaded.length) setImages((prev) => [...prev, ...uploaded]);
      setUploading(false);
    }
  };

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((image) => image !== url));
  };

  // A capa é sempre a primeira foto da lista.
  const makeCover = (url: string) => {
    setImages((prev) => [url, ...prev.filter((image) => image !== url)]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.title.trim()) {
      setError("Indica o título da campanha.");
      return;
    }
    const slug = slugify(form.slug.trim() || form.title);
    if (!slug) {
      setError("Não foi possível gerar o identificador da campanha.");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      slug,
      subtitle: form.subtitle.trim(),
      description: form.description.trim(),
      badge: form.badge.trim(),
      // A primeira foto é a capa usada nos cartões.
      image_url: images[0] || null,
      price_from: form.price_from.trim() ? Number(form.price_from.replace(",", ".")) : null,
      vehicle_id: form.vehicle_id || null,
      cta_label: form.cta_label.trim() || "Ver campanha",
      cta_url: form.cta_url.trim() || null,
      starts_at: fromDateInput(form.starts_at),
      ends_at: fromDateInput(form.ends_at, true),
      is_active: form.is_active,
      position: form.position.trim() ? Number(form.position) : nextPosition,
    };
    let campaignId = editingId;
    if (editingId) {
      const result = await supabase.from("campaigns").update(payload).eq("id", editingId);
      if (result.error) {
        setError(
          result.error.code === "23505"
            ? "Já existe uma campanha com esse identificador. Muda o slug."
            : `Erro ao guardar: ${result.error.message}`
        );
        setSaving(false);
        return;
      }
    } else {
      const { data, error: insertError } = await supabase.from("campaigns").insert(payload).select("id").single();
      if (insertError || !data) {
        setError(
          insertError?.code === "23505"
            ? "Já existe uma campanha com esse identificador. Muda o slug."
            : `Erro ao guardar: ${insertError?.message ?? "tenta novamente."}`
        );
        setSaving(false);
        return;
      }
      campaignId = (data as { id: string }).id;
    }

    // Sincroniza a galeria (apaga e reinsere pela ordem atual). Se a migração
    // 029 ainda não tiver sido executada, a capa fica guardada em image_url.
    if (campaignId) {
      const { error: deleteImagesError } = await supabase.from("campaign_images").delete().eq("campaign_id", campaignId);
      if (!deleteImagesError && images.length) {
        const { error: imagesError } = await supabase.from("campaign_images").insert(
          images.map((url, index) => ({ campaign_id: campaignId, url, position: index }))
        );
        if (imagesError) setError(`Campanha guardada, mas as fotos não: ${imagesError.message}`);
      }
    }

    startCreate();
    await load();
    setSaving(false);
  };

  const toggleActive = async (campaign: Campaign) => {
    setSaving(true);
    setError(null);
    const { error: toggleError } = await supabase
      .from("campaigns")
      .update({ is_active: !campaign.is_active })
      .eq("id", campaign.id);
    if (toggleError) setError(toggleError.message);
    else await load();
    setSaving(false);
  };

  const handleDelete = async (campaign: Campaign) => {
    if (!confirm(`Apagar a campanha «${campaign.title}»?`)) return;
    setSaving(true);
    setError(null);
    const { error: deleteError } = await supabase.from("campaigns").delete().eq("id", campaign.id);
    if (deleteError) setError(deleteError.message);
    else {
      if (editingId === campaign.id) startCreate();
      await load();
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
          Campanhas
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Aparecem em <strong>/campanhas</strong> e na página inicial. Só ficam visíveis quando estão ativas e dentro das datas definidas.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded p-3 text-sm" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)" }}>
          {error}
        </div>
      )}

      <div className="mb-6 rounded border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm uppercase tracking-wide" style={{ color: "var(--foreground)" }}>
            {editingId ? "Editar campanha" : "Nova campanha"}
          </h2>
          {editingId && (
            <button type="button" onClick={startCreate} className="rounded border px-3 py-1 text-xs" style={{ borderColor: "var(--border)", color: "var(--silver)" }}>
              Cancelar edição
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <label htmlFor="campanha-titulo" className={fieldLabel} style={{ color: "var(--muted)" }}>Título *</label>
              <input id="campanha-titulo" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Jantes de inverno oferecidas" className={inputClass} style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
            </div>
            <div>
              <label htmlFor="campanha-slug" className={fieldLabel} style={{ color: "var(--muted)" }}>Identificador (slug)</label>
              <input id="campanha-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder={slugify(form.title) || "gerado do título"} className={inputClass} style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
            </div>
            <div>
              <label htmlFor="campanha-subtitulo" className={fieldLabel} style={{ color: "var(--muted)" }}>Subtítulo</label>
              <input id="campanha-subtitulo" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Linha curta de apoio" className={inputClass} style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
            </div>
            <div>
              <label htmlFor="campanha-etiqueta" className={fieldLabel} style={{ color: "var(--muted)" }}>Etiqueta</label>
              <input id="campanha-etiqueta" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Ex.: Últimas unidades" className={inputClass} style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
            </div>
            <div>
              <label htmlFor="campanha-preco" className={fieldLabel} style={{ color: "var(--muted)" }}>Preço desde (€)</label>
              <input id="campanha-preco" inputMode="decimal" value={form.price_from} onChange={(e) => setForm({ ...form, price_from: e.target.value })} placeholder="0,00" className={inputClass} style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label htmlFor="campanha-viatura" className={fieldLabel} style={{ color: "var(--muted)" }}>Viatura associada</label>
              <select id="campanha-viatura" value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} className={inputClass} style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
                <option value="">Sem viatura (usa o link próprio)</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>{vehicleLabel(vehicle)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="campanha-cta-label" className={fieldLabel} style={{ color: "var(--muted)" }}>Texto do botão</label>
              <input id="campanha-cta-label" value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} placeholder="Ver campanha" className={inputClass} style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
            </div>
            <div>
              <label htmlFor="campanha-cta-url" className={fieldLabel} style={{ color: "var(--muted)" }}>Link próprio</label>
              <input id="campanha-cta-url" value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} placeholder="/contacto ou https://…" className={inputClass} style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
            </div>
            <div>
              <label htmlFor="campanha-inicio" className={fieldLabel} style={{ color: "var(--muted)" }}>Início</label>
              <input id="campanha-inicio" type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className={inputClass} style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
            </div>
            <div>
              <label htmlFor="campanha-fim" className={fieldLabel} style={{ color: "var(--muted)" }}>Fim</label>
              <input id="campanha-fim" type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className={inputClass} style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
            </div>
            <div>
              <label htmlFor="campanha-ordem" className={fieldLabel} style={{ color: "var(--muted)" }}>Ordem</label>
              <input id="campanha-ordem" inputMode="numeric" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder={String(nextPosition)} className={inputClass} style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
            </div>
          </div>

          <div>
            <label htmlFor="campanha-descricao" className={fieldLabel} style={{ color: "var(--muted)" }}>Descrição</label>
            <textarea id="campanha-descricao" rows={8} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="O que está incluído, condições e prazo. Podes escrever várias linhas — as quebras de linha aparecem na página da campanha." className={inputClass} style={{ borderColor: "var(--border)", color: "var(--foreground)", resize: "vertical", minHeight: "9rem" }} />
            <p className="mt-1 text-[11px]" style={{ color: "var(--muted)" }}>
              Texto da página da campanha. As linhas em branco separam parágrafos.
            </p>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className={fieldLabel} style={{ color: "var(--muted)", marginBottom: 0 }}>Fotografias</span>
              <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                A primeira é a capa dos cartões da home e de /campanhas.
              </span>
            </div>

            {images.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {images.map((url, index) => (
                  <div key={`${url}-${index}`} className="group relative overflow-hidden rounded border" style={{ borderColor: index === 0 ? "var(--copper)" : "var(--border)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- imagens vêm do R2 (domínio configurável) */}
                    <img src={url} alt="" className="aspect-[16/10] w-full object-cover" />
                    {index === 0 && (
                      <span className="absolute left-0 top-0 px-2 py-0.5 text-[10px] uppercase tracking-wide" style={{ backgroundColor: "var(--copper)", color: "var(--background-alt)" }}>
                        Capa
                      </span>
                    )}
                    <div className="flex flex-wrap items-center gap-2 p-2">
                      {index !== 0 && (
                        <button type="button" onClick={() => makeCover(url)} className="text-[11px]" style={{ color: "var(--silver)" }}>
                          Tornar capa
                        </button>
                      )}
                      <button type="button" onClick={() => removeImage(url)} className="ml-auto text-[11px]" style={{ color: "#ef4444" }}>
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="rounded border px-3 py-1.5 text-xs transition-colors hover:border-copper" style={{ borderColor: "var(--border)", color: "var(--silver)" }}>
                {uploading ? "A carregar..." : images.length ? "+ Adicionar fotos" : "+ Escolher fotos"}
              </button>
              <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                Podes escolher várias de uma vez (JPG, PNG ou WEBP).
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => { void handleUpload(e.target.files); e.target.value = ""; }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--foreground)" }}>
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Ativa
            </label>

            <div className="ml-auto flex gap-2">
              <button type="submit" disabled={saving} className="rounded px-4 py-2 text-sm" style={{ backgroundColor: "var(--copper-deep)", color: "var(--background-alt)", opacity: saving ? 0.6 : 1 }}>
                {saving ? "A guardar..." : editingId ? "Guardar alterações" : "+ Criar campanha"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="rounded border px-4 py-6 text-center text-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)", color: "var(--muted)" }}>A carregar...</div>
        ) : campaigns.length === 0 ? (
          <div className="rounded border px-4 py-6 text-center text-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)", color: "var(--muted)" }}>Ainda sem campanhas criadas</div>
        ) : (
          campaigns.map((campaign) => {
            const vehicle = vehicles.find((item) => item.id === campaign.vehicle_id);
            return (
              <div key={campaign.id} className="rounded border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{campaign.title}</h3>
                      <span className="rounded px-2 py-0.5 text-[10px] uppercase tracking-wide" style={{ backgroundColor: campaign.is_active ? "rgba(34,197,94,0.12)" : "rgba(107,114,128,0.15)", color: campaign.is_active ? "#22c55e" : "var(--muted)" }}>
                        {campaign.is_active ? "Ativa" : "Inativa"}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--muted)" }}>#{campaign.position}</span>
                    </div>
                    <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                      /campanhas · {campaign.slug}
                      {vehicle ? ` · ${vehicleLabel(vehicle)}` : campaign.cta_url ? ` · ${campaign.cta_url}` : ""}
                    </p>
                    {(campaign.starts_at || campaign.ends_at) && (
                      <p className="mt-1 text-[11px]" style={{ color: "var(--muted)" }}>
                        {dateLabel(campaign.starts_at) || "Sem início"} → {dateLabel(campaign.ends_at) || "Sem fim"}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <button type="button" onClick={() => toggleActive(campaign)} disabled={saving} style={{ color: "var(--silver)" }}>
                      {campaign.is_active ? "Desativar" : "Ativar"}
                    </button>
                    <button type="button" onClick={() => void startEdit(campaign)} className="font-medium" style={{ color: "var(--copper-deep)" }}>
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(campaign)} disabled={saving} style={{ color: "#ef4444" }}>
                      Apagar
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
