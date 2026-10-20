import { VehicleConditionCatalog } from "@/components/ui/vehicle-condition-catalog";

export const metadata = { title: "Viaturas usadas", description: "Descobre viaturas usadas selecionadas pela Chikane Garage." };

export default function UsadosPage() {
  return <VehicleConditionCatalog condition="used" title="Usados" intro="Viaturas usadas selecionadas e preparadas com atenção ao detalhe. Consulta o inventário e fala connosco para confirmar disponibilidade e condições."/>;
}
