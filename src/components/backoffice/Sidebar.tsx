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

import { useEffect } from "react";

import logo from "@/assets/ene-logo.webp.asset.json";
import { navGroupLabels, navItems, type NavGroup, type ScreenId } from "@/lib/backoffice-data";
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

/* Badges on nav rows count work that is waiting. Where that work is overdue the
   count wears the attention colour; where it is merely open it stays neutral. */
const attentionScreens = new Set<ScreenId>(["notas"]);

const groupOrder: NavGroup[] = ["Comercial", "Operacion", "Administracion"];

function NavRow({
  id,
  label,
  badge,
  active,
  onSelect,
}: {
  id: ScreenId;
  label: string;
  badge?: string | undefined;
  active: boolean;
  onSelect: (id: ScreenId) => void;
}) {
  const Icon = navIcons[id];
  const attention = badge !== undefined && attentionScreens.has(id);

  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-md py-2 pr-2 pl-3 lg:min-h-0 text-left text-[13px] transition-colors duration-150",
        active
          ? "bg-sidebar-foreground/[0.09] font-semibold text-sidebar-foreground"
          : "font-medium text-sidebar-foreground/65 hover:bg-sidebar-foreground/[0.05] hover:text-sidebar-foreground",
      )}
    >
      {/* The active marker is a rail, not a dot: it points at the edge it belongs to. */}
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 -left-2 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-ring transition-[height,opacity] duration-200",
          active ? "h-4 opacity-100" : "h-0 opacity-0",
        )}
      />
      <Icon
        aria-hidden
        strokeWidth={1.75}
        className={cn(
          "h-4 w-4 flex-none transition-colors duration-150",
          active
            ? "text-sidebar-ring"
            : "text-sidebar-foreground/45 group-hover:text-sidebar-foreground/70",
        )}
      />
      <span className="flex-1 truncate">{label}</span>
      {badge ? (
        <span
          className={cn(
            "numeric rounded px-1.5 py-0.5 text-[10.5px] leading-none font-semibold",
            attention
              ? "bg-sidebar-ring/20 text-sidebar-ring"
              : "bg-sidebar-foreground/10 text-sidebar-foreground/70",
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export function Sidebar({
  active,
  onSelect,
  open,
  onClose,
}: {
  active: ScreenId;
  onSelect: (id: ScreenId) => void;
  open: boolean;
  onClose: () => void;
}) {
  const ungrouped = navItems.filter((i) => !i.group);

  // Below lg the nav is a drawer, so Escape has to dismiss it.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const select = (id: ScreenId) => {
    onSelect(id);
    onClose();
  };

  return (
    <>
      {/* The drawer scrim exists only where the drawer does. */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-[oklch(0.15_0.022_162/55%)] backdrop-blur-[2px] transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-[236px] flex-none flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-[var(--ease-drawer)]",
          "lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 lg:border-r lg:border-sidebar-border lg:transition-none",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
          <img src={logo.url} alt="" className="h-8 w-8 flex-none rounded object-contain" />
          <div className="min-w-0 leading-none">
            <div className="text-[13.5px] font-semibold tracking-[-0.01em]">Ecuador Nature</div>
            <div className="mt-1 text-[9.5px] font-medium tracking-[0.16em] text-sidebar-foreground/45 uppercase">
              Expeditions
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-3">
          <div className="flex flex-col gap-0.5">
            {ungrouped.map((item) => (
              <NavRow
                key={item.id}
                id={item.id}
                label={item.label}
                badge={item.badge}
                active={item.id === active}
                onSelect={select}
              />
            ))}
          </div>

          {groupOrder.map((group) => {
            const items = navItems.filter((i) => i.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="mt-5">
                <div className="mb-1.5 px-3 text-[9.5px] font-semibold tracking-[0.14em] text-sidebar-foreground/35 uppercase">
                  {navGroupLabels[group]}
                </div>
                <div className="flex flex-col gap-0.5">
                  {items.map((item) => (
                    <NavRow
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      badge={item.badge}
                      active={item.id === active}
                      onSelect={select}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="mx-3 mb-3 flex items-center gap-2.5 rounded-md border border-sidebar-border px-2.5 py-2">
          <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-sidebar-ring/18 text-[10.5px] font-semibold text-sidebar-ring">
            MC
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[12px] font-semibold">María Cevallos</div>
            <div className="truncate text-[10.5px] text-sidebar-foreground/50">
              Jefa de operaciones
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
