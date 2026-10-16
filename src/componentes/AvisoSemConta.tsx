import Link from "next/link";
import { Aviso } from "./Aviso";

/** Tela vazia quando falta conectar ou escolher uma conta. */
export function AvisoSemConta({ titulo, motivo }: { titulo: string; motivo: "desconectado" | "sem-conta" }) {
  return (
    <section className="flex max-w-3xl flex-col gap-4">
      <h1>{titulo}</h1>
      <Aviso tipo="aviso">
        {motivo === "desconectado" ? (
          <>
            Conecte sua conta do Google Ads para continuar.{" "}
            <Link href="/conectar" className="font-bold text-primaria hover:underline">
              Conectar agora
            </Link>
          </>
        ) : (
          "Escolha uma conta de anúncios no topo da página."
        )}
      </Aviso>
    </section>
  );
}
