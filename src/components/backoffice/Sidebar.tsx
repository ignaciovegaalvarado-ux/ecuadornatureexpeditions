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
      <div className="flex items-center gap-3 px-2 pb-6">
        <img
          src={logo.url}
          alt="Ecuador Nature Expeditions"
          className="h-[34px] w-[34px] flex-none object-contain"
        />
        <div className="leading-tight">
          <div className="font-display text-[14.5px] font-semibold">Ecuador Nature Expeditions</div>
        </div>
      </div>

      <div className="px-2 pb-2.5 text-[11px] font-semibold text-sidebar-foreground/70">Operación</div>

      <nav className="flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors",
                isActive
                  ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-accent",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 flex-none rounded-full",
                  isActive ? "bg-accent" : "bg-sidebar-foreground/35",
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-sidebar-accent px-2 py-0.5 text-[10.5px] font-semibold text-sidebar-accent-foreground">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 rounded-xl bg-sidebar-accent px-2.5 py-3">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-accent font-display text-[12px] font-semibold text-accent-foreground">
          MC
        </div>
        <div className="text-[12px] leading-tight">
          <div className="font-semibold">María Cevallos</div>
          <div className="text-[11px] opacity-60">Jefa de operaciones</div>
        </div>
      </div>
    </aside>
  );
}
