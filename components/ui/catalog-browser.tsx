"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { VehicleCardGallery } from "@/components/ui/vehicle-card-gallery";
import { Reveal } from "@/components/ui/reveal";

type Vehicle = {
  id: string; slug: string; brand?: string | null; model?: string | null; trim?: string | null;
  registration_year?: number | null; mileage_km?: number | null; power_hp?: number | null;
  condition?: string | null; sale_type?: string | null; brand_warranty_months?: number | null; delivery_estimate_days?: number | null;
  fuel_type?: string | null; transmission?: string | null; exterior_color?: string | null;
  body_style?: string | null; price?: number | null; status?: string | null; cover_image_url?: string | null;
  description?: string | null;
  vehicle_images?: { url?: string | null; position?: number | null; alt_text?: string | null }[] | null;
};

const control = "w-full appearance-none border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-copper focus-visible:ring-2 focus-visible:ring-copper/60 disabled:cursor-not-allowed disabled:opacity-40";
const all = "all";
const unique = (items: (string | number | null | undefined)[]) => [...new Set(items.filter((item): item is string | number => item !== null && item !== undefined && item !== ""))].sort((a, b) => String(a).localeCompare(String(b), "pt-PT", { numeric: true }));

function photosFor(v: Vehicle) {
  return [...(v.cover_image_url ? [{ url: v.cover_image_url }] : []), ...((v.vehicle_images || []).filter((image) => image.url).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((image) => ({ url: image.url!, alt: image.alt_text || "" })))].filter((photo, index, allPhotos) => allPhotos.findIndex((candidate) => candidate.url === photo.url) === index).slice(0, 2);
}

function statusLabel(status?: string | null) {
  if (status === "reserved") return { label: "Reservada", color: "var(--warning)" };
  if (status === "sold") return { label: "Vendida", color: "var(--muted)" };
  if (status === "available") return { label: "Disponível", color: "var(--copper)" };
  return null;
}

function RangeFilter({ label, values, min, max, onMin, onMax, unit, step = 1, year = false }: { label: string; values: number[]; min: string; max: string; onMin: (value: string) => void; onMax: (value: string) => void; unit?: string; step?: number; year?: boolean }) {
  const domainMin = values.length ? Math.min(...values) : undefined;
  const domainMax = values.length ? Math.max(...values) : undefined;
  const inputClass = `${control} min-w-0 px-3 placeholder:italic placeholder:text-white/50 ${unit ? "pr-8" : ""} ${year ? "tabular-nums" : ""}`;
  // Se "de" ultrapassar "até" (ou o contrário), os valores são invertidos
  // automaticamente — mas só 1s depois de o user parar de escrever, para não
  // trocar os campos a meio da digitação.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minRef = useRef(min);
  const maxRef = useRef(max);
  useEffect(() => { minRef.current = min; maxRef.current = max; }, [min, max]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const swapIfInverted = () => {
    const a = minRef.current;
    const b = maxRef.current;
    if (a !== all && b !== all && Number(a) > Number(b)) {
      onMin(b);
      onMax(a);
    }
  };
  const scheduleSwap = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(swapIfInverted, 1000);
  };

  // Valores já invertidos vindos do URL (ex.: ?ano_a=2025&ano_b=2015) são
  // normalizados logo na 1.ª renderização, sem esperar pelo debounce.
  useEffect(() => {
    if (min !== all && max !== all && Number(min) > Number(max)) {
      onMin(max);
      onMax(min);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (kind: "min" | "max", raw: string) => {
    if (year) {
      // Ano: só dígitos, no máximo 4; a partir do 3.º dígito tem de começar
      // por 20 (só viaturas deste século no catálogo).
      const digits = raw.replace(/\D/g, "").slice(0, 4);
      if (digits.length > 2 && !digits.startsWith("20")) return;
      (kind === "min" ? onMin : onMax)(digits || all);
    } else {
      (kind === "min" ? onMin : onMax)(raw || all);
    }
    scheduleSwap();
  };

  const common = {
    className: inputClass,
    inputMode: "numeric" as const,
    maxLength: year ? 4 : undefined,
    min: year ? undefined : domainMin,
    max: year ? undefined : domainMax,
    step: year ? undefined : step,
  };
  return <fieldset className="border-0 p-0"><legend className="mb-2 font-display text-[10px] uppercase tracking-[0.16em] text-white/65">{label}</legend><div className="grid grid-cols-2 gap-2"><label className="relative"><span className="sr-only">{label} desde</span><input {...common} type={year ? "text" : "number"} placeholder="de" aria-label={`${label} de`} value={min === all ? "" : min} onChange={(e) => handleChange("min", e.target.value)} />{unit && <span aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/60">{unit}</span>}</label><label className="relative"><span className="sr-only">{label} até</span><input {...common} type={year ? "text" : "number"} placeholder="até" aria-label={`${label} até`} value={max === all ? "" : max} onChange={(e) => handleChange("max", e.target.value)} />{unit && <span aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/60">{unit}</span>}</label></div></fieldset>;
}

// Select de filtro simples, sem seta personalizada ("sem nada"): o user abre
// a lista no clique e escolhe; sem ícones a rodar.
function SelectField({ label, value, onChange, disabled, placeholder, options }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; placeholder: string; options: { value: string; label: string }[] }) {
  return <label className="block"><span className="mb-2 block font-display text-[10px] uppercase tracking-[0.16em] text-white/65">{label}</span><select className={`${control} cursor-pointer`} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}><option value={all}>{placeholder}</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}

export function CatalogBrowser({ vehicles, hideMileageYear = false }: { vehicles: Vehicle[]; hideMileageYear?: boolean }) {
  const searchParams = useSearchParams();
  const param = (key: string): string => searchParams.get(key) ?? all;

  // Os filtros vivem no URL (?marca=…&preco_a=…): ao abrir por um link com
  // parâmetros o estado inicial vem daí (permite partilhar filtros).
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [brand, setBrand] = useState(() => param("marca"));
  const [model, setModel] = useState(() => param("modelo"));
  const [fuel, setFuel] = useState(() => param("combustivel"));
  const [color, setColor] = useState(() => param("cor"));
  const [bodyStyle, setBodyStyle] = useState(() => param("estilo"));
  const [minPower, setMinPower] = useState(() => param("cv_a"));
  const [maxPower, setMaxPower] = useState(() => param("cv_b"));
  // Na página Novos (hideMileageYear) os filtros de primeiro registo e
  // quilometragem não existem: os estados ficam sempre "all" e não vão para o URL.
  const [minYear, setMinYear] = useState(() => (hideMileageYear ? all : param("ano_a")));
  const [maxYear, setMaxYear] = useState(() => (hideMileageYear ? all : param("ano_b")));
  const [minPrice, setMinPrice] = useState(() => param("preco_a"));
  const [maxPrice, setMaxPrice] = useState(() => param("preco_b"));
  const [minMileage, setMinMileage] = useState(() => (hideMileageYear ? all : param("km_a")));
  const [maxMileage, setMaxMileage] = useState(() => (hideMileageYear ? all : param("km_b")));
  // Ordenação da lista (?ordenar=…): por omissão a ordem do servidor (mais recentes).
  const [sort, setSort] = useState(() => param("ordenar"));

  // Mantém o URL sincronizado com os filtros sem recarregar a página.
  // replaceState não cria entradas no histórico: "voltar atrás" volta à página
  // anterior e o filtro fica sempre preservado no URL atual.
  useEffect(() => {
    const params = new URLSearchParams();
    const setParam = (key: string, value: string) => {
      if (value !== all && value !== "") params.set(key, value);
    };
    setParam("q", query);
    setParam("marca", brand);
    setParam("modelo", model);
    setParam("combustivel", fuel);
    setParam("cor", color);
    setParam("estilo", bodyStyle);
    setParam("cv_a", minPower);
    setParam("cv_b", maxPower);
    if (!hideMileageYear) {
      setParam("ano_a", minYear);
      setParam("ano_b", maxYear);
    }
    setParam("preco_a", minPrice);
    setParam("preco_b", maxPrice);
    if (!hideMileageYear) {
      setParam("km_a", minMileage);
      setParam("km_b", maxMileage);
    }
    setParam("ordenar", sort);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, [query, brand, model, fuel, color, bodyStyle, minPower, maxPower, minYear, maxYear, minPrice, maxPrice, minMileage, maxMileage, sort, hideMileageYear]);

  const brands = useMemo(() => unique(vehicles.map((v) => v.brand)) as string[], [vehicles]);
  const models = useMemo(() => unique(vehicles.filter((v) => brand === all || v.brand === brand).map((v) => v.model)) as string[], [vehicles, brand]);
  const fuels = useMemo(() => unique(vehicles.map((v) => v.fuel_type)) as string[], [vehicles]);
  const colors = useMemo(() => unique(vehicles.map((v) => v.exterior_color)) as string[], [vehicles]);
  const bodyStyles = useMemo(() => unique(vehicles.map((v) => v.body_style)) as string[], [vehicles]);
  const years = useMemo(() => unique(vehicles.map((v) => v.registration_year)) as number[], [vehicles]);
  const prices = useMemo(() => unique(vehicles.map((v) => v.price)) as number[], [vehicles]);
  const mileages = useMemo(() => unique(vehicles.map((v) => v.mileage_km)) as number[], [vehicles]);
  const powers = useMemo(() => unique(vehicles.map((v) => v.power_hp)) as number[], [vehicles]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pt-PT");
    // A pesquisa parte a string em palavras e cada palavra tem de existir em
    // alguma parte da viatura — a ordem não interessa ("bmw 2017 gasóleo" é
    // igual a "2017 bmw gasóleo"). Remove acentos para "gasóleo"≈"gasoleo".
    const tokens = needle.split(/\s+/).filter(Boolean);
    const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Termos alternativos para combustível e estado (gíria comum / variantes).
    const fuelAliases = (v: Vehicle): string[] => {
      const fuel = (v.fuel_type ?? "").toLocaleLowerCase("pt-PT");
      if (fuel.includes("diesel") || fuel.includes("gasoleo") || fuel.includes("gasóleo")) return ["diesel", "disel", "gasoleo", "gasóleo"];
      if (fuel.includes("gasolina") || fuel.includes("gasoline")) return ["gasolina", "gasoline", "petrol"];
      if (fuel.includes("híbrido") || fuel.includes("hibrido") || fuel.includes("hybrid")) return ["híbrido", "hibrido", "hybrid"];
      if (fuel.includes("elétrico") || fuel.includes("eletrico") || fuel.includes("electric")) return ["elétrico", "eletrico", "electric"];
      return [];
    };
    const numericMatch = (value: number | null | undefined, lower: string, upper: string) => lower === all && upper === all || value != null && (lower === all || value >= Number(lower)) && (upper === all || value <= Number(upper));
    const list = vehicles.filter((v) => {
      const partes = [
        v.brand, v.model, v.trim, v.registration_year, v.mileage_km, v.power_hp,
        v.fuel_type, ...fuelAliases(v), v.transmission, v.exterior_color, v.body_style,
        v.status, statusLabel(v.status)?.label, v.price, v.description, v.condition, v.sale_type,
      ];
      if (v.status === "available") partes.push("disponíveis", "disponiveis", "em garagem", "disponível", "disponivel");
      if (v.status === "reserved") partes.push("reservada", "reservadas");
      if (v.status === "sold") partes.push("vendida", "vendido");
      const flat = partes.filter((p): p is string | number => p !== null && p !== undefined && p !== "").map((p) => fold(String(p))).join(" ").toLocaleLowerCase("pt-PT");
      const compact = flat.replace(/\s+/g, "");
      const matchesQuery = tokens.every((token) => {
        const tok = fold(token);
        return flat.includes(tok) || compact.includes(tok.replace(/\s+/g, ""));
      });
      return matchesQuery && (brand === all || v.brand === brand) && (model === all || v.model === model) && (fuel === all || v.fuel_type === fuel) && (color === all || v.exterior_color === color) && (bodyStyle === all || v.body_style === bodyStyle) && numericMatch(v.registration_year, minYear, maxYear) && numericMatch(v.price, minPrice, maxPrice) && numericMatch(v.mileage_km, minMileage, maxMileage) && numericMatch(v.power_hp, minPower, maxPower);
    });
    // Ordenação escolhida pelo visitante; por omissão mantém a ordem do
    // servidor (mais recentes primeiro). Viaturas sem valor vão para o fim.
    const missing = (direction: 1 | -1) => (direction === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
    const by = (pick: (v: Vehicle) => number | null | undefined, direction: 1 | -1) =>
      [...list].sort((a, b) => ((pick(a) ?? missing(direction)) * direction) - ((pick(b) ?? missing(direction)) * direction));
    if (sort === "preco_asc") return by((v) => v.price, 1);
    if (sort === "preco_desc") return by((v) => v.price, -1);
    if (sort === "ano_desc") return by((v) => v.registration_year, -1);
    if (sort === "ano_asc") return by((v) => v.registration_year, 1);
    if (sort === "km_asc") return by((v) => v.mileage_km, 1);
    if (sort === "km_desc") return by((v) => v.mileage_km, -1);
    return list;
  }, [vehicles, query, brand, model, fuel, color, bodyStyle, minYear, maxYear, minPrice, maxPrice, minMileage, maxMileage, minPower, maxPower, sort]);

  const clear = () => { setQuery(""); setBrand(all); setModel(all); setFuel(all); setColor(all); setBodyStyle(all); setMinPower(all); setMaxPower(all); setMinYear(all); setMaxYear(all); setMinPrice(all); setMaxPrice(all); setMinMileage(all); setMaxMileage(all); };
  const optionLabel = (value: string) => value.replaceAll("_", " ").replace(/^./, (first) => first.toLocaleUpperCase("pt-PT"));

  const activeFilterCount = useMemo(() => [query, brand, model, fuel, color, bodyStyle, minPower, maxPower, minYear, maxYear, minPrice, maxPrice, minMileage, maxMileage].filter((value) => value !== all && value !== "").length, [query, brand, model, fuel, color, bodyStyle, minPower, maxPower, minYear, maxYear, minPrice, maxPrice, minMileage, maxMileage]);

  return <>
    <div className="mt-9 flex flex-col gap-3 border border-white/10 bg-surface-oxide p-3 sm:flex-row sm:p-4">
      <label className="relative flex-1"><span className="sr-only">Pesquisar viaturas</span><svg className="absolute left-4 top-1/2 -translate-y-1/2 text-copper" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar por modelo, versão, ano..." className="w-full border border-white/10 bg-black px-12 py-4 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:border-copper focus-visible:ring-2 focus-visible:ring-copper/60" /></label>
      <div className="flex items-center justify-between gap-5 border border-white/10 bg-black px-5 py-3 sm:min-w-52"><span className="font-display text-[10px] uppercase tracking-[0.18em] text-white/60">Em garagem</span><span className="font-display text-lg tabular-nums text-white">{filtered.length.toString().padStart(2, "0")} <span className="text-xs text-white/60">/ {vehicles.length.toString().padStart(2, "0")}</span></span></div>
    </div>

    {/* ── Toggle de filtros (mobile) ── */}
    <button type="button" onClick={() => setMobileFiltersOpen((open) => !open)} aria-expanded={mobileFiltersOpen} aria-controls="catalogo-filtros" className="mt-4 flex w-full min-h-12 items-center justify-between border border-white/10 bg-surface-oxide px-4 py-3 font-display text-xs font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:border-copper/60 lg:hidden">
      <span className="flex items-center gap-2.5">Filtros{activeFilterCount > 0 && <span className="rounded-full bg-copper px-2 py-0.5 text-[10px] font-bold text-black">{activeFilterCount}</span>}</span>
      <svg className={`transition-transform duration-200 ${mobileFiltersOpen ? "rotate-180" : ""}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
    </button>

    <div className="mt-7 grid gap-8 lg:grid-cols-[270px_1fr] xl:gap-12">
      <aside id="catalogo-filtros" className={`h-fit border border-white/10 bg-surface-oxide p-5 sm:p-6 ${mobileFiltersOpen ? "block" : "hidden"} lg:sticky lg:bottom-0 lg:block lg:max-h-[calc(100vh-1.5rem)] lg:overflow-y-auto`}><div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4"><h2 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-white">Filtros</h2><button type="button" onClick={clear} className="font-display text-[10px] uppercase tracking-[0.16em] text-copper transition-colors hover:text-white">Limpar</button></div>
        <div className="space-y-5">
          <SelectField label="Marca" value={brand} onChange={(value) => { setBrand(value); setModel(all); }} placeholder="Todas as marcas" options={brands.map((value) => ({ value, label: value }))} />
          <SelectField label="Modelo" value={model} onChange={setModel} placeholder="Todos os modelos" disabled={!models.length} options={models.map((value) => ({ value, label: value }))} />
          <SelectField label="Combustível" value={fuel} onChange={setFuel} placeholder="Todos" options={fuels.map((value) => ({ value, label: optionLabel(value) }))} />
          <SelectField label="Cor exterior" value={color} onChange={setColor} placeholder="Todas as cores" options={colors.map((value) => ({ value, label: optionLabel(value) }))} />
          <SelectField label="Estilo" value={bodyStyle} onChange={setBodyStyle} placeholder="Todos os estilos" options={bodyStyles.map((value) => ({ value, label: optionLabel(value) }))} />
          <RangeFilter label="Desempenho · CV" values={powers} min={minPower} max={maxPower} onMin={setMinPower} onMax={setMaxPower} step={10} />
          <RangeFilter label="Preço" values={prices} min={minPrice} max={maxPrice} onMin={setMinPrice} onMax={setMaxPrice} step={500} unit="€" />
          {/* Na página Novos não faz sentido: tudo é 0 km e do ano corrente. */}
          {!hideMileageYear && <RangeFilter label="Primeiro registo" values={years} min={minYear} max={maxYear} onMin={setMinYear} onMax={setMaxYear} year />}
          {!hideMileageYear && <RangeFilter label="Quilometragem" values={mileages} min={minMileage} max={maxMileage} onMin={setMinMileage} onMax={setMaxMileage} step={1000} unit="km" />}
        </div>
      </aside>
    <section aria-live="polite"><div className="mb-5 flex flex-wrap items-center gap-4"><span className="h-px flex-1 bg-white/10"/><label className="flex items-center gap-2"><span className="font-display text-[10px] uppercase tracking-[0.2em] text-white/60">Ordenar</span><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar viaturas" className={`${control} w-auto cursor-pointer py-2 pr-8`}><option value={all}>Mais recentes</option><option value="preco_asc">Preço · crescente</option><option value="preco_desc">Preço · decrescente</option><option value="ano_desc">Ano · mais recente</option><option value="ano_asc">Ano · mais antigo</option><option value="km_asc">Quilómetros · menos</option><option value="km_desc">Quilómetros · mais</option></select></label></div>
        {filtered.length === 0 ? <div className="border border-white/10 bg-surface-oxide px-6 py-20 text-center"><p className="font-display text-xl uppercase tracking-wide text-white">Nenhuma viatura encontrada</p><p className="mt-2 text-sm text-white/60">Altera os filtros ou tenta outra pesquisa.</p><button type="button" onClick={clear} className="mt-6 border border-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-copper transition-colors hover:bg-copper hover:text-white">Limpar filtros</button></div> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((v, index) => { const status = statusLabel(v.status); return <Reveal key={v.id} className="h-full" delay={Math.min(index * 55, 330)}><article className="card-lift group h-full overflow-hidden border border-white/10 bg-surface hover:border-copper/70 hover:shadow-[0_0_24px_rgba(244,119,36,0.13)]"><VehicleCardGallery photos={photosFor(v)} href={`/catalogo/${v.slug}`} title={`${v.brand ?? ""} ${v.model ?? ""}`}><div className="absolute right-3 top-3 z-20"><FavoriteButton vehicleId={v.id}/></div>{v.condition === "new" && <span className="absolute left-3 top-3 z-20 bg-copper px-3 py-1 font-display text-[10px] uppercase tracking-[0.15em] text-black">Novo</span>}{status && <span className="absolute bottom-3 left-3 z-20 border border-current bg-black/80 px-3 py-1 font-display text-[10px] uppercase tracking-[0.15em]" style={{color:status.color}}>{status.label}</span>}</VehicleCardGallery><Link href={`/catalogo/${v.slug}`} className="block p-4 sm:p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-copper"><p className="font-display text-[10px] uppercase tracking-[0.18em] text-white/60">{v.brand || ""} <span className="text-copper">·</span> {v.registration_year || ""}</p><h3 className="mt-2 font-display text-xl font-semibold uppercase tracking-wide text-white">{v.model}</h3>{v.trim && <p className="mt-1 font-display text-[10px] uppercase tracking-[0.15em] text-copper">{v.trim}</p>}<div className="mt-4 grid grid-cols-2 gap-y-2 border-y border-white/10 py-3 text-xs"><span className="text-white/60">Quilometragem</span><span className="text-right tabular-nums text-white/80">{v.mileage_km != null ? `${v.mileage_km.toLocaleString("pt-PT")} km` : "—"}</span>{v.condition === "new" && <><span className="text-white/60">Venda</span><span className="text-right text-white/80">{v.sale_type === "on_order" ? "Por encomenda" : "Em stock"}</span></>}<span className="text-white/60">Potência</span><span className="text-right tabular-nums text-white/80">{v.power_hp != null ? `${v.power_hp} cv` : "—"}</span><span className="text-white/60">Combustível</span><span className="text-right text-white/80">{v.fuel_type || "—"}</span></div><div className="mt-4 flex items-end justify-between"><span className="font-display text-xl font-semibold tabular-nums text-white">{v.price != null ? `${v.price.toLocaleString("pt-PT")} €` : "Sob consulta"}</span><span className="font-display text-[10px] uppercase tracking-[0.13em] text-copper transition-colors group-hover:text-white">Ver viatura ↗</span></div></Link></article></Reveal>; })}</div>}
      </section>
    </div>
  </>;
}
