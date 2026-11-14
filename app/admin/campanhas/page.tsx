"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { uploadSiteImage } from "@/app/actions/upload";
import { validarNumero, validarSlug, validarUrl } from "@/lib/validacao";
import { FieldError, campoClasse } from "@/components/ui/field-error";

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

// O fim da campanha não pode ser anterior ao início.
function validarDataFim(inicio: string, fim: string): string | null {
  if (inicio && fim && fim < inicio) return "O fim não pode ser anterior ao início.";
  return null;
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
  // Imagem de capa (topo da página e cartões) + fotografias adicionais.
  const [cover, setCover] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Erros por campo (itens 13/14): validados ao sair do campo, com a mensagem
  // por baixo do input e o rebordo vermelho até o valor ficar válido.
  const [erros, setErros] = useState<Record<string, string | null>>({});
  // Pesquisa da lista de campanhas (item 18).
  const [search, setSearch] = useState("");
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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

  // Lista filtrada pela pesquisa (título, slug, subtítulo ou viatura).
  const campaignsVisible = useMemo(() => {
    const termo = search.trim().toLowerCase();
    if (!termo) return campaigns;
    const label = (vehicle: VehicleOption) =>
      [vehicle.brand, vehicle.model, vehicle.trim, vehicle.registration_year].filter(Boolean).join(" · ");
    return campaigns.filter((campaign) => {
      const viatura = campaign.vehicle_id ? vehicles.find((item) => item.id === campaign.vehicle_id) : null;
      return [campaign.title, campaign.slug, campaign.subtitle, campaign.badge, viatura ? label(viatura) : ""]
        .some((valor) => (valor || "").toLowerCase().includes(termo));
    });
  }, [campaigns, search, vehicles]);

  const vehicleLabel = (vehicle: VehicleOption) =>
    [vehicle.brand, vehicle.model, vehicle.trim, vehicle.registration_year].filter(Boolean).join(" · ");

  // Validação de um campo (ao sair dele e enquanto tiver erro). Recebe o valor
  // atual porque no onChange o estado ainda não foi atualizado.
  const calcularErro = (campo: string, valor: string, atual: CampaignForm = form): string | null => {
    switch (campo) {
      case "title":
        return valor.trim() ? null : "Indica o título da campanha.";
      case "slug":
        return valor.trim() ? validarSlug(slugify(valor)) : null;
      case "price_from":
        return validarNumero(valor, { rotulo: "O preço desde", min: 0, obrigatorio: false });
      case "position":
        return validarNumero(valor, { rotulo: "A ordem", min: 0, inteiro: true, obrigatorio: false });
      case "cta_url":
        return validarUrl(valor);
      case "starts_at":
        return validarDataFim(atual.starts_at, atual.ends_at);
      case "ends_at":
        return validarDataFim(atual.starts_at, valor);
      default:
        return null;
    }
  };

  const validarCampo = (campo: string) => {
    const msg = calcularErro(campo, String(form[campo as keyof CampaignForm] ?? ""));
    setErros((prev) => ({ ...prev, [campo]: msg }));
    return msg;
  };

  // Atualiza o valor e, se o campo já estava marcado, revalida-o para o vermelho
  // desaparecer assim que a informação fica válida.
  const atualizarCampo = (campo: keyof CampaignForm, valor: string) => {
    const seguinte = { ...form, [campo]: valor } as CampaignForm;
    setForm(seguinte);
    if (!erros[campo]) return;
    setErros((prev) => ({ ...prev, [campo]: calcularErro(campo, valor, seguinte) }));
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setCover("");
    setImages([]);
    setError(null);
    setErros({});
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
    setErros({});
    // Fotos guardadas; se a migração 029 ainda não correu, usa a capa antiga.
    const { data: imageRows } = await supabase
      .from("campaign_images")
      .select("url, position")
      .eq("campaign_id", campaign.id)
      .order("position", { ascending: true });
    const saved = ((imageRows || []) as CampaignImage[]).map((image) => image.url).filter(Boolean);
    // A capa é própria (image_url); nas fotos adicionais ficam só as restantes.
    const coverUrl = campaign.image_url || saved[0] || "";
    setCover(coverUrl);
    setImages(coverUrl ? saved.filter((url) => url !== coverUrl) : saved);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Imagem de capa: um único ficheiro, usado no topo da página da campanha e
  // nos cartões da home e de /campanhas.
  const handleCoverUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", `campaign_cover_${Date.now()}`);
      const result = await uploadSiteImage(formData);
      if (result.error) setError(result.error);
      else if (result.url) setCover(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar a imagem de capa.");
    } finally {
      setUploading(false);
    }
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

  // A ordem desta galeria é a ordem em que as fotos aparecem na página da
  // campanha: sobe/desce uma posição de cada vez (igual às fotos das viaturas).
  const moveImage = (index: number, delta: number) => {
    setImages((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    // Validar todos os campos visíveis antes de guardar: os erros ficam por
    // baixo de cada input, a vermelho.
    const campos: Record<string, string | null> = {
      title: calcularErro("title", form.title),
      slug: calcularErro("slug", form.slug),
      price_from: calcularErro("price_from", form.price_from),
      position: calcularErro("position", form.position),
      cta_url: calcularErro("cta_url", form.cta_url),
      starts_at: calcularErro("starts_at", form.starts_at, form),
      ends_at: calcularErro("ends_at", form.ends_at, form),
    };
    setErros((prev) => ({ ...prev, ...campos }));
    if (Object.values(campos).some(Boolean)) {
      setError("Confirma os campos assinalados a vermelho.");
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
      // A capa é própria; sem capa usa-se a primeira foto adicional.
      image_url: cover || images[0] || null,
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

    // Sincroniza as fotos adicionais (apaga e reinsere pela ordem atual). A
    // capa fica só em image_url. Se a migração 029 ainda não tiver sido
    // executada, a capa continua guardada.
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
              <input
                id="campanha-titulo"
                required
                value={form.title}
                aria-invalid={Boolean(erros.title)}
                onBlur={() => validarCampo("title")}
                onChange={(e) => atualizarCampo("title", e.target.value)}
                placeholder="Ex.: Jantes de inverno oferecidas"
                className={campoClasse(inputClass, erros.title)}
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              />
              <FieldError message={erros.title} />
            </div>
            <div>
              <label htmlFor="campanha-slug" className={fieldLabel} style={{ color: "var(--muted)" }}>Identificador (slug)</label>
              <input
                id="campanha-slug"
                value={form.slug}
                aria-invalid={Boolean(erros.slug)}
                onBlur={() => validarCampo("slug")}
                onChange={(e) => atualizarCampo("slug", e.target.value)}
                placeholder={slugify(form.title) || "gerado do título"}
                className={campoClasse(inputClass, erros.slug)}
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              />
              <FieldError message={erros.slug} />
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
              <input
                id="campanha-preco"
                inputMode="decimal"
                value={form.price_from}
                aria-invalid={Boolean(erros.price_from)}
                onBlur={() => validarCampo("price_from")}
                onChange={(e) => atualizarCampo("price_from", e.target.value)}
                placeholder="0,00"
                className={campoClasse(inputClass, erros.price_from)}
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              />
              <FieldError message={erros.price_from} />
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
              <input
                id="campanha-cta-url"
                value={form.cta_url}
                aria-invalid={Boolean(erros.cta_url)}
                onBlur={() => validarCampo("cta_url")}
                onChange={(e) => atualizarCampo("cta_url", e.target.value)}
                placeholder="/contacto ou https://…"
                className={campoClasse(inputClass, erros.cta_url)}
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              />
              <FieldError message={erros.cta_url} />
            </div>
            <div>
              <label htmlFor="campanha-inicio" className={fieldLabel} style={{ color: "var(--muted)" }}>Início</label>
              <input
                id="campanha-inicio"
                type="date"
                value={form.starts_at}
                aria-invalid={Boolean(erros.starts_at)}
                onBlur={() => validarCampo("starts_at")}
                onChange={(e) => atualizarCampo("starts_at", e.target.value)}
                className={campoClasse(inputClass, erros.starts_at)}
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              />
              <FieldError message={erros.starts_at} />
            </div>
            <div>
              <label htmlFor="campanha-fim" className={fieldLabel} style={{ color: "var(--muted)" }}>Fim</label>
              <input
                id="campanha-fim"
                type="date"
                value={form.ends_at}
                aria-invalid={Boolean(erros.ends_at)}
                onBlur={() => validarCampo("ends_at")}
                onChange={(e) => atualizarCampo("ends_at", e.target.value)}
                className={campoClasse(inputClass, erros.ends_at)}
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              />
              <FieldError message={erros.ends_at} />
            </div>
            <div>
              <label htmlFor="campanha-ordem" className={fieldLabel} style={{ color: "var(--muted)" }}>Ordem</label>
              <input
                id="campanha-ordem"
                inputMode="numeric"
                value={form.position}
                aria-invalid={Boolean(erros.position)}
                onBlur={() => validarCampo("position")}
                onChange={(e) => atualizarCampo("position", e.target.value)}
                placeholder={String(nextPosition)}
                className={campoClasse(inputClass, erros.position)}
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              />
              <FieldError message={erros.position} />
            </div>
          </div>

          <div>
            <label htmlFor="campanha-descricao" className={fieldLabel} style={{ color: "var(--muted)" }}>Descrição</label>
            <textarea id="campanha-descricao" rows={8} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="O que está incluído, condições e prazo. Podes escrever várias linhas — as quebras de linha aparecem na página da campanha." className={inputClass} style={{ borderColor: "var(--border)", color: "var(--foreground)", resize: "vertical", minHeight: "9rem" }} />
            <p className="mt-1 text-[11px]" style={{ color: "var(--muted)" }}>
              Texto da página da campanha. As linhas em branco separam parágrafos.
            </p>
          </div>

          {/* Imagem de capa — topo da página da campanha e cartões */}
          <div className="rounded border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className={fieldLabel} style={{ color: "var(--muted)", marginBottom: 0 }}>Imagem de capa</span>
              <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                Aparece em cima na página da campanha e nos cartões da home e de /campanhas.
              </span>
            </div>

            <div className="flex flex-wrap items-start gap-4">
              <div className="w-full max-w-72 overflow-hidden rounded border" style={{ borderColor: cover ? "var(--copper)" : "var(--border)" }}>
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element -- imagens vêm do R2 (domínio configurável)
                  <img src={cover} alt="" className="aspect-[16/9] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[16/9] w-full items-center justify-center text-[11px]" style={{ backgroundColor: "var(--background)", color: "var(--muted)" }}>
                    Sem imagem de capa
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => coverInputRef.current?.click()} disabled={uploading} className="rounded border px-3 py-1.5 text-xs transition-colors hover:border-copper" style={{ borderColor: "var(--border)", color: "var(--silver)" }}>
                  {uploading ? "A carregar..." : cover ? "Trocar capa" : "Escolher capa"}
                </button>
                {cover && (
                  <button type="button" onClick={() => setCover("")} className="text-[11px] text-left" style={{ color: "#ef4444" }}>
                    Remover capa
                  </button>
                )}
                <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                  Uma só imagem (JPG, PNG ou WEBP). Aparece com 16:9 — recomendado 1600 × 900 px.
                </span>
              </div>

              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => { void handleCoverUpload(e.target.files); e.target.value = ""; }}
              />
            </div>
          </div>

          {/* Fotos adicionais — galeria da página da campanha */}
          <div className="rounded border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className={fieldLabel} style={{ color: "var(--muted)", marginBottom: 0 }}>Fotos adicionais</span>
              <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                Galeria que aparece abaixo do texto na página da campanha.
              </span>
            </div>

            {images.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {images.map((url, index) => (
                  <div key={`${url}-${index}`} className="group relative overflow-hidden rounded border" style={{ borderColor: "var(--border)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- imagens vêm do R2 (domínio configurável) */}
                    <img src={url} alt="" className="aspect-[16/10] w-full object-cover" />
                    <span className="absolute right-2 top-2 rounded px-1.5 py-0.5 text-[10px] tabular-nums" style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "#fff" }}>
                      {index + 1}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 p-2">
                      <button
                        type="button"
                        onClick={() => moveImage(index, -1)}
                        disabled={index === 0}
                        aria-label={`Mover foto ${index + 1} para cima`}
                        className="rounded border px-2 py-1 text-[11px] transition-colors hover:border-copper disabled:opacity-30"
                        style={{ borderColor: "var(--border)", color: "var(--silver)" }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(index, 1)}
                        disabled={index === images.length - 1}
                        aria-label={`Mover foto ${index + 1} para baixo`}
                        className="rounded border px-2 py-1 text-[11px] transition-colors hover:border-copper disabled:opacity-30"
                        style={{ borderColor: "var(--border)", color: "var(--silver)" }}
                      >
                        ↓
                      </button>
                      <button type="button" onClick={() => removeImage(url)} className="ml-auto text-[11px]" style={{ color: "#ef4444" }}>
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => galleryInputRef.current?.click()} disabled={uploading} className="rounded border px-3 py-1.5 text-xs transition-colors hover:border-copper" style={{ borderColor: "var(--border)", color: "var(--silver)" }}>
                {uploading ? "A carregar..." : images.length ? "+ Adicionar fotos" : "+ Escolher fotos"}
              </button>
              <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                Podes escolher várias de uma vez (JPG, PNG ou WEBP).
              </span>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => { void handleUpload(e.target.files); e.target.value = ""; }}
              />
            </div>
            <p className="mt-2 text-[11px]" style={{ color: "var(--muted)" }}>
              Aparecem na galeria da campanha com 16:10 (recomendado 1600 × 1000 px) e largura até 1200 px no ecrã.
            </p>
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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Pesquisar campanhas"
          placeholder="Pesquisar por título, slug ou viatura…"
          className="min-h-11 w-full rounded border bg-background px-3 py-2 text-sm sm:w-96"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="min-h-11 rounded border px-3 py-2 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--silver)" }}
          >
            Limpar pesquisa
          </button>
        )}
        <span className="ml-auto text-xs" style={{ color: "var(--muted)" }}>
          {campaignsVisible.length} de {campaigns.length} campanhas
        </span>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="rounded border px-4 py-6 text-center text-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)", color: "var(--muted)" }}>A carregar...</div>
        ) : campaignsVisible.length === 0 ? (
          <div className="rounded border px-4 py-6 text-center text-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)", color: "var(--muted)" }}>
            {search.trim() ? "Nenhum resultado para esta pesquisa." : "Ainda sem campanhas criadas"}
          </div>
        ) : (
          campaignsVisible.map((campaign) => {
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
