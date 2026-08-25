import { Plus, Search } from "lucide-react";

export function Topbar({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center gap-4 border-b border-border bg-background/80 px-8 py-5 backdrop-blur-md">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[26px] leading-tight font-semibold tracking-tight text-balance text-foreground">
          {title}
        </h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2.5">
        <label className="relative hidden md:block">
          <span className="sr-only">Buscar</span>
          <Search
            aria-hidden
            strokeWidth={1.75}
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            placeholder="Buscar expediente, pasajero…"
            className="h-10 w-[280px] rounded-lg border border-border bg-card pr-3 pl-9 text-[13px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground hover:border-primary/30 focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </label>
        <button
          type="button"
          className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-primary pr-4 pl-3 text-[13px] font-semibold text-primary-foreground shadow-[var(--shadow-raise)] transition-[background-color,box-shadow,transform] duration-150 hover:bg-primary/90 active:translate-y-px active:shadow-none"
        >
          <Plus aria-hidden strokeWidth={2.25} className="h-4 w-4" />
          Nueva reserva
        </button>
      </div>
    </header>
  );
}
