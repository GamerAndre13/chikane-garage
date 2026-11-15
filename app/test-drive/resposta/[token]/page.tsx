import { redirect } from "next/navigation";

// Endereço antigo do email de remarcação (/test-drive/resposta/<token>).
// Os emails enviados antes desta alteração continuam a funcionar: em vez de
// uma página só para aceitar/alterar, levam o cliente à home, onde o popup
// de resposta abre com o token (?testdrive=<token>).
export const dynamic = "force-dynamic";

export default async function TestDriveResponsePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`/?testdrive=${encodeURIComponent(token)}`);
}
