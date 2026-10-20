import { VehicleConditionCatalog } from "@/components/ui/vehicle-condition-catalog";

export const metadata = { title: "Viaturas novas", description: "Encontra viaturas novas disponíveis ou por encomenda na Chikane Garage." };

export default function NovosPage() {
  return <VehicleConditionCatalog condition="new" title="Novos" intro="Explora viaturas novas disponíveis ou por encomenda. Contacta-nos para confirmar configuração, prazo de entrega e condições de aquisição."/>;
}
