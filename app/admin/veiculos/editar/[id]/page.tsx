"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import vehicleCatalog from "@/lib/vehicle-catalog.json";
import { useVehicleForm } from "@/hooks/use-vehicle-form";
import { VehicleGallery, type VehicleGalleryHandle } from "@/components/ui/vehicle-gallery";
import { VehicleAccessoriesBrowser } from "@/components/admin/vehicle-accessories-browser";

interface VehicleExtraCatalogItem { id: string; name: string; price: number; position: number; is_active: boolean; }
interface VehicleExtraItem { id: string; catalog_extra_id: string | null; name: string; price: number; }

interface VehicleExtraCatalogItem { id: string; name: string; price: number; position: number; is_active: boolean; }
interface VehicleExtraItem { id: string; catalog_extra_id: string | null; name: string; price: number; }

interface VehicleExtraCatalogItem { id: string; name: string; price: number; position: number; is_active: boolean; }
interface VehicleExtraItem { id: string; catalog_extra_id: string | null; name: string; price: number; }

interface VehicleExtraCatalogItem { id: string; name: string; price: number; position: number; is_active: boolean; }
interface VehicleExtraItem { id: string; catalog_extra_id: string | null; name: string; price: number; }

interface VehicleExtraCatalogItem { id: string; name: string; price: number; position: number; is_active: boolean; }
interface VehicleExtraItem { id: string; catalog_extra_id: string | null; name: string; price: number; }

interface VehicleExtraCatalogItem { id: string; name: string; price: number; position: number; is_active: boolean; }
interface VehicleExtraItem { id: string; catalog_extra_id: string | null; name: string; price: number; }

interface VehicleExtraCatalogItem { id: string; name: string; price: number; position: number; is_active: boolean; }
interface VehicleExtraItem { id: string; catalog_extra_id: string | null; name: string; price: number; }

interface VehicleExtraCatalogItem { id: string; name: string; price: number; position: number; is_active: boolean; }
interface VehicleExtraItem { id: string; catalog_extra_id: string | null; name: string; price: number; }

interface VehicleExtraCatalogItem {
  id: string;
  name: string;
  price: number;
  position: number;
  is_active: boolean;
}

interface VehicleExtraItem {
  id: string;
  catalog_extra_id: string | null;
  name: string;
  price: number;
}

interface VehicleExtraCatalogItem {
  id: string;
  name: string;
  price: number;
  position: number;
  is_active: boolean;
}

interface VehicleExtraItem {
  id: string;
  catalog_extra_id: string | null;
  name: string;
  price: number;
}

const CATALOG = vehicleCatalog as Record<string, { models: Record<string, { engine: string; power_hp: number; torque_nm: number; transmission: string; drivetrain: string }> }>;

const STATUS_OPTIONS = [
  { value: "available", label: "Disponível" },
  { value: "reserved", label: "Reservada" },
  { value: "sold", label: "Vendida" },
  { value: "archived", label: "Arquivada" },
] as const;

const FUEL_OPTIONS = [
  { value: "diesel", label: "Diesel" },
  { value: "gasoline", label: "Gasolina" },
  { value: "hybrid", label: "Híbrido" },
  { value: "electric", label: "Elétrico" },
] as const;

const SERVICE_BOOK_OPTIONS = [
  { value: "full_dealer", label: "Completa (Concessionário)" },
  { value: "full", label: "Completa" },
  { value: "partial", label: "Parcial" },
  { value: "none", label: "Sem caderneta" },
] as const;

const ORIGIN_OPTIONS = [
  { value: "imported", label: "Importação" },
  { value: "national", label: "Nacional" },
] as const;

const initialForm = {
  condition: "used",
  sale_type: "stock",
  slug: "",
  reference_code: "",
  brand_warranty_months: "",
  delivery_estimate_days: "",
  config_summary: "",
  brand: "",
  model: "",
  trim: "",
  registration_year: "",
  registration_month: "",
  engine: "",
  power_hp: "",
  torque_nm: "",
  transmission: "automatic",
  drivetrain: "rwd",
  fuel_type: "diesel",
  combined_consumption: "",
  co2_emissions: "",
  exterior_color: "",
  body_style: "",
  features: "",
  interior_color: "",
  mileage_km: "",
  previous_owners: "1",
  service_book: "full_dealer",
  accident_history: "false",
  accident_details: "",
  last_service_date: "",
  tires_condition: "",
  origin: "imported",
  origin_country: "DE",
  coc_confirmed: "false",
  isv_paid: "false",
  legalization_date: "",
  price: "",
  warranty_months: "6",
  financing_available: "false",
  trade_in_accepted: "false",
  cover_image_url: "",
  video_url: "",
  description: "",
  is_featured: "false",
  status: "available",
  sold_at: "",
};

// Converte um timestamp ISO (BD) para o formato do input datetime-local
// (data/hora locais, "YYYY-MM-DDTHH:mm").
const toLocalInput = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const inputStyle = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  borderRadius: "0.375rem",
  border: "1px solid var(--border)",
  backgroundColor: "var(--background-alt)",
  color: "var(--foreground)",
  fontSize: "0.875rem",
} as const;

const selectStyle = { ...inputStyle, appearance: "none" as const };

const labelStyle = {
  display: "block",
  marginBottom: "0.25rem",
  fontSize: "0.75rem",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  color: "var(--muted)",
} as const;

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label style={labelStyle}>{label}</label>{children}</div>
);

const CheckField = ({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", alignSelf: "end", paddingBottom: "0.4rem" }}>
    <input type="checkbox" id={id} checked={checked} onChange={onChange} />
    <label htmlFor={id} style={{ color: "var(--foreground)", fontSize: "0.875rem", marginBottom: 0 }}>{label}</label>
  </div>
);

export default function EditarVeiculo() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { form, handleChange, handleCheckboxChange, setMultiple } = useVehicleForm(initialForm);
  const galleryRef = useRef<VehicleGalleryHandle>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const brands = useMemo(() => Object.keys(CATALOG).sort((a, b) => a.localeCompare(b, "pt")), []);
  const models = useMemo(() => CATALOG[form.brand]?.models || {}, [form.brand]);
  const modelNames = useMemo(() => Object.keys(models).sort(), [models]);

  // Carregar viatura existente
  useEffect(() => {
    const fetchVehicle = async () => {
      const { data } = await supabase.from("vehicles").select("*").eq("id", id).single();
      if (data) {
        const { data: featureRows } = await supabase.from("vehicle_features").select("label").eq("vehicle_id", id).order("label");
        setMultiple({
          brand: data.brand || "BMW",
          condition: data.condition || "used",
          sale_type: data.sale_type || "stock",
          slug: data.slug || "",
          reference_code: data.reference_code || "",
          brand_warranty_months: data.brand_warranty_months?.toString() || "",
          delivery_estimate_days: data.delivery_estimate_days?.toString() || "",
          config_summary: data.config_summary || "",
          model: data.model || "",
          trim: data.trim || "",
          registration_year: data.registration_year?.toString() || "",
          registration_month: data.registration_month?.toString() || "",
          engine: data.engine || "",
          power_hp: data.power_hp?.toString() || "",
          torque_nm: data.torque_nm?.toString() || "",
          transmission: data.transmission || "automatic",
          drivetrain: data.drivetrain || "rwd",
          fuel_type: data.fuel_type || "diesel",
          combined_consumption: data.combined_consumption?.toString() || "",
          co2_emissions: data.co2_emissions?.toString() || "",
          exterior_color: data.exterior_color || "",
          body_style: data.body_style || "",
          features: (featureRows || []).map((feature) => feature.label).join("\n"),
          interior_color: data.interior_color || "",
          mileage_km: data.mileage_km?.toString() || "",
          previous_owners: data.previous_owners?.toString() || "1",
          service_book: data.service_book || "full_dealer",
          accident_history: data.accident_history ? "true" : "false",
          accident_details: data.accident_details || "",
          last_service_date: data.last_service_date || "",
          tires_condition: data.tires_condition || "",
          origin: data.origin || "imported",
          origin_country: data.origin_country || "DE",
          coc_confirmed: data.coc_confirmed ? "true" : "false",
          isv_paid: data.isv_paid ? "true" : "false",
          legalization_date: data.legalization_date || "",
          price: data.price?.toString() || "",
          warranty_months: data.warranty_months?.toString() || "6",
          financing_available: data.financing_available ? "true" : "false",
          trade_in_accepted: data.trade_in_accepted ? "true" : "false",
          cover_image_url: data.cover_image_url || "",
          video_url: data.video_url || "",
          description: data.description || "",
          is_featured: data.is_featured ? "true" : "false",
          status: data.status || "available",
          sold_at: (data.status === "sold" || data.status === "archived") && data.sold_at ? toLocalInput(data.sold_at) : "",
        });
      }
      setLoading(false);
    };
    fetchVehicle();
  }, [id, setMultiple]);

  // Quando muda a marca, limpa modelo e specs
  const handleBrandChange = useCallback((brand: string) => {
    setMultiple({ brand, model: "", engine: "", power_hp: "", torque_nm: "", transmission: "automatic", drivetrain: "rwd" });
  }, [setMultiple]);

  // Quando muda o modelo, pré-preenche specs
  const handleModelChange = useCallback((model: string) => {
    const specs = models[model];
    if (specs) {
      setMultiple({
        model,
        engine: specs.engine,
        power_hp: String(specs.power_hp),
        torque_nm: String(specs.torque_nm),
        transmission: specs.transmission,
        drivetrain: specs.drivetrain,
      });
    } else {
      setMultiple({ model, engine: "", power_hp: "", torque_nm: "", transmission: "automatic", drivetrain: "rwd" });
    }
  }, [setMultiple, models]);

  const handleStatusChange = useCallback((status: string) => {
    if (status === "sold") {
      // Ao marcar como vendida, preenche a data de venda se ainda não existir.
      setMultiple({ status, sold_at: form.sold_at || toLocalInput(new Date().toISOString()) });
    } else if (status === "archived") {
      // Arquivada preserva a data de venda (útil para histórico).
      setMultiple({ status, sold_at: form.sold_at || toLocalInput(new Date().toISOString()) });
    } else {
      setMultiple({ status, sold_at: "" });
    }
  }, [setMultiple, form.sold_at]);

  const generateSlug = (brand: string, model: string, trim: string, year: string) => {
    return `${brand}-${model}-${trim}-${year}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { features, ...vehicleForm } = form;
    // Slug editável: vazio = gera a partir de marca/modelo/versão/ano.
    const slug = (form.slug.trim() ? form.slug : generateSlug(form.brand, form.model, form.trim, form.registration_year)).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const { error } = await supabase.from("vehicles").update({
      ...vehicleForm,
      slug,
      registration_year: form.registration_year ? parseInt(form.registration_year) : null,
      registration_month: form.registration_month ? parseInt(form.registration_month) : null,
      power_hp: form.power_hp ? parseInt(form.power_hp) : null,
      torque_nm: form.torque_nm ? parseInt(form.torque_nm) : null,
      combined_consumption: form.combined_consumption ? parseFloat(form.combined_consumption) : null,
      co2_emissions: form.co2_emissions ? parseInt(form.co2_emissions) : null,
      mileage_km: form.condition === "new" ? 0 : form.mileage_km ? parseInt(form.mileage_km) : null,
      previous_owners: form.condition === "new" ? null : form.previous_owners ? parseInt(form.previous_owners) : null,
      service_book: form.condition === "new" ? null : form.service_book,
      accident_history: form.accident_history === "true",
      accident_details: form.accident_details || null,
      last_service_date: form.last_service_date || null,
      tires_condition: form.tires_condition || null,
      reference_code: form.reference_code || null,
      coc_confirmed: form.coc_confirmed === "true",
      isv_paid: form.isv_paid === "true",
      legalization_date: form.legalization_date || null,
      financing_available: form.financing_available === "true",
      trade_in_accepted: form.trade_in_accepted === "true",
      video_url: form.video_url || null,
      price: form.price ? parseFloat(form.price) : null,
      warranty_months: form.condition === "used" && form.warranty_months ? parseInt(form.warranty_months) : null,
      condition: form.condition,
      sale_type: form.sale_type,
      brand_warranty_months: form.brand_warranty_months ? parseInt(form.brand_warranty_months) : null,
      delivery_estimate_days: form.delivery_estimate_days ? parseInt(form.delivery_estimate_days) : null,
      is_featured: form.is_featured === "true",
      status: form.status,
      // Data de venda: usa a escolhida no formulário; se faltar, assume "agora".
      // Em "arquivada" mantém-se a data da venda (histórico).
      sold_at: form.status === "sold" || form.status === "archived"
        ? (form.sold_at ? new Date(form.sold_at).toISOString() : new Date().toISOString())
        : null,
    }).eq("id", id);
    if (error) {
      setSaving(false);
      const duplicate = error.message.includes("slug") || error.message.includes("duplicate key");
      alert("Erro ao guardar: " + (duplicate ? "Este endereço (slug) já está a ser usado por outra viatura — muda-o." : error.message));
      return;
    }
    const { error: deleteFeaturesError } = await supabase.from("vehicle_features").delete().eq("vehicle_id", id);
    if (deleteFeaturesError) {
      setSaving(false);
      alert("Os dados da viatura foram guardados, mas não foi possível atualizar os extras: " + deleteFeaturesError.message);
      return;
    }
    const featureLabels = features.split("\n").map((label) => label.trim()).filter(Boolean);
    if (featureLabels.length) {
      const { error: featureError } = await supabase.from("vehicle_features").insert(featureLabels.map((label) => ({ vehicle_id: id, label })));
      if (featureError) {
        setSaving(false);
        alert("Os dados da viatura foram guardados, mas os extras não foram inseridos: " + featureError.message);
        return;
      }
    }
    const galleryResult = await galleryRef.current?.save();
    setSaving(false);
    if (galleryResult?.error) alert("Os dados da viatura foram guardados, mas a galeria não: " + galleryResult.error);
    else router.push("/admin/veiculos");
  };

  if (loading) return <div className="flex items-center justify-center h-64"><p style={{ color: "var(--muted)" }}>A carregar...</p></div>;

  return (
    <div>
      <h1 className="text-2xl uppercase tracking-wide mb-6" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>Editar Viatura</h1>
      <form onSubmit={handleSubmit} style={{ backgroundColor: "var(--surface-mid)", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "1.5rem" }}>
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--copper-deep)" }}>Identificação</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <Field label="Condição"><select style={selectStyle} value={form.condition} onChange={handleChange("condition")}><option value="used">Usado</option><option value="new">Novo</option></select></Field>
          <Field label="Disponibilidade"><select style={selectStyle} value={form.sale_type} onChange={handleChange("sale_type")}><option value="stock">Em stock</option><option value="on_order">Por encomenda</option></select></Field>
          <Field label="Marca *">
            <select style={selectStyle} value={form.brand} onChange={(e) => handleBrandChange(e.target.value)}>
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Modelo *">
            <>
              <input required list="vehicle-models" style={inputStyle} placeholder="Escreve ou seleciona o modelo" value={form.model} onChange={(e) => handleModelChange(e.target.value)} />
              <datalist id="vehicle-models">{modelNames.map((m) => <option key={m} value={m} />)}</datalist>
            </>
          </Field>
          <Field label="Versão / Trim"><input style={inputStyle} value={form.trim} onChange={handleChange("trim")} /></Field>
          <Field label="Endereço (slug)"><input style={inputStyle} placeholder="gerado se vazio" value={form.slug} onChange={handleChange("slug")} /><span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Endereço público da ficha — alterar muda o link.</span></Field>
          <Field label="Referência interna"><input style={inputStyle} placeholder="ex: CH-2024-018" value={form.reference_code} onChange={handleChange("reference_code")} /></Field>
          <Field label="Ano Registo *"><input required type="number" min="1900" max="2100" style={inputStyle} value={form.registration_year} onChange={handleChange("registration_year")} /></Field>
          <Field label="Mês Registo"><input type="number" min="1" max="12" style={inputStyle} value={form.registration_month} onChange={handleChange("registration_month")} /></Field>
        </div>

        <p className="text-xs uppercase tracking-widest mb-3 mt-5" style={{ color: "var(--copper-deep)" }}>Especificações Técnicas</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <Field label="Motor"><input style={inputStyle} value={form.engine} onChange={handleChange("engine")} /></Field>
          <Field label="Potência (CV)"><input type="number" min="0" style={inputStyle} value={form.power_hp} onChange={handleChange("power_hp")} /></Field>
          <Field label="Binário (Nm)"><input type="number" min="0" style={inputStyle} value={form.torque_nm} onChange={handleChange("torque_nm")} /></Field>
          <Field label="Caixa"><select style={selectStyle} value={form.transmission} onChange={handleChange("transmission")}><option value="automatic">Automática</option><option value="manual">Manual</option></select></Field>
          <Field label="Tração"><select style={selectStyle} value={form.drivetrain} onChange={handleChange("drivetrain")}><option value="rwd">RWD</option><option value="awd">AWD/xDrive</option><option value="fwd">FWD</option></select></Field>
          <Field label="Combustível"><select style={selectStyle} value={form.fuel_type} onChange={handleChange("fuel_type")}>{FUEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
          <Field label="Consumo (l/100km)"><input type="number" step="0.1" min="0" style={inputStyle} value={form.combined_consumption} onChange={handleChange("combined_consumption")} /></Field>
          <Field label="CO₂ (g/km)"><input type="number" min="0" style={inputStyle} value={form.co2_emissions} onChange={handleChange("co2_emissions")} /></Field>
        </div>

        <p className="text-xs uppercase tracking-widest mb-3 mt-5" style={{ color: "var(--copper-deep)" }}>Veículo</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
          {form.condition !== "new" && <Field label="Quilometragem *"><input required type="number" min="0" style={inputStyle} value={form.mileage_km} onChange={handleChange("mileage_km")} /></Field>}
          <Field label="Cor Exterior"><input style={inputStyle} value={form.exterior_color} onChange={handleChange("exterior_color")} /></Field>
          <Field label="Estilo de Carro"><select style={selectStyle} value={form.body_style} onChange={handleChange("body_style")}><option value="">Selecionar estilo</option><option value="sedan">Sedan</option><option value="coupe">Coupé</option><option value="touring">Carrinha / Touring</option><option value="hatchback">Hatchback</option><option value="suv">SUV</option><option value="cabrio">Cabrio</option><option value="compact">Compacto</option><option value="monovolume">Monovolume</option><option value="outro">Outro</option></select></Field>
          <Field label="Cor Interior"><input style={inputStyle} value={form.interior_color} onChange={handleChange("interior_color")} /></Field>
          {form.condition !== "new" && <><Field label="Donos Anteriores"><input type="number" min="0" style={inputStyle} value={form.previous_owners} onChange={handleChange("previous_owners")} /></Field><Field label="Caderneta"><select style={selectStyle} value={form.service_book} onChange={handleChange("service_book")}>{SERVICE_BOOK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field></>}
          <CheckField id="accident_history" label="Histórico de acidentes" checked={form.accident_history === "true"} onChange={handleCheckboxChange("accident_history")} />
          {form.accident_history === "true" && <Field label="Detalhes do acidente"><input style={inputStyle} value={form.accident_details} onChange={handleChange("accident_details")} /></Field>}
          <Field label="Data da última revisão"><input type="date" style={inputStyle} value={form.last_service_date} onChange={handleChange("last_service_date")} /></Field>
          <Field label="Estado dos pneus"><input style={inputStyle} placeholder="ex: Novos (2024)" value={form.tires_condition} onChange={handleChange("tires_condition")} /></Field>
        </div>

        <p className="text-xs uppercase tracking-widest mb-3 mt-5" style={{ color: "var(--copper-deep)" }}>Origem & Legalização</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <Field label="Origem"><select style={selectStyle} value={form.origin} onChange={handleChange("origin")}>{ORIGIN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
          <Field label="País Origem"><input style={inputStyle} value={form.origin_country} onChange={handleChange("origin_country")} /></Field>
          <CheckField id="coc_confirmed" label="CoC (certificado comunitário) confirmado" checked={form.coc_confirmed === "true"} onChange={handleCheckboxChange("coc_confirmed")} />
          <CheckField id="isv_paid" label="ISV liquidado" checked={form.isv_paid === "true"} onChange={handleCheckboxChange("isv_paid")} />
          <Field label="Data de legalização"><input type="date" style={inputStyle} value={form.legalization_date} onChange={handleChange("legalization_date")} /></Field>
        </div>

        <p className="text-xs uppercase tracking-widest mb-3 mt-5" style={{ color: "var(--copper-deep)" }}>Preço & Status</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <Field label="Preço (€) *"><input required type="number" min="0" step="100" style={inputStyle} value={form.price} onChange={handleChange("price")} /></Field>
          {form.condition === "used" ? <Field label="Garantia (meses)"><input type="number" min="0" style={inputStyle} value={form.warranty_months} onChange={handleChange("warranty_months")} /></Field> : <>
            <Field label="Garantia da marca (meses)"><input type="number" min="0" style={inputStyle} value={form.brand_warranty_months} onChange={handleChange("brand_warranty_months")} /></Field>
            {form.sale_type === "on_order" && <Field label="Prazo estimado (dias)"><input type="number" min="1" style={inputStyle} value={form.delivery_estimate_days} onChange={handleChange("delivery_estimate_days")} /></Field>}
          </>}
          <Field label="Status"><select style={selectStyle} value={form.status} onChange={(e) => handleStatusChange(e.target.value)}>{STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
          <CheckField id="financing_available" label="Aceita financiamento" checked={form.financing_available === "true"} onChange={handleCheckboxChange("financing_available")} />
          <CheckField id="trade_in_accepted" label="Aceita retoma" checked={form.trade_in_accepted === "true"} onChange={handleCheckboxChange("trade_in_accepted")} />
          {(form.status === "sold" || form.status === "archived") && (
            <Field label="Data de venda">
              <input type="datetime-local" style={inputStyle} value={form.sold_at} onChange={handleChange("sold_at")} />
            </Field>
          )}
        </div>
        {form.condition === "new" && <div style={{ marginTop: "0.75rem" }}><label style={labelStyle}>Configuração / equipamento</label><textarea rows={3} style={{ ...inputStyle, resize: "vertical" as const }} value={form.config_summary} onChange={handleChange("config_summary")} placeholder="Motor, caixa, equipamento e opções de fábrica" /></div>}
        {form.condition === "new" && <VehicleAccessoriesBrowser brand={form.brand} model={form.model} registrationYear={form.registration_year} />}

        {/* Galeria de imagens (R2) */}
        <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
          <VehicleGallery ref={galleryRef} vehicleId={id} coverImageUrl={form.cover_image_url} onCoverChange={(url) => setMultiple({ cover_image_url: url })} />
        </div>

        <div style={{ marginTop: "0.75rem" }}><label style={labelStyle}>Extras e equipamento (um por linha)</label><textarea rows={5} style={{ ...inputStyle, resize: "vertical" as const }} value={form.features} onChange={handleChange("features")} placeholder={"Bancos aquecidos\nTeto panorâmico\nCâmara traseira"} /></div>
        <div style={{ marginTop: "0.75rem" }}><label style={labelStyle}>Descrição</label><textarea rows={4} style={{ ...inputStyle, resize: "vertical" as const }} value={form.description} onChange={handleChange("description")} /></div>
        <div style={{ marginTop: "0.75rem" }}>
          <label style={labelStyle}>Vídeo (URL do YouTube ou Vimeo)</label>
          <input style={inputStyle} placeholder="https://www.youtube.com/watch?v=..." value={form.video_url} onChange={handleChange("video_url")} />
        </div>
        <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input type="checkbox" id="featured" checked={form.is_featured === "true"} onChange={handleCheckboxChange("is_featured")} />
          <label htmlFor="featured" style={{ color: "var(--foreground)", fontSize: "0.875rem" }}>Destaque</label>
        </div>

        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded text-sm font-medium transition-opacity" style={{ backgroundColor: "var(--copper-deep)", color: "var(--background-alt)", opacity: saving ? 0.6 : 1 }}>
            {saving ? "A guardar..." : "Guardar Alterações"}
          </button>
          <button type="button" onClick={() => router.push("/admin/veiculos")} className="px-4 py-2 rounded text-sm transition-colors" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
