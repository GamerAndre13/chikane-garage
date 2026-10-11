"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import vehicleCatalog from "@/lib/vehicle-catalog.json";
import { useVehicleForm } from "@/hooks/use-vehicle-form";
import { VehicleGallery, type VehicleGalleryHandle } from "@/components/ui/vehicle-gallery";

const CATALOG = vehicleCatalog as Record<string, { models: Record<string, { engine: string; power_hp: number; torque_nm: number; transmission: string; drivetrain: string }> }>;

const STATUS_OPTIONS = [
  { value: "available", label: "Disponível" },
  { value: "reserved", label: "Reservada" },
  { value: "sold", label: "Vendida" },
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
  origin: "imported",
  origin_country: "DE",
  price: "",
  warranty_months: "6",
  cover_image_url: "",
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
          origin: data.origin || "imported",
          origin_country: data.origin_country || "DE",
          price: data.price?.toString() || "",
          warranty_months: data.warranty_months?.toString() || "6",
          cover_image_url: data.cover_image_url || "",
          description: data.description || "",
          is_featured: data.is_featured ? "true" : "false",
          status: data.status || "available",
          sold_at: data.status === "sold" && data.sold_at ? toLocalInput(data.sold_at) : "",
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
    const slug = generateSlug(form.brand, form.model, form.trim, form.registration_year);
    const { error } = await supabase.from("vehicles").update({
      ...vehicleForm,
      slug,
      registration_year: form.registration_year ? parseInt(form.registration_year) : null,
      registration_month: form.registration_month ? parseInt(form.registration_month) : null,
      power_hp: form.power_hp ? parseInt(form.power_hp) : null,
      torque_nm: form.torque_nm ? parseInt(form.torque_nm) : null,
      combined_consumption: form.combined_consumption ? parseFloat(form.combined_consumption) : null,
      co2_emissions: form.co2_emissions ? parseInt(form.co2_emissions) : null,
      mileage_km: form.mileage_km ? parseInt(form.mileage_km) : null,
      previous_owners: form.previous_owners ? parseInt(form.previous_owners) : null,
      price: form.price ? parseFloat(form.price) : null,
      warranty_months: form.warranty_months ? parseInt(form.warranty_months) : null,
      is_featured: form.is_featured === "true",
      status: form.status,
      // Data de venda: usa a escolhida no formulário; se faltar, assume "agora".
      sold_at: form.status === "sold"
        ? (form.sold_at ? new Date(form.sold_at).toISOString() : new Date().toISOString())
        : null,
    }).eq("id", id);
    if (error) {
      setSaving(false);
      alert("Erro ao guardar: " + error.message);
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
          <Field label="Quilometragem *"><input required type="number" min="0" style={inputStyle} value={form.mileage_km} onChange={handleChange("mileage_km")} /></Field>
          <Field label="Cor Exterior"><input style={inputStyle} value={form.exterior_color} onChange={handleChange("exterior_color")} /></Field>
          <Field label="Estilo de Carro"><select style={selectStyle} value={form.body_style} onChange={handleChange("body_style")}><option value="">Selecionar estilo</option><option value="sedan">Sedan</option><option value="coupe">Coupé</option><option value="touring">Carrinha / Touring</option><option value="hatchback">Hatchback</option><option value="suv">SUV</option><option value="cabrio">Cabrio</option><option value="compact">Compacto</option><option value="monovolume">Monovolume</option><option value="outro">Outro</option></select></Field>
          <Field label="Cor Interior"><input style={inputStyle} value={form.interior_color} onChange={handleChange("interior_color")} /></Field>
          <Field label="Donos Anteriores"><input type="number" min="0" style={inputStyle} value={form.previous_owners} onChange={handleChange("previous_owners")} /></Field>
          <Field label="Caderneta"><select style={selectStyle} value={form.service_book} onChange={handleChange("service_book")}>{SERVICE_BOOK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
        </div>

        <p className="text-xs uppercase tracking-widest mb-3 mt-5" style={{ color: "var(--copper-deep)" }}>Origem & Legalização</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <Field label="Origem"><select style={selectStyle} value={form.origin} onChange={handleChange("origin")}>{ORIGIN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
          <Field label="País Origem"><input style={inputStyle} value={form.origin_country} onChange={handleChange("origin_country")} /></Field>
        </div>

        <p className="text-xs uppercase tracking-widest mb-3 mt-5" style={{ color: "var(--copper-deep)" }}>Preço & Status</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <Field label="Preço (€) *"><input required type="number" min="0" step="100" style={inputStyle} value={form.price} onChange={handleChange("price")} /></Field>
          <Field label="Garantia (meses)"><input type="number" min="0" style={inputStyle} value={form.warranty_months} onChange={handleChange("warranty_months")} /></Field>
          <Field label="Status"><select style={selectStyle} value={form.status} onChange={(e) => handleStatusChange(e.target.value)}>{STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
          {form.status === "sold" && (
            <Field label="Data de venda">
              <input type="datetime-local" style={inputStyle} value={form.sold_at} onChange={handleChange("sold_at")} />
            </Field>
          )}
        </div>

        {/* Galeria de imagens (R2) */}
        <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
          <VehicleGallery ref={galleryRef} vehicleId={id} coverImageUrl={form.cover_image_url} onCoverChange={(url) => setMultiple({ cover_image_url: url })} />
        </div>

        <div style={{ marginTop: "0.75rem" }}><label style={labelStyle}>Extras e equipamento (um por linha)</label><textarea rows={5} style={{ ...inputStyle, resize: "vertical" as const }} value={form.features} onChange={handleChange("features")} placeholder={"Bancos aquecidos\nTeto panorâmico\nCâmara traseira"} /></div>
        <div style={{ marginTop: "0.75rem" }}><label style={labelStyle}>Descrição</label><textarea rows={4} style={{ ...inputStyle, resize: "vertical" as const }} value={form.description} onChange={handleChange("description")} /></div>
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
