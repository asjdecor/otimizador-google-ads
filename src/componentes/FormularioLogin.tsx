"use client";

import { useState, type FormEvent } from "react";
import { BotaoConfirmar } from "./BotaoConfirmar";
import { CampoTexto } from "./CampoTexto";
import { enviarAcao } from "./enviar-acao";

export function FormularioLogin({ volta }: { volta: string }) {
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEntrando(true);
    const resultado = await enviarAcao("/api/auth/entrar", { senha });
    setEntrando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    // Navegação completa: o layout precisa ser montado de novo já com a sessão.
    window.location.assign(volta);
  }

  return (
    <form onSubmit={(e) => void entrar(e)} className="flex flex-col gap-4">
      <CampoTexto
        id="senha"
        rotulo="Senha"
        type="password"
        autoComplete="current-password"
        autoFocus
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        erro={erro ?? undefined}
      />
      <BotaoConfirmar type="submit" carregando={entrando} textoCarregando="Entrando…" disabled={senha === ""}>
        Entrar
      </BotaoConfirmar>
    </form>
  );
}
