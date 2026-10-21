import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { saveCampaign, deleteCampaign } from "@/app/actions/campaigns-admin";

const input = "mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground";

// Campanhas promocionais: o que aparece na página pública /campanhas.
export default async function CampanhasLojaPage() {
  const supabase = await createClient();
  const { data: campaigns } = await supabase.from("campaigns").select("id,title,description,image_url,button_label,button_href,starts_at,ends_at,is_active,position").order("position").order("created_at", { ascending: false });
  const list = campaigns ?? [];
  const today = new Date().toISOString().slice(0, 10);
  return <section><Link href="/admin/loja" className="font-display text-[10px] uppercase tracking-widest text-copper">← Loja</Link><h1 className="mt-3 font-display text-3xl font-bold uppercase">Campanhas</h1>
    <p className="mt-2 max-w-2xl text-sm text-muted">Campanhas promocionais com foto, texto, datas e botão. Aparecem na página pública <Link href="/campanhas" className="text-copper underline underline-offset-4">/campanhas</Link> enquanto estiverem ativas e dentro do período indicado.</p>
    <form action={saveCampaign} className="mt-7 grid gap-4 border border-border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-7">
      <Field name="title" label="Título" required/>
      <Field name="button_label" label="Texto do botão" placeholder="Ex.: Ver stock"/>
      <Field name="button_href" label="Ligação do botão" placeholder="Ex.: /catalogo ou https://…"/>
      <Field name="starts_at" label="Início (vazio = sempre)" type="date"/>
      <Field name="ends_at" label="Fim (vazio = sem prazo)" type="date"/>
      <Field name="position" label="Ordem" type="number" defaultValue={list.length}/>
      <label className="block text-xs uppercase tracking-widest text-muted sm:col-span-2">Texto<textarea name="description" rows={3} className={input}/></label>
      <label className="block text-xs uppercase tracking-widest text-muted">Fotografia<input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-sm text-muted file:mr-3 file:border file:border-border file:bg-background file:px-4 file:py-2 file:font-display file:text-[10px] file:uppercase file:tracking-widest file:text-foreground"/></label>
      <div className="flex items-end gap-4 lg:col-span-3"><label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="is_active" defaultChecked className="accent-[var(--copper)]"/>Ativa</label><button className="bg-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-black">Criar campanha</button></div>
    </form>
    {!list.length ? <p className="mt-7 border border-border bg-surface p-6 text-sm text-muted">Ainda não há campanhas — cria a primeira acima.</p> :
      <ul className="mt-7 space-y-4">{list.map((campaign) => {
        const status = !campaign.is_active ? "Inativa" : campaign.starts_at && campaign.starts_at > today ? "Agendada" : campaign.ends_at && campaign.ends_at < today ? "Expirada" : "Ativa";
        return <li key={campaign.id} className="border border-border bg-surface p-4 sm:p-5">
          <form action={saveCampaign} className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <input type="hidden" name="id" value={campaign.id}/>
            <div>
              {campaign.image_url ? // eslint-disable-next-line @next/next/no-img-element
              <img src={campaign.image_url} alt={campaign.title} className="aspect-[4/3] w-full border border-border object-cover"/> : <div className="flex aspect-[4/3] w-full items-center justify-center border border-border bg-background text-[10px] uppercase tracking-widest text-muted">Sem foto</div>}
              <label className="mt-2 block text-xs uppercase tracking-widest text-muted">Trocar foto<input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-[11px] text-muted file:mr-2 file:border file:border-border file:bg-background file:px-2 file:py-1.5 file:font-display file:text-[9px] file:uppercase file:tracking-widest"/></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field name="title" label="Título" defaultValue={campaign.title} required/>
              <div className="grid grid-cols-2 gap-3">
                <Field name="starts_at" label="Início" type="date" defaultValue={campaign.starts_at ?? ""}/>
                <Field name="ends_at" label="Fim" type="date" defaultValue={campaign.ends_at ?? ""}/>
              </div>
              <Field name="button_label" label="Texto do botão" defaultValue={campaign.button_label}/>
              <Field name="button_href" label="Ligação do botão" defaultValue={campaign.button_href}/>
              <Field name="position" label="Ordem" type="number" defaultValue={campaign.position}/>
              <div className="flex items-end gap-2 sm:pb-1">
                <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="is_active" defaultChecked={campaign.is_active} className="accent-[var(--copper)]"/>Ativa</label>
                <span className={`border px-2 py-0.5 text-[10px] uppercase tracking-widest ${status === "Ativa" ? "border-copper text-copper" : "border-border text-muted"}`}>{status}</span>
              </div>
              <label className="block text-xs uppercase tracking-widest text-muted sm:col-span-2">Texto<textarea name="description" rows={3} defaultValue={campaign.description} className={input}/></label>
              <div className="flex items-center gap-3 sm:col-span-2"><button className="bg-copper px-4 py-2 font-display text-[10px] uppercase tracking-widest text-black">Guardar</button><span className="text-[11px] text-muted">{campaign.image_url ? "Com fotografia" : "Sem fotografia"}</span></div>
            </div>
          </form>
          <form action={deleteCampaign} className="mt-3 flex justify-end"><input type="hidden" name="id" value={campaign.id}/><button className="text-[11px] uppercase tracking-widest text-muted underline underline-offset-4 hover:text-red">Apagar campanha</button></form>
        </li>;
      })}</ul>}
  </section>;
}

function Field({ name, label, defaultValue, required, type = "text", placeholder }: { name: string; label: string; defaultValue?: string | number; required?: boolean; type?: string; placeholder?: string }) {
  return <label className="block text-xs uppercase tracking-widest text-muted">{label}<input name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue ?? ""} className={input}/></label>;
}
