import logo from "@/assets/ene-logo.webp.asset.json";
import { navItems, type ScreenId } from "@/lib/backoffice-data";
import { cn } from "@/lib/utils";

export function Sidebar({
  active,
  onSelect,
}: {
  active: ScreenId;
  onSelect: (id: ScreenId) => void;
}) {
  return (
    <aside className="sticky top-0 flex h-screen w-[252px] flex-none flex-col bg-sidebar px-4 pt-6 pb-5 text-sidebar-foreground">
      <div className="flex items-center gap-3 px-2 pb-7 border-b border-sidebar-border">
        <img
          src={logo.url}
          alt="Ecuador Nature Expeditions"
          className="h-[36px] w-[36px] flex-none object-contain"
        />
        <div className="leading-tight pb-2">
          <div className="font-display text-[13px] font-semibold tracking-tight">Ecuador Nature</div>
          <div className="text-[10px] text-sidebar-foreground/70">Expeditions</div>
        </div>
      </div>

      <div className="px-2 pt-5 pb-3 text-[10.5px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">Operación</div>

      <nav className="flex flex-col gap-1 overflow-y-auto py-2">
        {navItems.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-all",
                isActive
                  ? "bg-sidebar-primary/20 text-sidebar-primary font-semibold"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-foreground/8",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 flex-none rounded-full transition-colors",
                  isActive ? "bg-sidebar-primary" : "bg-sidebar-foreground/30",
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-sidebar-primary/30 px-2 py-1 text-[10px] font-semibold text-sidebar-primary">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-foreground/5 px-3 py-3">
        <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-sidebar-primary font-display text-[11px] font-semibold text-sidebar-primary-foreground">
          MC
        </div>
        <div className="min-w-0 flex-1 text-[12px] leading-tight">
          <div className="font-semibold truncate">María Cevallos</div>
          <div className="text-[11px] text-sidebar-foreground/60">Jefa de operaciones</div>
        </div>
      </div>
    </aside>
  );
}
