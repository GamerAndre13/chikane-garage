"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { VehicleCardGallery } from "@/components/ui/vehicle-card-gallery";
import { Reveal } from "@/components/ui/reveal";
import { primaryLeftBadge } from "@/lib/vehicle-badges";
import { vehicleHref } from "@/lib/vehicle-links";

type Vehicle = {
  id: string; slug: string; brand?: string | null; model?: string | null; trim?: string | null;
  registration_year?: number | null; mileage_km?: number | null; power_hp?: number | null;
  fuel_type?: string | null; transmission?: string | null; exterior_color?: string | null;
  body_style?: string | null; price?: number | null; status?: string | null; cover_image_url?: string | null;
  description?: string | null;
  sale_type?: string | null;
  vehicle_images?: { url?: string | null; position?: number | null; alt_text?: string | null }[] | null;
};

const control = "w-full appearance-none border border-white/10 bg-surface px-2.5 py-1.5 text-[13px] text-white outline-none transition-colors focus:border-copper focus-visible:ring-2 focus-visible:ring-copper/60 disabled:cursor-not-allowed disabled:opacity-40";
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
  const inputClass = `${control} min-w-0 px-2 placeholder:italic placeholder:text-white/50 ${unit ? "pr-8" : ""} ${year ? "tabular-nums" : ""}`;
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
  return <fieldset className="border-0 p-0"><legend className="mb-1.5 font-display text-[10px] uppercase tracking-[0.16em] text-white/65">{label}</legend><div className="grid grid-cols-2 gap-2"><label className="relative"><span className="sr-only">{label} desde</span><input {...common} type={year ? "text" : "number"} placeholder="de" aria-label={`${label} de`} value={min === all ? "" : min} onChange={(e) => handleChange("min", e.target.value)} />{unit && <span aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/60">{unit}</span>}</label><label className="relative"><span className="sr-only">{label} até</span><input {...common} type={year ? "text" : "number"} placeholder="até" aria-label={`${label} até`} value={max === all ? "" : max} onChange={(e) => handleChange("max", e.target.value)} />{unit && <span aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/60">{unit}</span>}</label></div></fieldset>;
}

// Filtro de seleção múltipla dentro de um dropdown: o painel fica fechado por
// omissão e abre ao clicar. As opções continuam a ser checkboxes — assim o
// user combina várias marcas/modelos sem depender de Ctrl+clique no telemóvel.
function MultiSelectField({ label, values, selected, onChange, disabled, placeholder, format }: { label: string; values: string[]; selected: string[]; onChange: (values: string[]) => void; disabled?: boolean; placeholder: string; format?: (value: string) => string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLFieldSetElement>(null);
  const listId = useId();

  // Fecha ao clicar fora ou com Escape, como um dropdown normal.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);

  const resumo = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? (format ? format(selected[0]) : selected[0])
      : `${selected.length} selecionadas`;

  return (
    <fieldset ref={containerRef} className="min-w-0">
      <legend className="mb-1.5 font-display text-[10px] uppercase tracking-[0.16em] text-white/65">
        {label}{selected.length > 0 ? ` (${selected.length})` : ""}
      </legend>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={listId}
          disabled={disabled}
          className={`${control} min-h-11 cursor-pointer pr-9 text-left hover:border-white/25`}
        >
          {resumo}
        </button>
        <svg
          aria-hidden="true"
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      <div id={listId} hidden={!open} className="mt-1.5 max-h-40 overflow-y-auto border border-white/10 bg-black p-1.5">
        {values.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-white/40">Sem opções disponíveis</p>
        ) : (
          values.map((value) => (
            <label key={value} className="flex min-h-9 cursor-pointer items-center gap-2.5 px-2 py-1.5 text-[13px] text-white transition-colors hover:bg-white/5">
              <input
                type="checkbox"
                checked={selected.includes(value)}
                disabled={disabled}
                onChange={() => toggle(value)}
                className="h-4 w-4 shrink-0 accent-copper"
              />
              <span className="min-w-0 truncate">{format ? format(value) : value}</span>
            </label>
          ))
        )}
      </div>
    </fieldset>
  );
}

export function CatalogBrowser({ vehicles }: { vehicles: Vehicle[] }) {
  const searchParams = useSearchParams();
  const param = (key: string): string => searchParams.get(key) ?? all;
  // Opções múltiplas vivem no URL como parâmetros repetidos (?marca=BMW&marca=Audi).
  // Aceita também valores antigos de um só filtro (?marca=BMW) e lista por vírgula.
  const paramValues = (key: string): string[] =>
    [...new Set(searchParams.getAll(key).flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean))];

  // Os filtros vivem no URL (?marca=…&preco_a=…): ao abrir por um link com
  // parâmetros o estado inicial vem daí (permite partilhar filtros).
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [brands, setBrands] = useState<string[]>(() => paramValues("marca"));
  const [models, setModels] = useState<string[]>(() => paramValues("modelo"));
  const [fuels, setFuels] = useState<string[]>(() => paramValues("combustivel"));
  const [colors, setColors] = useState<string[]>(() => paramValues("cor"));
  const [bodyStyles, setBodyStyles] = useState<string[]>(() => paramValues("estilo"));
  const [minPower, setMinPower] = useState(() => param("cv_a"));
  const [maxPower, setMaxPower] = useState(() => param("cv_b"));
  const [minYear, setMinYear] = useState(() => param("ano_a"));
  const [maxYear, setMaxYear] = useState(() => param("ano_b"));
  const [minPrice, setMinPrice] = useState(() => param("preco_a"));
  const [maxPrice, setMaxPrice] = useState(() => param("preco_b"));
  const [minMileage, setMinMileage] = useState(() => param("km_a"));
  const [maxMileage, setMaxMileage] = useState(() => param("km_b"));

  // Mantém o URL sincronizado com os filtros sem recarregar a página.
  // replaceState não cria entradas no histórico: "voltar atrás" volta à página
  // anterior e o filtro fica sempre preservado no URL atual.
  useEffect(() => {
    const params = new URLSearchParams();
    const setParam = (key: string, value: string) => {
      if (value !== all && value !== "") params.set(key, value);
    };
    const setParams = (key: string, values: string[]) => {
      params.delete(key);
      values.forEach((value) => params.append(key, value));
    };
    setParam("q", query);
    setParams("marca", brands);
    setParams("modelo", models);
    setParams("combustivel", fuels);
    setParams("cor", colors);
    setParams("estilo", bodyStyles);
    setParam("cv_a", minPower);
    setParam("cv_b", maxPower);
    setParam("ano_a", minYear);
    setParam("ano_b", maxYear);
    setParam("preco_a", minPrice);
    setParam("preco_b", maxPrice);
    setParam("km_a", minMileage);
    setParam("km_b", maxMileage);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, [query, brands, models, fuels, colors, bodyStyles, minPower, maxPower, minYear, maxYear, minPrice, maxPrice, minMileage, maxMileage]);

  const brandOptions = useMemo(() => unique(vehicles.map((v) => v.brand)) as string[], [vehicles]);
  const modelOptions = useMemo(() => unique(vehicles.filter((v) => brands.length === 0 || (v.brand && brands.includes(v.brand))).map((v) => v.model)) as string[], [vehicles, brands]);
  const fuelOptions = useMemo(() => unique(vehicles.map((v) => v.fuel_type)) as string[], [vehicles]);
  const colorOptions = useMemo(() => unique(vehicles.map((v) => v.exterior_color)) as string[], [vehicles]);
  const bodyStyleOptions = useMemo(() => unique(vehicles.map((v) => v.body_style)) as string[], [vehicles]);
  const years = useMemo(() => unique(vehicles.map((v) => v.registration_year)) as number[], [vehicles]);
  const prices = useMemo(() => unique(vehicles.map((v) => v.price)) as number[], [vehicles]);
  const mileages = useMemo(() => unique(vehicles.map((v) => v.mileage_km)) as number[], [vehicles]);
  const powers = useMemo(() => unique(vehicles.map((v) => v.power_hp)) as number[], [vehicles]);

  // Ao mudar as marcas, os modelos que já não pertencem a nenhuma das marcas
  // escolhidas saem da seleção — senão ficava um filtro impossível de satisfazer.
  const handleBrandsChange = (next: string[]) => {
    setBrands(next);
    if (next.length === 0) {
      setModels([]);
      return;
    }
    const validModels = unique(vehicles.filter((v) => v.brand && next.includes(v.brand)).map((v) => v.model)) as string[];
    setModels((current) => current.filter((model) => validModels.includes(model)));
  };

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
    // Sem opções escolhidas = "todas". Com opções, basta uma coincidência.
    const choiceMatch = (value: string | null | undefined, selected: string[]) =>
      selected.length === 0 || (value != null && selected.includes(value));
    return vehicles.filter((v) => {
      const partes = [
        v.brand, v.model, v.trim, v.registration_year, v.mileage_km, v.power_hp,
        v.fuel_type, ...fuelAliases(v), v.transmission, v.exterior_color, v.body_style,
        v.status, statusLabel(v.status)?.label, v.price, v.description,
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
      return matchesQuery && choiceMatch(v.brand, brands) && choiceMatch(v.model, models) && choiceMatch(v.fuel_type, fuels) && choiceMatch(v.exterior_color, colors) && choiceMatch(v.body_style, bodyStyles) && numericMatch(v.registration_year, minYear, maxYear) && numericMatch(v.price, minPrice, maxPrice) && numericMatch(v.mileage_km, minMileage, maxMileage) && numericMatch(v.power_hp, minPower, maxPower);
    });
  }, [vehicles, query, brands, models, fuels, colors, bodyStyles, minYear, maxYear, minPrice, maxPrice, minMileage, maxMileage, minPower, maxPower]);

  const clear = () => { setQuery(""); setBrands([]); setModels([]); setFuels([]); setColors([]); setBodyStyles([]); setMinPower(all); setMaxPower(all); setMinYear(all); setMaxYear(all); setMinPrice(all); setMaxPrice(all); setMinMileage(all); setMaxMileage(all); };
  const optionLabel = (value: string) => value.replaceAll("_", " ").replace(/^./, (first) => first.toLocaleUpperCase("pt-PT"));

  const activeFilterCount = useMemo(() =>
    [query, minPower, maxPower, minYear, maxYear, minPrice, maxPrice, minMileage, maxMileage].filter((value) => value !== all && value !== "").length +
    [brands, models, fuels, colors, bodyStyles].filter((values) => values.length > 0).length,
  [query, brands, models, fuels, colors, bodyStyles, minPower, maxPower, minYear, maxYear, minPrice, maxPrice, minMileage, maxMileage]);

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
      <aside id="catalogo-filtros" className={`z-20 h-fit border border-white/10 bg-surface-oxide p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:p-5 ${mobileFiltersOpen ? "block" : "hidden"} lg:sticky lg:top-[4.75rem] lg:block lg:max-h-[calc(100dvh-5.25rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain`}><div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-white">Filtros</h2><button type="button" onClick={clear} className="font-display text-[10px] uppercase tracking-[0.16em] text-copper transition-colors hover:text-white">Limpar</button></div>
        <div className="space-y-3">
          <MultiSelectField label="Marca" values={brandOptions} selected={brands} onChange={handleBrandsChange} placeholder="Todas as marcas" />
          <MultiSelectField label="Modelo" values={modelOptions} selected={models} onChange={setModels} disabled={modelOptions.length === 0} placeholder="Todos os modelos" />
          <MultiSelectField label="Combustível" values={fuelOptions} selected={fuels} onChange={setFuels} placeholder="Todos os combustíveis" format={optionLabel} />
          <MultiSelectField label="Cor exterior" values={colorOptions} selected={colors} onChange={setColors} placeholder="Todas as cores" format={optionLabel} />
          <MultiSelectField label="Estilo" values={bodyStyleOptions} selected={bodyStyles} onChange={setBodyStyles} placeholder="Todos os estilos" format={optionLabel} />
          <RangeFilter label="Desempenho · CV" values={powers} min={minPower} max={maxPower} onMin={setMinPower} onMax={setMaxPower} step={10} />
          <RangeFilter label="Preço" values={prices} min={minPrice} max={maxPrice} onMin={setMinPrice} onMax={setMaxPrice} step={500} unit="€" />
          <RangeFilter label="Primeiro registo" values={years} min={minYear} max={maxYear} onMin={setMinYear} onMax={setMaxYear} year />
          <RangeFilter label="Quilometragem" values={mileages} min={minMileage} max={maxMileage} onMin={setMinMileage} onMax={setMaxMileage} step={1000} unit="km" />
        </div>
      </aside>
      <section aria-live="polite">
        {filtered.length === 0 ? <div className="border border-white/10 bg-surface-oxide px-6 py-20 text-center"><p className="font-display text-xl uppercase tracking-wide text-white">Nenhuma viatura encontrada</p><p className="mt-2 text-sm text-white/60">Altera os filtros ou tenta outra pesquisa.</p><button type="button" onClick={clear} className="mt-6 border border-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-copper transition-colors hover:bg-copper hover:text-white">Limpar filtros</button></div> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((v, index) => { const status = statusLabel(v.status); const badge = primaryLeftBadge(v); return <Reveal key={v.id} className="h-full" delay={Math.min(index * 30, 240)}><article className="card-lift group h-full overflow-hidden border border-white/10 bg-surface hover:border-copper/70 hover:shadow-[0_0_24px_rgba(244,119,36,0.13)]"><VehicleCardGallery photos={photosFor(v)} href={vehicleHref(v)} title={`${v.brand ?? ""} ${v.model ?? ""}`}><div className="absolute right-3 top-3 z-20"><FavoriteButton vehicleId={v.id}/></div>{badge === "novidade" ? <span className="absolute left-3 top-3 z-20 border border-copper bg-black/80 px-3 py-1 font-display text-[10px] uppercase tracking-[0.15em] text-copper">Novidade</span> : badge === "reserved" ? <span className="absolute left-3 top-3 z-20 border border-amber-400/70 bg-black/80 px-3 py-1 font-display text-[10px] uppercase tracking-[0.15em] text-amber-300">Reservada</span> : status && <span className="absolute left-3 top-3 z-20 border border-current bg-black/80 px-3 py-1 font-display text-[10px] uppercase tracking-[0.15em]" style={{color:status.color}}>{status.label}</span>}</VehicleCardGallery><Link href={vehicleHref(v)} className="block p-4 sm:p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-copper"><p className="font-display text-[10px] uppercase tracking-[0.18em] text-white/60">{v.brand || ""} <span className="text-copper">·</span> {v.registration_year || ""}</p><h3 className="mt-2 font-display text-xl font-semibold uppercase tracking-wide text-white">{v.model}</h3>{v.trim && <p className="mt-1 font-display text-[10px] uppercase tracking-[0.15em] text-copper">{v.trim}</p>}<div className="mt-4 grid grid-cols-2 gap-y-2 border-y border-white/10 py-3 text-xs">{v.sale_type !== "new" && <><span className="text-white/60">Quilometragem</span><span className="text-right tabular-nums text-white/80">{v.mileage_km != null ? `${v.mileage_km.toLocaleString("pt-PT")} km` : "—"}</span></>}<span className="text-white/60">Potência</span><span className="text-right tabular-nums text-white/80">{v.power_hp != null ? `${v.power_hp} cv` : "—"}</span><span className="text-white/60">Combustível</span><span className="text-right text-white/80">{v.fuel_type || "—"}</span></div><div className="mt-4 flex items-end justify-between"><span className="font-display text-xl font-semibold tabular-nums text-white">{v.price != null ? `${v.price.toLocaleString("pt-PT")} €` : "Sob consulta"}</span><span className="font-display text-[10px] uppercase tracking-[0.13em] text-copper transition-colors group-hover:text-white">Ver viatura ↗</span></div></Link></article></Reveal>; })}</div>}
      </section>
    </div>
  </>;
}
