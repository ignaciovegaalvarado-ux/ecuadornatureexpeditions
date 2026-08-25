import {
  BedDouble,
  Building2,
  CalendarDays,
  ChartColumnBig,
  ClipboardCheck,
  LayoutDashboard,
  Map,
  Receipt,
  Ticket,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import logo from "@/assets/ene-logo.webp.asset.json";
import { navItems, type ScreenId } from "@/lib/backoffice-data";
import { cn } from "@/lib/utils";

const navIcons: Record<ScreenId, LucideIcon> = {
  panel: LayoutDashboard,
  reservas: Ticket,
  pasajeros: Users,
  grupos: UsersRound,
  itinerarios: Map,
  operaciones: ClipboardCheck,
  bloqueos: BedDouble,
  calendario: CalendarDays,
  notas: Receipt,
  proveedores: Building2,
  reportes: ChartColumnBig,
};

export function Sidebar({
  active,
  onSelect,
}: {
  active: ScreenId;
  onSelect: (id: ScreenId) => void;
}) {
  return (
    <aside className="sticky top-0 flex h-screen w-[252px] flex-none flex-col bg-sidebar px-3 pt-6 pb-4 text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-3 pb-5">
        <img
          src={logo.url}
          alt=""
          className="h-9 w-9 flex-none rounded-md object-contain"
        />
        <div className="min-w-0 leading-tight">
          <div className="font-display text-[15px] font-semibold tracking-tight">
            Ecuador Nature
          </div>
          <div className="text-[10.5px] tracking-[0.14em] text-sidebar-foreground/70 uppercase">
            Expeditions
          </div>
        </div>
      </div>

      <nav className="mt-4 flex flex-col gap-0.5 overflow-y-auto pb-2">
        {navItems.map((item) => {
          const isActive = item.id === active;
          const Icon = navIcons[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex cursor-pointer items-center gap-3 rounded-lg py-2.5 pr-3 pl-3.5 text-left text-[13px] transition-colors duration-150",
                isActive
                  ? "bg-sidebar-foreground/10 font-semibold text-sidebar-foreground"
                  : "font-medium text-sidebar-foreground/72 hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground",
              )}
            >
              {/* The active marker is a rail, not a dot: it points at the edge it belongs to. */}
              <span
                aria-hidden
                className={cn(
                  "absolute top-1/2 -left-3 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-ring transition-opacity duration-150",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
              <Icon
                strokeWidth={1.75}
                className={cn(
                  "h-[17px] w-[17px] flex-none transition-colors",
                  isActive ? "text-sidebar-ring" : "text-sidebar-foreground/60",
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="numeric rounded-full bg-sidebar-foreground/12 px-1.5 py-0.5 text-[10.5px] font-semibold text-sidebar-foreground/80">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-3 rounded-lg border border-sidebar-border px-3 py-2.5">
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-sidebar-ring/20 text-[11px] font-semibold text-sidebar-ring">
          MC
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[12.5px] font-semibold">María Cevallos</div>
          <div className="truncate text-[11px] text-sidebar-foreground/70">Jefa de operaciones</div>
        </div>
      </div>
    </aside>
  );
}
