import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { euro } from "@/lib/shop";

export const metadata = { title: "As minhas encomendas" };

export default async function MinhasEncomendasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/conta?redirect=/conta/encomendas");
  const { data: orders } = await supabase.from("orders").select("id,order_number,access_token,status,payment_status,total,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  return <div className="mx-auto max-w-5xl px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
    <Link href="/conta/perfil" className="font-display text-[10px] uppercase tracking-[0.25em] text-copper">← A minha conta</Link>
    <h1 className="mt-5 font-display text-5xl font-bold uppercase text-foreground">As minhas encomendas</h1>
    {!orders?.length ? <div className="mt-8 border border-border bg-surface p-8"><p className="text-sm text-muted">Ainda não tens encomendas associadas a esta conta. Podes comprar sem registo e acompanhar a encomenda pelo link enviado por email.</p><Link href="/loja" className="mt-5 inline-block text-sm text-copper underline">Explorar a loja</Link></div> : <div className="mt-8 divide-y divide-border border-y border-border">{orders.map((order) => <Link key={order.id} href={`/encomenda/${order.access_token}`} className="flex flex-wrap items-center justify-between gap-4 py-5 hover:bg-surface"><div><p className="font-display text-lg uppercase text-foreground">{order.order_number}</p><p className="mt-1 text-xs text-muted">{new Date(order.created_at).toLocaleDateString("pt-PT")} · {order.status.replaceAll("_", " ")}</p></div><div className="text-right"><p className="font-display text-lg">{euro(Number(order.total))}</p><p className="mt-1 text-xs text-muted">{order.payment_status === "paid" ? "Pago" : "Pagamento pendente"}</p></div></Link>)}</div>}
  </div>;
}
