"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import vehicleCatalog from "@/lib/vehicle-catalog.json";
import { useVehicleForm } from "@/hooks/use-vehicle-form";
import { useVehicleOptions } from "@/hooks/use-vehicle-options";
import { VehiclePhotoPicker } from "@/components/ui/vehicle-photo-picker";
import { FeatureListEditor } from "@/components/ui/feature-list-editor";
import { uploadVehicleImages } from "@/app/actions/upload";
import {
  capitalizeWords,
  COUNTRY_OPTIONS,
  countryInputLabel,
  isEngineValid,
  maskEngineValue,
  resolveCountryCode,
} from "@/lib/vehicle-options";
import { cheapestVariantFor, type ExtraVariantSummary } from "@/lib/extra-variants";

const CATALOG = vehicleCatalog as Record<string, { models: Record<string, { engine: string; power_hp: number; torque_nm: number; transmission: string; drivetrain: string }> }>;

interface ExtraCatalogItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

const SALE_TYPE_OPTIONS = [
  { value: "used", label: "Usado" },
  { value: "new", label: "Novo (por encomenda)" },
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
  brand: "BMW",
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
  origin_country: "Alemanha - DE",
  price: "",
  warranty_months: "6",
  cover_image_url: "",
  description: "",
  is_featured: "false",
  sale_type: "used",
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

// Seta desenhada por nós: os selects usam `appearance:none` para ficarem
// iguais em todos os browsers, por isso a seta nativa desaparece. Altura
// mínima de 44px para o dedo e espaço à direita para não tapar o texto.
const selectCaret =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a8a29e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")";

const selectStyle = {
  ...inputStyle,
  appearance: "none" as const,
  minHeight: "2.75rem",
  paddingRight: "2.1rem",
  backgroundImage: selectCaret,
  backgroundRepeat: "no-repeat" as const,
  backgroundPosition: "right 0.7rem center",
  backgroundSize: "12px 12px",
};

const labelStyle = {
  display: "block",
  marginBottom: "0.25rem",
  fontSize: "0.75rem",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  color: "var(--muted)",
} as const;

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label style={labelStyle}>{label}</label>
    {children}
    {error && <p role="alert" style={{ marginTop: "0.25rem", fontSize: "0.6875rem", color: "#ef4444" }}>{error}</p>}
  </div>
);

// Campos obrigatórios em falta ficam com a borda vermelha (a validação é
// feita no submit, com o form em noValidate).
const withError = (base: React.CSSProperties, error?: string): React.CSSProperties =>
  error ? { ...base, borderColor: "#ef4444" } : base;

export default function NovoVeiculo() {
  const router = useRouter();
  const { form, handleChange, handleCheckboxChange, setField, setMultiple } = useVehicleForm(initialForm);
  const { exteriorColors, interiorColors, featureOptions } = useVehicleOptions();
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [coverPhotoIndex, setCoverPhotoIndex] = useState(0);
  const [extraCatalog, setExtraCatalog] = useState<ExtraCatalogItem[]>([]);
  const [extraVariants, setExtraVariants] = useState<ExtraVariantSummary[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Catálogo de extras partilhado — gerido em /admin/veiculos/extras.
  // As variantes ativas são carregadas para mostrar sempre a mais barata,
  // que é a opção que o cliente vê no configurador.
  useEffect(() => {
    (async () => {
      const [catalogRes, variantsRes] = await Promise.all([
        supabase
          .from("vehicle_extra_catalog")
          .select("id, name, price, image_url")
          .eq("is_active", true)
          .order("position", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("vehicle_extra_variants")
          .select("extra_id, name, price, position, is_active")
          .eq("is_active", true)
          .order("position", { ascending: true }),
      ]);
      setExtraCatalog((catalogRes.data || []) as ExtraCatalogItem[]);
      setExtraVariants((variantsRes.data || []) as ExtraVariantSummary[]);
    })();
  }, []);

  // Extras só fazem sentido em viaturas novas por encomenda — a limpeza é
  // feita no próprio onChange do "Tipo de venda" (sem efeito de sincronização).

  const brands = useMemo(() => Object.keys(CATALOG).sort((a, b) => a.localeCompare(b, "pt")), []);
  const models = useMemo(() => CATALOG[form.brand]?.models || {}, [form.brand]);
  const modelNames = useMemo(() => Object.keys(models).sort(), [models]);

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
        // O catálogo guarda "2.0d"/"3.0d"; o formulário só aceita X.X.
        engine: maskEngineValue(specs.engine),
        power_hp: String(specs.power_hp),
        torque_nm: String(specs.torque_nm),
        transmission: specs.transmission,
        drivetrain: specs.drivetrain,
      });
    } else {
      setMultiple({ model, engine: "", power_hp: "", torque_nm: "", transmission: "automatic", drivetrain: "rwd" });
    }
  }, [setMultiple, models]);

  // Limpa a borda vermelha de um campo assim que o utilizador o corrige.
  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // Campos que o utilizador já preencheu/editou. Só esses são validados
  // enquanto se escreve (não vale a pena marcar de vermelho o que ainda
  // ninguém tocou).
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const markTouched = useCallback((field: string) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }, []);

  // A primeira decisão do formulário é usado vs. novo: esconde os campos que
  // não fazem sentido numa viatura por encomenda (0 km, sem donos anteriores)
  // e limpa os extras selecionados quando passa a usado. Numa viatura nova o
  // ano é o atual, não há mês e a origem fica fixa como nacional.
  const handleSaleTypeChange = useCallback((value: string) => {
    clearError("mileage_km");
    clearError("registration_year");
    if (value === "new") {
      setSelectedExtras([]);
      setMultiple({
        sale_type: value,
        mileage_km: "0",
        previous_owners: "0",
        service_book: "full_dealer",
        registration_year: String(new Date().getFullYear()),
        registration_month: "",
        origin: "national",
        origin_country: "Portugal",
      });
    } else {
      setMultiple({
        sale_type: value,
        mileage_km: "",
        previous_owners: "1",
        service_book: "full_dealer",
      });
    }
  }, [clearError, setMultiple]);

  // Handler de campos obrigatórios: atualiza o valor e limpa o erro do campo.
  const handleFieldChange = useCallback((field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    handleChange(field)(event);
    clearError(field);
    markTouched(field);
  }, [clearError, handleChange, markTouched]);

  // Validação feita no submit (o form usa noValidate) para marcar a vermelho
  // os campos obrigatórios que ficaram vazios.
  const validate = useCallback((): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!form.brand.trim()) next.brand = "Escolhe a marca.";
    if (!form.model.trim()) next.model = "Indica o modelo.";
    // Viaturas novas ficam sempre com o ano atual (campo escondido).
    if (form.sale_type !== "new") {
      if (!form.registration_year.trim()) next.registration_year = "Indica o ano de registo.";
      else {
        const year = Number(form.registration_year);
        if (!Number.isFinite(year) || year < 1900 || year > 2100) next.registration_year = "Ano entre 1900 e 2100.";
      }
    }
    if (form.sale_type === "used") {
      if (!form.mileage_km.trim()) next.mileage_km = "Indica a quilometragem.";
      else if (Number(form.mileage_km) < 0) next.mileage_km = "Indica uma quilometragem válida.";
    }
    if (!isEngineValid(form.engine)) next.engine = "Usa o formato X.X (ex.: 2.0).";
    if (!form.price.trim()) next.price = "Indica o preço.";
    else if (Number(form.price) < 0) next.price = "Indica um preço válido.";
    return next;
  }, [form]);

  // Validação de um só campo, ao sair dele (item 13). Não espera pela
  // submissão e não pinta os restantes campos que ninguém tocou.
  const validateField = useCallback((field: string) => {
    const next = validate();
    setErrors((prev) => {
      const merged = { ...prev };
      if (next[field]) merged[field] = next[field];
      else delete merged[field];
      return merged;
    });
    markTouched(field);
  }, [validate, markTouched]);

  // Nacional → o país de origem fica fixo em Portugal e o campo desaparece.
  const handleOriginChange = useCallback((value: string) => {
    setMultiple({ origin: value, origin_country: value === "national" ? "Portugal" : countryInputLabel("DE") });
  }, [setMultiple]);

  // Validação imediata: pouco depois de parar de escrever, os campos já
  // tocados são revalidados, para o erro aparecer sem ser preciso submeter.
  useEffect(() => {
    const fields = Object.keys(touched);
    if (!fields.length) return;
    const timer = setTimeout(() => {
      const next = validate();
      setErrors((prev) => {
        const merged = { ...prev };
        for (const field of fields) {
          if (next[field]) merged[field] = next[field];
          else delete merged[field];
        }
        return merged;
      });
    }, 450);
    return () => clearTimeout(timer);
  }, [form, touched, validate]);

  const generateSlug = (brand: string, model: string, trim: string, year: string) => {
    return `${brand}-${model}-${trim}-${year}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    // A partir daqui os campos em falta também passam a ser revalidados
    // enquanto o utilizador os corrige.
    setTouched((prev) => {
      const next = { ...prev };
      for (const field of Object.keys(nextErrors)) next[field] = true;
      return next;
    });
    if (Object.keys(nextErrors).length) {
      // Foca o primeiro campo em falta para o utilizador saber onde corrigir.
      document.getElementById(`vehicle-${Object.keys(nextErrors)[0]}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      const { features, ...vehicleForm } = form;
      const slug = generateSlug(form.brand, form.model, form.trim, form.registration_year);
      const isNew = form.sale_type === "new";
      const { data: vehicle, error } = await supabase.from("vehicles").insert({
        ...vehicleForm,
        slug,
        engine: form.engine.trim(),
        // Viaturas novas: ano atual automático; usadas: ano introduzido.
        registration_year: isNew ? new Date().getFullYear() : form.registration_year ? parseInt(form.registration_year) : null,
        // Viaturas novas não têm mês de registo.
        registration_month: isNew || !form.registration_month ? null : parseInt(form.registration_month),
        power_hp: form.power_hp ? parseInt(form.power_hp) : null,
        torque_nm: form.torque_nm ? parseInt(form.torque_nm) : null,
        combined_consumption: form.combined_consumption ? parseFloat(form.combined_consumption) : null,
        co2_emissions: form.co2_emissions ? parseInt(form.co2_emissions) : null,
        mileage_km: isNew ? 0 : form.mileage_km ? parseInt(form.mileage_km) : null,
        previous_owners: isNew ? 0 : form.previous_owners ? parseInt(form.previous_owners) : null,
        exterior_color: capitalizeWords(form.exterior_color),
        interior_color: capitalizeWords(form.interior_color),
        // Viatura nova: origem fixa como nacional. Usada: país guardado em código (DE).
        origin: isNew ? "national" : form.origin,
        origin_country: isNew || form.origin === "national" ? "Portugal" : resolveCountryCode(form.origin_country) || null,
        price: form.price ? parseFloat(form.price) : null,
        warranty_months: form.warranty_months ? parseInt(form.warranty_months) : null,
        is_featured: form.is_featured === "true",
        // O estado é gerido na lista de viaturas; ao criar fica sempre disponível.
        status: "available",
        sold_at: null,
      }).select("id").single();

      if (error || !vehicle) {
        alert("Erro ao guardar: " + (error?.message || "Não foi possível criar a viatura."));
        return;
      }

      const featureLabels = features.split("\n").map((label) => label.trim()).filter(Boolean);
      if (featureLabels.length) {
        const { error: featureError } = await supabase.from("vehicle_features").insert(featureLabels.map((label) => ({ vehicle_id: vehicle.id, label })));
        if (featureError) {
          alert("A viatura foi criada, mas o equipamento não foi guardado: " + featureError.message);
          router.push(`/admin/veiculos/editar/${vehicle.id}`);
          return;
        }
      }

      // Extras escolhidos do catálogo (apenas viaturas novas por encomenda).
      if (form.sale_type === "new" && selectedExtras.length) {
        const { error: extrasError } = await supabase.from("vehicle_extras").insert(
          selectedExtras.map((catalogId) => {
            const extra = extraCatalog.find((item) => item.id === catalogId);
            return {
              vehicle_id: vehicle.id,
              catalog_extra_id: catalogId,
              name: extra?.name || "Extra",
              price: extra?.price ?? 0,
            };
          })
        );
        if (extrasError) {
          alert("A viatura foi criada, mas os extras não foram guardados: " + extrasError.message);
          router.push(`/admin/veiculos/editar/${vehicle.id}`);
          return;
        }
      }

      if (photos.length) {
        const formData = new FormData();
        formData.append("vehicleId", vehicle.id);
        // A capa passa a ser definida pela própria action (evita uma segunda
        // Server Action + leitura à BD depois do upload).
        formData.append("coverIndex", String(coverPhotoIndex));
        photos.forEach((photo) => formData.append("files", photo));
        const upload = await uploadVehicleImages(formData);
        if (upload.error || !upload.urls?.length) {
          alert(`A viatura foi criada, mas as fotografias não foram carregadas: ${upload.error || "erro no upload"}. Podes tentar novamente ao editar a viatura.`);
          router.push(`/admin/veiculos/editar/${vehicle.id}`);
          return;
        }
      }
      router.push("/admin/veiculos");
    } catch (error) {
      alert("Erro ao guardar: " + (error instanceof Error ? error.message : "erro inesperado"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl uppercase tracking-wide mb-6" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>Nova Viatura</h1>
      <form onSubmit={handleSubmit} noValidate style={{ backgroundColor: "var(--surface-mid)", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "1.5rem" }}>
        {/* Primeira pergunta: usada ou nova */}
        <fieldset style={{ border: "none", padding: 0, margin: 0, marginBottom: "1.5rem" }}>
          <legend className="text-xs uppercase tracking-widest" style={{ color: "var(--copper-deep)", marginBottom: "0.5rem" }}>1. Esta viatura é…</legend>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
            {SALE_TYPE_OPTIONS.map((option) => {
              const active = form.sale_type === option.value;
              return (
                <label
                  key={option.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.9rem 1rem",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    border: `1px solid ${active ? "var(--copper)" : "var(--border)"}`,
                    backgroundColor: active ? "rgba(244,119,36,0.09)" : "var(--background-alt)",
                  }}
                >
                  <input
                    type="radio"
                    name="sale_type"
                    checked={active}
                    onChange={() => handleSaleTypeChange(option.value)}
                  />
                  <span>
                    <span style={{ display: "block", fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.875rem", color: active ? "var(--copper)" : "var(--foreground)" }}>
                      {option.label}
                    </span>
                    <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)" }}>
                      {option.value === "new" ? "Por encomenda, 0 km, configurável com extras" : "Já matriculada, com histórico e quilometragem"}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Identificação */}
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--copper-deep)" }}>Identificação</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <Field label="Marca *" error={errors.brand}>
            <select id="vehicle-brand" aria-invalid={Boolean(errors.brand)} style={withError(selectStyle, errors.brand)} value={form.brand} onBlur={() => validateField("brand")} onChange={(e) => { handleBrandChange(e.target.value); clearError("brand"); markTouched("brand"); }}>
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Modelo *" error={errors.model}>
            <>
              <input id="vehicle-model" required list="vehicle-models" aria-invalid={Boolean(errors.model)} style={withError(inputStyle, errors.model)} placeholder="Escreve ou seleciona o modelo" value={form.model} onBlur={() => validateField("model")} onChange={(e) => { handleModelChange(e.target.value); clearError("model"); markTouched("model"); }} />
              <datalist id="vehicle-models">{modelNames.map((m) => <option key={m} value={m} />)}</datalist>
            </>
          </Field>
          <Field label="Versão / Trim"><input style={inputStyle} value={form.trim} onChange={handleChange("trim")} /></Field>
          {form.sale_type === "used" && (
            <>
              <Field label="Ano Registo *" error={errors.registration_year}>
                <input id="vehicle-registration_year" required type="number" min="1900" max="2100" aria-invalid={Boolean(errors.registration_year)} style={withError(inputStyle, errors.registration_year)} value={form.registration_year} onBlur={() => validateField("registration_year")} onChange={handleFieldChange("registration_year")} />
              </Field>
              <Field label="Mês Registo"><input type="number" min="1" max="12" style={inputStyle} value={form.registration_month} onChange={handleChange("registration_month")} /></Field>
            </>
          )}
        </div>

        {/* Especificações Técnicas */}
        <p className="text-xs uppercase tracking-widest mb-3 mt-5" style={{ color: "var(--copper-deep)" }}>Especificações Técnicas</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <Field label="Motor" error={errors.engine}>
            <input id="vehicle-engine" inputMode="decimal" maxLength={3} placeholder="ex: 2.0" aria-invalid={Boolean(errors.engine)} style={withError(inputStyle, errors.engine)} value={form.engine} onBlur={() => validateField("engine")} onChange={(e) => { setField("engine", maskEngineValue(e.target.value)); clearError("engine"); markTouched("engine"); }} />
          </Field>
          <Field label="Potência (CV)"><input type="number" min="0" style={inputStyle} value={form.power_hp} onChange={handleChange("power_hp")} /></Field>
          <Field label="Binário (Nm)"><input type="number" min="0" style={inputStyle} value={form.torque_nm} onChange={handleChange("torque_nm")} /></Field>
          <Field label="Caixa"><select style={selectStyle} value={form.transmission} onChange={handleChange("transmission")}><option value="automatic">Automática</option><option value="manual">Manual</option></select></Field>
          <Field label="Tração"><select style={selectStyle} value={form.drivetrain} onChange={handleChange("drivetrain")}><option value="rwd">RWD</option><option value="awd">AWD/xDrive</option><option value="fwd">FWD</option></select></Field>
          <Field label="Combustível"><select style={selectStyle} value={form.fuel_type} onChange={handleChange("fuel_type")}>{FUEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
          <Field label="Consumo (l/100km)"><input type="number" step="0.1" min="0" style={inputStyle} value={form.combined_consumption} onChange={handleChange("combined_consumption")} /></Field>
          <Field label="CO₂ (g/km)"><input type="number" min="0" style={inputStyle} value={form.co2_emissions} onChange={handleChange("co2_emissions")} /></Field>
        </div>

        {/* Veículo */}
        <p className="text-xs uppercase tracking-widest mb-3 mt-5" style={{ color: "var(--copper-deep)" }}>Veículo</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
          {/* Quilometragem, donos e caderneta só existem em viaturas usadas. */}
          {form.sale_type === "used" && (
            <>
              <Field label="Quilometragem *" error={errors.mileage_km}><input id="vehicle-mileage_km" required type="number" min="0" aria-invalid={Boolean(errors.mileage_km)} style={withError(inputStyle, errors.mileage_km)} value={form.mileage_km} onBlur={() => validateField("mileage_km")} onChange={handleFieldChange("mileage_km")} /></Field>
            </>
          )}
          <Field label="Cor Exterior">
            <>
              <input
                list="vehicle-exterior-colors"
                placeholder="Escreve ou escolhe"
                style={inputStyle}
                value={form.exterior_color}
                onChange={handleChange("exterior_color")}
                onBlur={(e) => setField("exterior_color", capitalizeWords(e.target.value))}
              />
              <datalist id="vehicle-exterior-colors">
                {exteriorColors.map((color) => <option key={color} value={color} />)}
              </datalist>
            </>
          </Field>
          <Field label="Estilo de Carro"><select style={selectStyle} value={form.body_style} onChange={handleChange("body_style")}><option value="">Selecionar estilo</option><option value="sedan">Sedan</option><option value="coupe">Coupé</option><option value="touring">Carrinha / Touring</option><option value="hatchback">Hatchback</option><option value="suv">SUV</option><option value="cabrio">Cabrio</option><option value="compact">Compacto</option><option value="monovolume">Monovolume</option><option value="outro">Outro</option></select></Field>
          <Field label="Cor Interior">
            <>
              <input
                list="vehicle-interior-colors"
                placeholder="Escreve ou escolhe"
                style={inputStyle}
                value={form.interior_color}
                onChange={handleChange("interior_color")}
                onBlur={(e) => setField("interior_color", capitalizeWords(e.target.value))}
              />
              <datalist id="vehicle-interior-colors">
                {interiorColors.map((color) => <option key={color} value={color} />)}
              </datalist>
            </>
          </Field>
          {form.sale_type === "used" && (
            <>
              <Field label="Donos Anteriores"><input type="number" min="0" style={inputStyle} value={form.previous_owners} onChange={handleChange("previous_owners")} /></Field>
              <Field label="Caderneta"><select style={selectStyle} value={form.service_book} onChange={handleChange("service_book")}>{SERVICE_BOOK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
            </>
          )}
        </div>

        {/* Origem — viaturas novas são sempre nacionais, por isso a secção não aparece. */}
        {form.sale_type === "used" && (
          <>
            <p className="text-xs uppercase tracking-widest mb-3 mt-5" style={{ color: "var(--copper-deep)" }}>Origem & Legalização</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
              <Field label="Origem"><select style={selectStyle} value={form.origin} onChange={(e) => handleOriginChange(e.target.value)}>{ORIGIN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
              {/* Nacional → país de origem fixo em Portugal (campo escondido). */}
              {form.origin === "imported" ? (
                <Field label="País Origem">
                  <>
                    <input
                      list="vehicle-origin-countries"
                      placeholder="Alemanha - DE"
                      style={inputStyle}
                      value={form.origin_country}
                      onChange={handleChange("origin_country")}
                      onBlur={(e) => setField("origin_country", countryInputLabel(e.target.value))}
                    />
                    <datalist id="vehicle-origin-countries">
                      {COUNTRY_OPTIONS.map((country) => <option key={country} value={country} />)}
                    </datalist>
                    <p style={{ marginTop: "0.25rem", fontSize: "0.6875rem", color: "var(--muted-deep)" }}>
                      Aceita o nome ou o código (ex.: Alemanha, alemanha ou DE) e guarda sempre o código.
                    </p>
                  </>
                </Field>
              ) : (
                <Field label="País Origem"><input readOnly style={{ ...inputStyle, color: "var(--muted)" }} value="Portugal" /></Field>
              )}
            </div>
          </>
        )}

        {/* Preço */}
        <p className="text-xs uppercase tracking-widest mb-3 mt-5" style={{ color: "var(--copper-deep)" }}>Preço</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <Field label="Preço (€) *" error={errors.price}><input id="vehicle-price" required type="number" min="0" step="100" aria-invalid={Boolean(errors.price)} style={withError(inputStyle, errors.price)} value={form.price} onBlur={() => validateField("price")} onChange={handleFieldChange("price")} /></Field>
          <Field label="Garantia (meses)"><input type="number" min="0" style={inputStyle} value={form.warranty_months} onChange={handleChange("warranty_months")} /></Field>
        </div>

        <VehiclePhotoPicker onChange={(files, coverIndex) => { setPhotos(files); setCoverPhotoIndex(coverIndex); }} />

        {/* Extras configuráveis — só fazem sentido em viaturas novas */}
        {form.sale_type === "new" && (
          <div style={{ marginTop: "1rem", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.75rem" }}>
            <label style={labelStyle}>Extras configuráveis (catálogo)</label>
            <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
              Geridos em <strong>Viaturas → Extras</strong>. O cliente escolhe as variantes na ficha da viatura.
            </p>
            {extraCatalog.length === 0 ? (
              <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Ainda não existem extras no catálogo.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.5rem" }}>
                {extraCatalog.map((extra) => {
                  const checked = selectedExtras.includes(extra.id);
                  const cheapest = cheapestVariantFor(extra.id, extraVariants);
                  const shownPrice = cheapest ? Number(cheapest.price) || 0 : extra.price;
                  return (
                    <label
                      key={extra.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.625rem",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "0.5rem",
                        cursor: "pointer",
                        border: `1px solid ${checked ? "var(--copper)" : "var(--border)"}`,
                        backgroundColor: checked ? "rgba(244,119,36,0.09)" : "var(--background-alt)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setSelectedExtras((prev) =>
                            e.target.checked ? [...prev, extra.id] : prev.filter((id) => id !== extra.id)
                          )
                        }
                      />
                      {extra.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- fotografia vem do R2 (domínio configurável)
                        <img src={extra.image_url} alt="" style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.25rem", objectFit: "cover", flex: "none" }} />
                      ) : null}
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: "0.8125rem", color: "var(--foreground)" }}>{extra.name}</span>
                        <span style={{ display: "block", fontSize: "0.6875rem", color: "var(--muted)" }}>
                          {/* Com variantes mostra-se a mais barata — é a opção
                              que o cliente vê no configurador. */}
                          {cheapest ? `${cheapest.name} · ` : ""}
                          {shownPrice ? `${shownPrice.toLocaleString("pt-PT")} €` : "Incluído"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <FeatureListEditor
          label="Extras e equipamento"
          value={form.features}
          options={featureOptions}
          onChange={(value) => setField("features", value)}
          labelStyle={labelStyle}
          inputStyle={inputStyle}
          placeholder="ex: Teto panorâmico"
        />
        <div style={{ marginTop: "0.75rem" }}>
          <label style={labelStyle}>Descrição</label>
          <textarea rows={4} style={{ ...inputStyle, resize: "vertical" as const }} value={form.description} onChange={handleChange("description")} />
        </div>
        <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input type="checkbox" id="featured" checked={form.is_featured === "true"} onChange={handleCheckboxChange("is_featured")} />
          <label htmlFor="featured" style={{ color: "var(--foreground)", fontSize: "0.875rem" }}>Destaque</label>
        </div>

        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded text-sm font-medium transition-opacity" style={{ backgroundColor: "var(--copper-deep)", color: "var(--background-alt)", opacity: saving ? 0.6 : 1 }}>
            {saving ? "A guardar..." : "Criar Viatura"}
          </button>
          <button type="button" onClick={() => router.push("/admin/veiculos")} className="px-4 py-2 rounded text-sm transition-colors" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
