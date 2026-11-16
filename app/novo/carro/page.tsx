import { redirect } from "next/navigation";

// /novo/carro só faz sentido com o slug de uma viatura nova.
// Quem chegar aqui sem slug segue para a listagem de novos.
export default function NovoCarroIndex() {
  redirect("/novos");
}
