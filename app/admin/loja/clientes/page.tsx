import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type CustomerOrder = { customer_name: string; customer_email: string; customer_phone: string; nif: string; total: number; created_at: string };

export default async function ClientesLojaPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("customer_name,customer_email,customer_phone,nif,total,created_at").order("created_at", { ascending: false }).limit(1000);
  const customers = new Map<string, { name: string; email: string; phone: string; nif: string; orders: number; total: number; lastOrder: string }>();
  for (const order of (data ?? []) as CustomerOrder[]) {
    const email = order.customer_email.toLowerCase();
    const existing = customers.get(email);
    if (existing) { existing.orders++; existing.total += Number(order.total); }
    else customers.set(email, { name: order.customer_name, email, phone: order.customer_phone, nif: order.nif, orders: 1, total: Number(order.total), lastOrder: order.created_at });
  }
  const list = [...customers.values()];
  return <section><Link href="/admin/loja" className="font-display text-[10px] uppercase tracking-widest text-copper">← Loja</Link><header className="mt-3 flex flex-wrap items-end justify-between gap-5"><div><h1 className="font-display text-3xl font-bold uppercase">Clientes</h1><p className="mt-2 text-sm text-muted">Contactos únicos encontrados nas encomendas da loja.</p></div><Link href="/api/admin/shop/customers/export" className="border border-copper px-4 py-3 font-display text-xs uppercase tracking-widest text-copper hover:bg-copper hover:text-black">Exportar CSV</Link></header>
    {list.length ? <div className="mt-7 overflow-x-auto border-y border-border"><table className="w-full min-w-[780px] text-left text-sm"><thead className="font-display text-[10px] uppercase tracking-widest text-muted"><tr><th className="py-3 pr-4">Cliente</th><th className="py-3 pr-4">Contacto</th><th className="py-3 pr-4">NIF</th><th className="py-3 pr-4">Encomendas</th><th className="py-3 pr-4">Total</th><th className="py-3">Última compra</th></tr></thead><tbody className="divide-y divide-border">{list.map((customer) => <tr key={customer.email}><td className="py-4 pr-4 text-foreground">{customer.name}</td><td className="py-4 pr-4 text-muted">{customer.email}<span className="block text-xs">{customer.phone}</span></td><td className="py-4 pr-4 text-muted">{customer.nif || "—"}</td><td className="py-4 pr-4 text-muted">{customer.orders}</td><td className="py-4 pr-4 text-foreground">{customer.total.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</td><td className="py-4 text-muted">{new Date(customer.lastOrder).toLocaleDateString("pt-PT")}</td></tr>)}</tbody></table></div> : <p className="mt-7 border border-border bg-surface p-7 text-sm text-muted">Ainda não existem encomendas para apresentar.</p>}
  </section>;
}
