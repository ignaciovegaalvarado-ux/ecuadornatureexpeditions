import { Menu, Plus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Reports whether the page has been scrolled at all, without touching the scroll event. */
function useScrolled() {
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setScrolled(!entry?.isIntersecting), {
      threshold: 1,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { sentinel, scrolled };
}

export function Topbar({
  title,
  subtitle,
  onMenu,
}: {
  title: string;
  subtitle: string;
  onMenu: () => void;
}) {
  const { sentinel, scrolled } = useScrolled();
  const search = useRef<HTMLInputElement>(null);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  // The shortcut hint on the search field is only shown because it works.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        search.current?.focus();
        search.current?.select();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px" />
      <header
        className={cn(
          "sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-3 border-b bg-background/85 px-6 py-4 backdrop-blur-xl transition-[border-color,box-shadow] duration-200 lg:px-8",
          scrolled ? "border-border shadow-[var(--shadow-flat)]" : "border-transparent",
        )}
      >
        <button
          type="button"
          onClick={onMenu}
          aria-label="Abrir navegación"
          className="press -ml-1 flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-secondary hover:text-foreground active:scale-[0.94] lg:hidden"
        >
          <Menu aria-hidden strokeWidth={1.75} className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="text-[21px] leading-tight font-semibold tracking-[-0.022em] text-foreground">
            {title}
          </h1>
          <p className="mt-0.5 text-[12.5px] text-pretty text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="relative hidden md:block">
            <span className="sr-only">Buscar</span>
            <Search
              aria-hidden
              strokeWidth={1.75}
              className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-subtle"
            />
            <input
              ref={search}
              type="search"
              placeholder="Buscar expediente…"
              className="h-9 w-[236px] rounded-md border border-border bg-card pr-[68px] pl-8 text-[13px] outline-none transition-[border-color,box-shadow,width] duration-200 placeholder:text-subtle hover:border-border-strong focus:w-[300px] focus:border-primary focus:ring-[3px] focus:ring-primary/12"
            />
            <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-subtle">
              {isMac ? "⌘K" : "Ctrl K"}
            </kbd>
          </label>

          <button
            type="button"
            className="press inline-flex h-11 cursor-pointer items-center gap-1.5 sm:h-9 rounded-md bg-primary px-2.5 text-[13px] sm:pr-3.5 sm:pl-2.5 font-semibold text-primary-foreground transition-[background-color,transform] duration-150 hover:bg-primary/90 active:scale-[0.97]"
          >
            <Plus aria-hidden strokeWidth={2.25} className="h-4 w-4" />
            <span className="hidden whitespace-nowrap sm:inline">Nueva reserva</span>
            <span className="sr-only sm:hidden">Nueva reserva</span>
          </button>
        </div>
      </header>
    </>
  );
}
