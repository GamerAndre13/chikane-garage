import { redirect } from "next/navigation";

// O catálogo passou a chamar-se "Usados" e vive em /usados.
// Este redirect mantém os links antigos e os favoritos dos clientes a funcionar.
export default function CatalogoRedirect() {
  redirect("/usados");
}
