export function Topbar({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center gap-4 border-b border-border bg-background/85 px-8 py-6 backdrop-blur">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <label className="relative hidden md:block">
          <span className="sr-only">Buscar</span>
          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">⌕</span>
          <input
            type="search"
            placeholder="Buscar expediente, pasajero…"
            className="h-10 w-[280px] rounded-lg border border-border bg-card px-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
          />
        </label>
        <button
          type="button"
          className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 focus:ring-2 focus:ring-primary/50 active:scale-95"
        >
          + Nueva reserva
        </button>
      </div>
    </header>
  );
}
