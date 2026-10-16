/** Placeholder de tela ainda não implementada (sai quando a fase indicada for concluída). */
export function EmBreve({ titulo, fase }: { titulo: string; fase: string }) {
  return (
    <section className="flex flex-col gap-4">
      <h1>{titulo}</h1>
      <div className="rounded-card border border-borda bg-superficie p-6 text-texto-suave">
        Esta tela será construída na {fase}.
      </div>
    </section>
  );
}
