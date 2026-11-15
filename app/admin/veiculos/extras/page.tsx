"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  createVehicleExtraCatalog,
  updateVehicleExtraCatalog,
  updateVehicleExtraAssociations,
  deleteVehicleExtraCatalog,
  createVehicleExtraVariant,
  updateVehicleExtraVariant,
  deleteVehicleExtraVariant,
  uploadVehicleExtraImage,
} from "./actions";
import { cheapestVariantFor } from "@/lib/extra-variants";
import { validarNumero } from "@/lib/validacao";
import { FieldError, campoClasse } from "@/components/ui/field-error";
import { useDialogs } from "@/components/ui/dialogs";

interface ExtraCatalog {
  id: string;
  name: string;
  description: string | null;
  category: string;
  image_url: string | null;
  price: number;
  position: number;
  is_active: boolean;
}

interface ExtraVariant {
  id: string;
  extra_id: string;
  name: string;
  price: number;
  position: number;
  is_active: boolean;
}

interface NewVehicleOption {
  id: string;
  brand: string | null;
  model: string | null;
  trim: string | null;
  registration_year: number | null;
}

const fieldLabel = "mb-1 block text-[11px] uppercase tracking-[0.12em]";
const inputClass = "w-full rounded border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-copper";

// Campo de fotografia reutilizado na criação e na edição de cada extra.
// O upload é feito para o R2 e a URL pública fica guardada em image_url.
function ExtraImageField({
  value,
  onChange,
  label = "Fotografia do extra",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadVehicleExtraImage(formData);
      if (result.error) setError(result.error);
      else if (result.url) onChange(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar a imagem.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <span className={fieldLabel} style={{ color: "var(--muted)" }}>{label}</span>
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL vem do R2 (domínio configurável)
          <img src={value} alt="" className="h-14 w-20 rounded border object-cover" style={{ borderColor: "var(--border)" }} />
        ) : (
          <div className="flex h-14 w-20 items-center justify-center rounded border text-center text-[10px]" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
            Sem foto
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="cursor-pointer rounded border px-3 py-1.5 text-xs transition-colors hover:border-copper" style={{ borderColor: "var(--border)", color: "var(--silver)" }}>
            {uploading ? "A carregar..." : value ? "Trocar foto" : "Escolher foto"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => { void handleFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
            />
          </label>
          {value && (
            <button type="button" onClick={() => onChange("")} className="text-left text-[11px]" style={{ color: "#ef4444" }}>
              Remover foto
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-[10px]" style={{ color: "var(--muted)" }}>JPG, PNG, WEBP ou AVIF · máx. 5 MB</p>
      {/* Item 6: tamanho onde a foto aparece no configurador da viatura nova. */}
      <p className="mt-0.5 text-[10px]" style={{ color: "var(--muted-deep)" }}>Aparece num quadrado de 80 × 80 px — envia o motivo ao centro (recomendado 320 × 320 px).</p>
      {error && <p className="mt-1 text-[11px]" style={{ color: "#ef4444" }}>{error}</p>}
    </div>
  );
}

export default function VehicleExtrasCatalogPage() {
  const [items, setItems] = useState<ExtraCatalog[]>([]);
  const [variants, setVariants] = useState<ExtraVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newVariant, setNewVariant] = useState({ name: "", price: "", position: "" });

  // Preço e ordem começam vazios (e identificados) para não aparecerem
  // dois "0" sem contexto ao criar um extra.
  const [newItem, setNewItem] = useState({ name: "", description: "", category: "", image_url: "", price: "", position: "", is_active: true });
  // Variantes que serão criadas logo a seguir ao extra.
  const [draftVariants, setDraftVariants] = useState<{ name: string; price: string }[]>([]);
  // Viaturas novas onde o extra pode ficar associado logo na criação.
  const [newVehicles, setNewVehicles] = useState<NewVehicleOption[]>([]);
  const [associations, setAssociations] = useState<string[]>([]);
  // Associações já existentes (extra ↔ viatura nova), para poderem ser
  // alteradas depois de o extra estar criado.
  const [links, setLinks] = useState<{ vehicle_id: string; catalog_extra_id: string | null }[]>([]);
  const [assocDraft, setAssocDraft] = useState<Record<string, string[]>>({});
  // Fotografias em edição (por id do extra), para não escrever no formulário
  // controlado de cada linha da lista.
  const [images, setImages] = useState<Record<string, string>>({});
  // Erros por campo (itens 13/14): a chave identifica o campo («novo.name»,
  // «extra-<id>.price», «variante-<id>.position»…). As mensagens aparecem por
  // baixo do input e o campo fica a vermelho até o valor ficar válido.
  const [erros, setErros] = useState<Record<string, string | null>>({});
  // Pesquisa do catálogo (item 18).
  const [search, setSearch] = useState("");
  const { confirmar } = useDialogs();

  const calcularErro = (campo: string, valor: string): string | null => {
    if (campo.endsWith(".name")) {
      const nome = valor.trim();
      if (!nome) return "Indica o nome.";
      if (nome.length > 80) return "O nome não pode ter mais de 80 caracteres.";
      return null;
    }
    if (campo.endsWith(".price")) {
      return validarNumero(valor, { rotulo: "O preço", min: 0, obrigatorio: false });
    }
    if (campo.endsWith(".position")) {
      return validarNumero(valor, { rotulo: "A ordem", min: 0, inteiro: true, obrigatorio: false });
    }
    return null;
  };

  const validarCampo = (campo: string, valor: string) => {
    const msg = calcularErro(campo, valor);
    setErros((prev) => ({ ...prev, [campo]: msg }));
    return msg;
  };

  // Revalida só quando o campo já estava marcado, para o vermelho desaparecer
  // assim que o valor fica válido.
  const aoAlterar = (campo: string, valor: string) => {
    if (!erros[campo]) return;
    setErros((prev) => ({ ...prev, [campo]: calcularErro(campo, valor) }));
  };

  const load = useCallback(async () => {
    const [catalogRes, variantsRes, linksRes] = await Promise.all([
      supabase.from("vehicle_extra_catalog").select("*").order("position", { ascending: true }).order("name", { ascending: true }),
      supabase.from("vehicle_extra_variants").select("*").order("position", { ascending: true }).order("name", { ascending: true }),
      supabase.from("vehicle_extras").select("vehicle_id, catalog_extra_id"),
    ]);
    setItems((catalogRes.data as ExtraCatalog[]) || []);
    setVariants((variantsRes.data as ExtraVariant[]) || []);
    const rows = (linksRes.data as { vehicle_id: string; catalog_extra_id: string | null }[]) || [];
    setLinks(rows);
    // Depois de guardar, as seleções em edição passam a refletir a BD.
    setAssocDraft({});
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [catalogRes, variantsRes, linksRes] = await Promise.all([
        supabase.from("vehicle_extra_catalog").select("*").order("position", { ascending: true }).order("name", { ascending: true }),
        supabase.from("vehicle_extra_variants").select("*").order("position", { ascending: true }).order("name", { ascending: true }),
        supabase.from("vehicle_extras").select("vehicle_id, catalog_extra_id"),
      ]);
      if (cancelled) return;
      setItems((catalogRes.data as ExtraCatalog[]) || []);
      setVariants((variantsRes.data as ExtraVariant[]) || []);
      setLinks(((linksRes.data as { vehicle_id: string; catalog_extra_id: string | null }[]) || []));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Viaturas novas (por encomenda) para associar o extra logo na criação.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id, brand, model, trim, registration_year")
        .eq("sale_type", "new")
        .order("brand", { ascending: true })
        .order("model", { ascending: true });
      if (cancelled) return;
      const vehicles = (data as NewVehicleOption[]) || [];
      setNewVehicles(vehicles);
      setAssociations(vehicles.map((vehicle) => vehicle.id));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allAssociated = newVehicles.length > 0 && associations.length === newVehicles.length;
  const toggleAllAssociations = () =>
    setAssociations(allAssociated ? [] : newVehicles.map((vehicle) => vehicle.id));

  // Categorias já usadas, para a lista de sugestões (datalist).
  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt")),
    [items]
  );

  // Ordem automática: o próximo extra entra no fim; o campo continua editável.
  const nextPosition = useMemo(
    () => items.reduce((highest, item) => Math.max(highest, Number(item.position) || 0), 0) + 1,
    [items]
  );

  // Lista filtrada pela pesquisa (nome, descrição ou categoria).
  const itemsVisible = useMemo(() => {
    const termo = search.trim().toLowerCase();
    if (!termo) return items;
    return items.filter((item) =>
      [item.name, item.description, item.category].some((valor) => (valor || "").toLowerCase().includes(termo))
    );
  }, [items, search]);

  // O mesmo para as variantes, dentro de cada extra.
  const nextVariantPosition = (extraId: string) =>
    variants
      .filter((variant) => variant.extra_id === extraId)
      .reduce((highest, variant) => Math.max(highest, Number(variant.position) || 0), 0) + 1;

  // Viaturas associadas a um extra: a edição em curso tem prioridade sobre a BD.
  const linksOf = (extraId: string) =>
    links.filter((link) => link.catalog_extra_id === extraId).map((link) => link.vehicle_id);
  const draftAssociations = (extraId: string) => assocDraft[extraId] ?? linksOf(extraId);

  const imageFor = (item: ExtraCatalog) => images[item.id] ?? item.image_url ?? "";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validar o extra e as variantes escritas no formulário antes de guardar.
    const campos: Record<string, string | null> = {
      "novo.name": calcularErro("novo.name", newItem.name),
      "novo.price": calcularErro("novo.price", newItem.price),
      "novo.position": calcularErro("novo.position", newItem.position),
    };
    draftVariants.forEach((variant, index) => {
      campos[`draft.${index}.name`] = calcularErro("draft.0.name", variant.name);
      campos[`draft.${index}.price`] = calcularErro("draft.0.price", variant.price);
    });
    setErros((prev) => ({ ...prev, ...campos }));
    if (Object.values(campos).some(Boolean)) {
      setError("Confirma os campos assinalados a vermelho.");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", newItem.name);
      formData.append("description", newItem.description);
      formData.append("category", newItem.category);
      formData.append("image_url", newItem.image_url);
      formData.append("price", newItem.price);
      // Sem ordem escolhida, usa automaticamente a próxima livre.
      formData.append("position", newItem.position.trim() || String(nextPosition));
      if (newItem.is_active) formData.append("is_active", "on");
      // Associação imediata às viaturas novas que ficaram marcadas.
      associations.forEach((vehicleId) => formData.append("vehicle_ids", vehicleId));

      const created = await createVehicleExtraCatalog(formData);

      // Variantes escritas no próprio formulário de criação.
      const pending = draftVariants.filter((variant) => variant.name.trim());
      for (const variant of pending) {
        const variantData = new FormData();
        variantData.append("name", variant.name.trim());
        variantData.append("price", variant.price);
        await createVehicleExtraVariant(created.id, variantData);
      }

      setNewItem({ name: "", description: "", category: "", image_url: "", price: "", position: "", is_active: true });
      setDraftVariants([]);
      setAssociations(newVehicles.map((vehicle) => vehicle.id));
      setErros({});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar extra.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (item: ExtraCatalog, form: HTMLFormElement) => {
    setError(null);
    const formData = new FormData(form);
    const nome = String(formData.get("name") || "");
    const preco = String(formData.get("price") || "");
    const ordem = String(formData.get("position") || "");

    const campos: Record<string, string | null> = {
      [`extra-${item.id}.name`]: calcularErro("extra.name", nome),
      [`extra-${item.id}.price`]: calcularErro("extra.price", preco),
      [`extra-${item.id}.position`]: calcularErro("extra.position", ordem),
    };
    setErros((prev) => ({ ...prev, ...campos }));
    if (Object.values(campos).some(Boolean)) {
      setError("Confirma os campos assinalados a vermelho.");
      return;
    }

    setSaving(true);
    try {
      formData.set("image_url", imageFor(item));
      if ((form.elements.namedItem("is_active") as HTMLInputElement)?.checked) formData.append("is_active", "on");
      else formData.delete("is_active");
      await updateVehicleExtraCatalog(item.id, formData);
      setErros({});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar extra.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmar({
      titulo: "Apagar extra",
      mensagem: "O extra sai do catálogo e das viaturas onde está associado.",
      confirmar: "Apagar",
      perigo: true,
    });
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      await deleteVehicleExtraCatalog(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao apagar extra.");
    } finally {
      setSaving(false);
    }
  };

  // Guarda as viaturas novas marcadas para um extra já existente.
  const handleSaveAssociations = async (item: ExtraCatalog) => {
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      draftAssociations(item.id).forEach((vehicleId) => formData.append("vehicle_ids", vehicleId));
      await updateVehicleExtraAssociations(item.id, formData);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao guardar as associações.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateVariant = async (extraId: string, e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const campos: Record<string, string | null> = {
      [`nova-${extraId}.name`]: calcularErro("nova.name", newVariant.name),
      [`nova-${extraId}.price`]: calcularErro("nova.price", newVariant.price),
      [`nova-${extraId}.position`]: calcularErro("nova.position", newVariant.position),
    };
    setErros((prev) => ({ ...prev, ...campos }));
    if (Object.values(campos).some(Boolean)) {
      setError("Confirma os campos assinalados a vermelho.");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", newVariant.name);
      formData.append("price", newVariant.price);
      // Sem ordem escolhida, usa automaticamente a próxima livre dentro do extra.
      formData.append("position", newVariant.position.trim() || String(nextVariantPosition(extraId)));
      await createVehicleExtraVariant(extraId, formData);
      setNewVariant({ name: "", price: "", position: "" });
      setErros({});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar variante.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateVariant = async (variant: ExtraVariant, form: HTMLFormElement) => {
    setError(null);
    const formData = new FormData(form);
    const campos: Record<string, string | null> = {
      [`variante-${variant.id}.name`]: calcularErro("variante.name", String(formData.get("name") || "")),
      [`variante-${variant.id}.price`]: calcularErro("variante.price", String(formData.get("price") || "")),
      [`variante-${variant.id}.position`]: calcularErro("variante.position", String(formData.get("position") || "")),
    };
    setErros((prev) => ({ ...prev, ...campos }));
    if (Object.values(campos).some(Boolean)) {
      setError("Confirma os campos assinalados a vermelho.");
      return;
    }

    setSaving(true);
    try {
      if ((form.elements.namedItem("is_active") as HTMLInputElement)?.checked) formData.append("is_active", "on");
      else formData.append("is_active", "off");
      await updateVehicleExtraVariant(variant.id, formData);
      setErros({});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar variante.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVariant = async (id: string) => {
    const ok = await confirmar({
      titulo: "Apagar variante",
      mensagem: "Esta variante deixa de estar disponível para escolha.",
      confirmar: "Apagar",
      perigo: true,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await deleteVehicleExtraVariant(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao apagar variante.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
            Extras do catálogo
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Criados uma vez e reutilizados nas viaturas novas. Cada extra pode ter fotografia e variantes com preço próprio.
          </p>
        </div>
        <Link href="/admin/veiculos" className="px-4 py-2 rounded text-sm border" style={{ borderColor: "var(--border)", color: "var(--silver)" }}>
          ← Voltar a Viaturas
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded text-sm" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)" }}>
          {error}
        </div>
      )}

      <div className="mb-6 p-4 border rounded" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
        <h2 className="text-sm uppercase tracking-wide mb-4" style={{ color: "var(--foreground)" }}>Adicionar novo extra</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <datalist id="extra-categorias">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <label htmlFor="extra-nome" className={fieldLabel} style={{ color: "var(--muted)" }}>Nome do extra *</label>
              <input
                id="extra-nome"
                required
                value={newItem.name}
                aria-invalid={Boolean(erros["novo.name"])}
                onBlur={(e) => validarCampo("novo.name", e.target.value)}
                onChange={(e) => { setNewItem({ ...newItem, name: e.target.value }); aoAlterar("novo.name", e.target.value); }}
                placeholder='Ex.: Jantes de liga leve'
                className={campoClasse(inputClass, erros["novo.name"])}
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              />
              <FieldError message={erros["novo.name"]} />
            </div>
            <div>
              <label htmlFor="extra-preco" className={fieldLabel} style={{ color: "var(--muted)" }}>Preço base (€)</label>
              <input
                id="extra-preco"
                inputMode="decimal"
                value={newItem.price}
                aria-invalid={Boolean(erros["novo.price"])}
                onBlur={(e) => validarCampo("novo.price", e.target.value)}
                onChange={(e) => { setNewItem({ ...newItem, price: e.target.value }); aoAlterar("novo.price", e.target.value); }}
                placeholder="0,00"
                className={campoClasse(inputClass, erros["novo.price"])}
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              />
              <FieldError message={erros["novo.price"]} />
              <p className="mt-1 text-[10px]" style={{ color: "var(--muted)" }}>0 = incluído no preço da viatura</p>
            </div>
            <div>
              <label htmlFor="extra-ordem" className={fieldLabel} style={{ color: "var(--muted)" }}>Ordem de apresentação</label>
              <input
                id="extra-ordem"
                inputMode="numeric"
                value={newItem.position}
                aria-invalid={Boolean(erros["novo.position"])}
                onBlur={(e) => validarCampo("novo.position", e.target.value)}
                onChange={(e) => { setNewItem({ ...newItem, position: e.target.value }); aoAlterar("novo.position", e.target.value); }}
                placeholder={String(nextPosition)}
                className={campoClasse(inputClass, erros["novo.position"])}
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              />
              <FieldError message={erros["novo.position"]} />
              <p className="mt-1 text-[10px]" style={{ color: "var(--muted)" }}>Automática ({nextPosition}). Podes alterar se quiseres.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-start">
            <div>
              <label htmlFor="extra-descricao" className={fieldLabel} style={{ color: "var(--muted)" }}>Descrição</label>
              <input id="extra-descricao" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} placeholder="Texto curto que aparece no configurador" className={inputClass} style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
            </div>
            <div>
              <label htmlFor="extra-categoria" className={fieldLabel} style={{ color: "var(--muted)" }}>Categoria</label>
              <input id="extra-categoria" list="extra-categorias" value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} placeholder="Ex.: Jantes" className={inputClass} style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
              <p className="mt-1 text-[10px]" style={{ color: "var(--muted)" }}>Opcional · 1 escolha por categoria</p>
            </div>
            <ExtraImageField value={newItem.image_url} onChange={(url) => setNewItem({ ...newItem, image_url: url })} />
          </div>

          <div className="rounded border p-3" style={{ borderColor: "var(--border)", backgroundColor: "var(--background-alt)" }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: "var(--copper-deep)" }}>Variantes (opcional)</p>
              <button type="button" onClick={() => setDraftVariants([...draftVariants, { name: "", price: "" }])} className="rounded border px-3 py-1 text-xs transition-colors hover:border-copper" style={{ borderColor: "var(--border)", color: "var(--silver)" }}>
                + Adicionar variante
              </button>
            </div>
            {draftVariants.length === 0 ? (
              <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                Sem variantes o cliente escolhe apenas o extra. Ex.: jantes 19&quot;, 20&quot; e 21&quot; com preços diferentes.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {draftVariants.map((variant, index) => (
                  <div key={index} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_140px_auto]">
                    <div>
                      <label htmlFor={`nova-variante-nome-${index}`} className={fieldLabel} style={{ color: "var(--muted)" }}>Nome da variante</label>
                      <input
                        id={`nova-variante-nome-${index}`}
                        value={variant.name}
                        aria-invalid={Boolean(erros[`draft.${index}.name`])}
                        onBlur={(e) => validarCampo(`draft.${index}.name`, e.target.value)}
                        onChange={(e) => {
                          setDraftVariants(draftVariants.map((row, i) => i === index ? { ...row, name: e.target.value } : row));
                          aoAlterar(`draft.${index}.name`, e.target.value);
                        }}
                        placeholder='Ex.: 20"'
                        className={campoClasse(inputClass, erros[`draft.${index}.name`])}
                        style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                      />
                      <FieldError message={erros[`draft.${index}.name`]} />
                    </div>
                    <div>
                      <label htmlFor={`nova-variante-preco-${index}`} className={fieldLabel} style={{ color: "var(--muted)" }}>Preço (€)</label>
                      <input
                        id={`nova-variante-preco-${index}`}
                        inputMode="decimal"
                        value={variant.price}
                        aria-invalid={Boolean(erros[`draft.${index}.price`])}
                        onBlur={(e) => validarCampo(`draft.${index}.price`, e.target.value)}
                        onChange={(e) => {
                          setDraftVariants(draftVariants.map((row, i) => i === index ? { ...row, price: e.target.value } : row));
                          aoAlterar(`draft.${index}.price`, e.target.value);
                        }}
                        placeholder="0,00"
                        className={campoClasse(inputClass, erros[`draft.${index}.price`])}
                        style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                      />
                      <FieldError message={erros[`draft.${index}.price`]} />
                    </div>
                    <button type="button" onClick={() => setDraftVariants(draftVariants.filter((_, i) => i !== index))} className="pb-2 text-xs" style={{ color: "#ef4444" }}>
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded border p-3" style={{ borderColor: "var(--border)", backgroundColor: "var(--background-alt)" }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: "var(--copper-deep)" }}>Associar a viaturas novas</p>
              {newVehicles.length > 0 && (
                <button type="button" onClick={toggleAllAssociations} className="rounded border px-3 py-1 text-xs transition-colors hover:border-copper" style={{ borderColor: "var(--border)", color: "var(--silver)" }}>
                  {allAssociated ? "Limpar seleção" : "Selecionar todas"}
                </button>
              )}
            </div>
            {newVehicles.length === 0 ? (
              <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                Ainda não existem viaturas novas. O extra fica no catálogo e pode ser associado ao criar a viatura.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {newVehicles.map((vehicle) => {
                  const checked = associations.includes(vehicle.id);
                  const label = [vehicle.brand, vehicle.model, vehicle.trim, vehicle.registration_year].filter(Boolean).join(" · ");
                  return (
                    <label
                      key={vehicle.id}
                      className="flex items-center gap-2 rounded border px-3 py-2 text-xs"
                      style={{
                        cursor: "pointer",
                        borderColor: checked ? "var(--copper)" : "var(--border)",
                        backgroundColor: checked ? "rgba(244,119,36,0.09)" : "var(--background-alt)",
                        color: "var(--foreground)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setAssociations((prev) =>
                            e.target.checked ? [...prev, vehicle.id] : prev.filter((id) => id !== vehicle.id)
                          )
                        }
                      />
                      <span className="min-w-0">{label}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <p className="mt-2 text-[10px]" style={{ color: "var(--muted)" }}>
              Todas vêm marcadas por defeito. As viaturas marcadas ficam logo com este extra no configurador.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--foreground)" }}>
              <input type="checkbox" checked={newItem.is_active} onChange={(e) => setNewItem({ ...newItem, is_active: e.target.checked })} />
              Ativo no configurador
            </label>
            <button disabled={saving} className="px-4 py-2 rounded text-sm" style={{ backgroundColor: "var(--copper-deep)", color: "var(--background-alt)", opacity: saving ? 0.6 : 1 }}>
              {saving ? "A guardar..." : "+ Adicionar extra"}
            </button>
          </div>
        </form>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Pesquisar extras"
          placeholder="Pesquisar por nome, descrição ou categoria…"
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
          {itemsVisible.length} de {items.length} extras
        </span>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="border rounded px-4 py-6 text-center text-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)", color: "var(--muted)" }}>A carregar...</div>
        ) : itemsVisible.length === 0 ? (
          <div className="border rounded px-4 py-6 text-center text-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)", color: "var(--muted)" }}>
            {search.trim() ? "Nenhum resultado para esta pesquisa." : "Ainda sem extras no catálogo"}
          </div>
        ) : (
          itemsVisible.map((item) => {
            const itemVariants = variants.filter((v) => v.extra_id === item.id);
            // Com variantes, o valor do extra é sempre o da variante ativa mais
            // barata — é isso que o cliente vê e paga no configurador.
            const cheapestVariant = cheapestVariantFor(item.id, itemVariants);
            const cheapestPrice = cheapestVariant ? Number(cheapestVariant.price) || 0 : null;
            const open = expanded === item.id;
            const draftLinks = draftAssociations(item.id);
            const allDraftLinked = newVehicles.length > 0 && draftLinks.length === newVehicles.length;
            return (
              <div key={item.id} className="border rounded" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
                <form
                  onSubmit={(e) => { e.preventDefault(); handleUpdate(item, e.currentTarget); }}
                  className="grid grid-cols-1 items-start gap-3 p-3 sm:grid-cols-[70px_1fr_110px_80px_auto]"
                >
                  <div>
                    <label htmlFor={`ordem-${item.id}`} className={fieldLabel} style={{ color: "var(--muted)" }}>Ordem</label>
                    <input
                      id={`ordem-${item.id}`}
                      name="position"
                      defaultValue={item.position}
                      aria-invalid={Boolean(erros[`extra-${item.id}.position`])}
                      onBlur={(e) => validarCampo(`extra-${item.id}.position`, e.target.value)}
                      onChange={(e) => aoAlterar(`extra-${item.id}.position`, e.target.value)}
                      className={campoClasse("w-full px-2 py-1 text-xs border rounded bg-background", erros[`extra-${item.id}.position`])}
                      style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                    />
                    <FieldError message={erros[`extra-${item.id}.position`]} />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor={`nome-${item.id}`} className={fieldLabel} style={{ color: "var(--muted)" }}>Nome do extra</label>
                    <input
                      id={`nome-${item.id}`}
                      name="name"
                      defaultValue={item.name}
                      required
                      aria-invalid={Boolean(erros[`extra-${item.id}.name`])}
                      onBlur={(e) => validarCampo(`extra-${item.id}.name`, e.target.value)}
                      onChange={(e) => aoAlterar(`extra-${item.id}.name`, e.target.value)}
                      className={campoClasse("w-full px-2 py-1 text-xs border rounded bg-background", erros[`extra-${item.id}.name`])}
                      style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                    />
                    <FieldError message={erros[`extra-${item.id}.name`]} />
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      <input name="description" defaultValue={item.description || ""} placeholder="Descrição" aria-label="Descrição" className="w-full px-2 py-1 text-xs border rounded bg-background" style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
                      <input name="category" defaultValue={item.category} placeholder="Categoria (opcional)" aria-label="Categoria" list="extra-categorias" className="w-full px-2 py-1 text-xs border rounded bg-background" style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`preco-${item.id}`} className={fieldLabel} style={{ color: "var(--muted)" }}>
                      {cheapestVariant ? "Preço da variante" : "Preço (€)"}
                    </label>
                    {/* Com variantes o preço base deixa de ser usado: o valor
                        mostrado é o da variante ativa mais barata. O input
                        escondido mantém o preço base intacto ao guardar. */}
                    {cheapestVariant ? (
                      <>
                        <input type="hidden" name="price" value={item.price} />
                        <p className="px-2 py-1 text-xs rounded border" style={{ borderColor: "var(--border)", color: "var(--foreground)", backgroundColor: "var(--background)" }}>
                          {cheapestVariant.name} · {cheapestPrice ? `${cheapestPrice.toLocaleString("pt-PT")} €` : "Incluído"}
                        </p>
                      </>
                    ) : (
                      <input
                        id={`preco-${item.id}`}
                        name="price"
                        defaultValue={item.price}
                        inputMode="decimal"
                        aria-invalid={Boolean(erros[`extra-${item.id}.price`])}
                        onBlur={(e) => validarCampo(`extra-${item.id}.price`, e.target.value)}
                        onChange={(e) => aoAlterar(`extra-${item.id}.price`, e.target.value)}
                        className={campoClasse("w-full px-2 py-1 text-xs border rounded bg-background", erros[`extra-${item.id}.price`])}
                        style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                      />
                    )}
                    <FieldError message={erros[`extra-${item.id}.price`]} />
                  </div>
                  <label className="flex items-center gap-2 pt-4 text-xs" style={{ color: "var(--foreground)" }}>
                    <input name="is_active" type="checkbox" defaultChecked={item.is_active} />
                    Ativo
                  </label>
                  <div className="whitespace-nowrap pt-4 text-right">
                    <button type="button" onClick={() => setExpanded(open ? null : item.id)} className="mr-3 text-xs" style={{ color: "var(--silver)" }}>
                      {open ? "Fechar" : `Variantes e viaturas (${itemVariants.length})`}
                    </button>
                    <button disabled={saving} className="mr-3 text-xs" style={{ color: "var(--copper-deep)" }}>{saving ? "..." : "Guardar"}</button>
                    <button type="button" onClick={() => handleDelete(item.id)} disabled={saving} className="text-xs" style={{ color: "#ef4444" }}>Apagar</button>
                  </div>
                  <div className="sm:col-span-5">
                    <ExtraImageField
                      label="Fotografia"
                      value={imageFor(item)}
                      onChange={(url) => setImages((prev) => ({ ...prev, [item.id]: url }))}
                    />
                  </div>
                </form>

                {open && (
                  <div className="border-t p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--background-alt)" }}>
                    <p className="mb-3 text-xs uppercase tracking-widest" style={{ color: "var(--copper-deep)" }}>Variantes de {item.name}</p>
                    <div className="space-y-2">
                      {itemVariants.length === 0 && <p className="text-xs" style={{ color: "var(--muted)" }}>Sem variantes — o cliente escolhe apenas o extra.</p>}
                      {itemVariants.map((variant) => (
                        <form key={variant.id} onSubmit={(e) => { e.preventDefault(); handleUpdateVariant(variant, e.currentTarget); }} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_120px_90px_80px_auto]">
                          <div>
                            <label htmlFor={`variante-${variant.id}-nome`} className={fieldLabel} style={{ color: "var(--muted)" }}>Nome</label>
                            <input
                              id={`variante-${variant.id}-nome`}
                              name="name"
                              defaultValue={variant.name}
                              required
                              placeholder='Ex.: 20"'
                              aria-invalid={Boolean(erros[`variante-${variant.id}.name`])}
                              onBlur={(e) => validarCampo(`variante-${variant.id}.name`, e.target.value)}
                              onChange={(e) => aoAlterar(`variante-${variant.id}.name`, e.target.value)}
                              className={campoClasse("w-full px-2 py-1 text-xs border rounded bg-background", erros[`variante-${variant.id}.name`])}
                              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                            />
                            <FieldError message={erros[`variante-${variant.id}.name`]} />
                          </div>
                          <div>
                            <label htmlFor={`variante-${variant.id}-preco`} className={fieldLabel} style={{ color: "var(--muted)" }}>Preço (€)</label>
                            <input
                              id={`variante-${variant.id}-preco`}
                              name="price"
                              defaultValue={variant.price}
                              inputMode="decimal"
                              placeholder="0,00"
                              aria-invalid={Boolean(erros[`variante-${variant.id}.price`])}
                              onBlur={(e) => validarCampo(`variante-${variant.id}.price`, e.target.value)}
                              onChange={(e) => aoAlterar(`variante-${variant.id}.price`, e.target.value)}
                              className={campoClasse("w-full px-2 py-1 text-xs border rounded bg-background", erros[`variante-${variant.id}.price`])}
                              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                            />
                            <FieldError message={erros[`variante-${variant.id}.price`]} />
                          </div>
                          <div>
                            <label htmlFor={`variante-${variant.id}-ordem`} className={fieldLabel} style={{ color: "var(--muted)" }}>Ordem</label>
                            <input
                              id={`variante-${variant.id}-ordem`}
                              name="position"
                              defaultValue={variant.position}
                              inputMode="numeric"
                              aria-invalid={Boolean(erros[`variante-${variant.id}.position`])}
                              onBlur={(e) => validarCampo(`variante-${variant.id}.position`, e.target.value)}
                              onChange={(e) => aoAlterar(`variante-${variant.id}.position`, e.target.value)}
                              className={campoClasse("w-full px-2 py-1 text-xs border rounded bg-background", erros[`variante-${variant.id}.position`])}
                              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                            />
                            <FieldError message={erros[`variante-${variant.id}.position`]} />
                          </div>
                          <label className="flex items-center gap-2 pb-1 text-xs" style={{ color: "var(--foreground)" }}>
                            <input name="is_active" type="checkbox" defaultChecked={variant.is_active} />
                            Ativa
                          </label>
                          <div className="whitespace-nowrap pb-1 text-right">
                            <button disabled={saving} className="mr-3 text-xs" style={{ color: "var(--copper-deep)" }}>Guardar</button>
                            <button type="button" onClick={() => handleDeleteVariant(variant.id)} className="text-xs" style={{ color: "#ef4444" }}>Apagar</button>
                          </div>
                        </form>
                      ))}
                    </div>

                    <form onSubmit={(e) => handleCreateVariant(item.id, e)} className="mt-4 grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_120px_90px_auto]">
                      <div>
                        <label htmlFor={`variante-nome-${item.id}`} className={fieldLabel} style={{ color: "var(--muted)" }}>Nova variante</label>
                        <input
                          id={`variante-nome-${item.id}`}
                          required
                          value={newVariant.name}
                          placeholder='Ex.: 20"'
                          aria-invalid={Boolean(erros[`nova-${item.id}.name`])}
                          onBlur={(e) => validarCampo(`nova-${item.id}.name`, e.target.value)}
                          onChange={(e) => { setNewVariant({ ...newVariant, name: e.target.value }); aoAlterar(`nova-${item.id}.name`, e.target.value); }}
                          className={campoClasse("px-2 py-1 text-xs border rounded bg-background", erros[`nova-${item.id}.name`])}
                          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                        />
                        <FieldError message={erros[`nova-${item.id}.name`]} />
                      </div>
                      <div>
                        <label htmlFor={`variante-preco-${item.id}`} className={fieldLabel} style={{ color: "var(--muted)" }}>Preço (€)</label>
                        <input
                          id={`variante-preco-${item.id}`}
                          inputMode="decimal"
                          value={newVariant.price}
                          placeholder="0,00"
                          aria-invalid={Boolean(erros[`nova-${item.id}.price`])}
                          onBlur={(e) => validarCampo(`nova-${item.id}.price`, e.target.value)}
                          onChange={(e) => { setNewVariant({ ...newVariant, price: e.target.value }); aoAlterar(`nova-${item.id}.price`, e.target.value); }}
                          className={campoClasse("px-2 py-1 text-xs border rounded bg-background", erros[`nova-${item.id}.price`])}
                          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                        />
                        <FieldError message={erros[`nova-${item.id}.price`]} />
                      </div>
                      <div>
                        <label htmlFor={`variante-ordem-${item.id}`} className={fieldLabel} style={{ color: "var(--muted)" }}>Ordem</label>
                        <input
                          id={`variante-ordem-${item.id}`}
                          inputMode="numeric"
                          value={newVariant.position}
                          placeholder={String(nextVariantPosition(item.id))}
                          aria-invalid={Boolean(erros[`nova-${item.id}.position`])}
                          onBlur={(e) => validarCampo(`nova-${item.id}.position`, e.target.value)}
                          onChange={(e) => { setNewVariant({ ...newVariant, position: e.target.value }); aoAlterar(`nova-${item.id}.position`, e.target.value); }}
                          className={campoClasse("px-2 py-1 text-xs border rounded bg-background", erros[`nova-${item.id}.position`])}
                          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                        />
                        <FieldError message={erros[`nova-${item.id}.position`]} />
                      </div>
                      <button disabled={saving} className="px-3 py-1 rounded text-xs" style={{ backgroundColor: "var(--copper-deep)", color: "var(--background-alt)" }}>+ Variante</button>
                    </form>

                    <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: "var(--copper-deep)" }}>Associar a viaturas novas</p>
                        {newVehicles.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setAssocDraft((prev) => ({ ...prev, [item.id]: allDraftLinked ? [] : newVehicles.map((vehicle) => vehicle.id) }))}
                            className="rounded border px-3 py-1 text-xs transition-colors hover:border-copper"
                            style={{ borderColor: "var(--border)", color: "var(--silver)" }}
                          >
                            {allDraftLinked ? "Limpar seleção" : "Selecionar todas"}
                          </button>
                        )}
                      </div>
                      {newVehicles.length === 0 ? (
                        <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                          Ainda não existem viaturas novas para associar.
                        </p>
                      ) : (
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {newVehicles.map((vehicle) => {
                            const checked = draftLinks.includes(vehicle.id);
                            const label = [vehicle.brand, vehicle.model, vehicle.trim, vehicle.registration_year].filter(Boolean).join(" · ");
                            return (
                              <label
                                key={vehicle.id}
                                htmlFor={`assoc-${item.id}-${vehicle.id}`}
                                className="flex items-center gap-2 rounded border px-3 py-2 text-xs"
                                style={{
                                  cursor: "pointer",
                                  borderColor: checked ? "var(--copper)" : "var(--border)",
                                  backgroundColor: checked ? "rgba(244,119,36,0.09)" : "var(--background)",
                                  color: "var(--foreground)",
                                }}
                              >
                                <input
                                  id={`assoc-${item.id}-${vehicle.id}`}
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const ids = e.target.checked ? [...draftLinks, vehicle.id] : draftLinks.filter((id) => id !== vehicle.id);
                                    setAssocDraft((prev) => ({ ...prev, [item.id]: ids }));
                                  }}
                                />
                                <span className="min-w-0">{label}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                          As viaturas marcadas ficam com este extra disponível no configurador da proposta.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleSaveAssociations(item)}
                          disabled={saving}
                          className="px-3 py-1 rounded text-xs"
                          style={{ backgroundColor: "var(--copper-deep)", color: "var(--background-alt)", opacity: saving ? 0.6 : 1 }}
                        >
                          {saving ? "A guardar..." : "Guardar associações"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
