import { redirect } from "next/navigation";

// As fichas passaram de /catalogo/<slug> para /usados/<slug>.
// Mantém-se o redirect (301 pelos motores de busca assim que consolidarem)
// para não partir links antigos, emails e favoritos.
export default async function CatalogoVehicleRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/usados/${slug}`);
}
