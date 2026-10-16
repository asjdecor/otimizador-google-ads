import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, decidirAcesso, lerConfiguracaoDeLogin } from "@/api/seguranca/sessao";

/** Porteiro do app: sem sessão válida, nenhuma tela ou rota mostra dados. */
export async function middleware(requisicao: NextRequest) {
  const caminho = requisicao.nextUrl.pathname;
  const config = lerConfiguracaoDeLogin();
  const decisao = await decidirAcesso(caminho, requisicao.cookies.get(COOKIE_SESSAO)?.value, config);

  if (decisao === "liberar") return NextResponse.next();
  if (decisao === "negar-api") return NextResponse.json({ erro: "Faça login para continuar." }, { status: 401 });
  if (decisao === "bloquear-configuracao") {
    const motivo = config.modo === "mal-configurado" ? config.motivo : "";
    return new NextResponse(`App bloqueado por segurança: ${motivo}. Configure as variáveis de ambiente e publique de novo.`, {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const destino = new URL("/login", requisicao.url);
  if (caminho !== "/") destino.searchParams.set("volta", caminho + requisicao.nextUrl.search);
  return NextResponse.redirect(destino);
}

export const config = {
  // Tudo, menos arquivos estáticos do Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
