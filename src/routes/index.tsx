import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactElement } from "react";
import { Sidebar } from "@/components/backoffice/Sidebar";
import { Topbar } from "@/components/backoffice/Topbar";
import { Panel } from "@/components/backoffice/screens/Panel";
import {
  Bloqueos,
  Calendario,
  Grupos,
  Itinerarios,
  Notas,
  Operaciones,
  Pasajeros,
  Proveedores,
  Reportes,
  Reservas,
} from "@/components/backoffice/screens/Screens";
import { navItems, type ScreenId } from "@/lib/backoffice-data";
import { NavigationProvider } from "@/lib/navigation";

const title = "Ecuador Nature Expeditions Back Office";
const description =
  "Back office de Ecuador Nature Expeditions: reservas, pasajeros, grupos, operaciones y reportes de expediciones en Galápagos, Amazonía, Andes y Costa.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const screens: Record<ScreenId, () => ReactElement> = {
  panel: Panel,
  reservas: Reservas,
  pasajeros: Pasajeros,
  grupos: Grupos,
  itinerarios: Itinerarios,
  operaciones: Operaciones,
  bloqueos: Bloqueos,
  calendario: Calendario,
  notas: Notas,
  proveedores: Proveedores,
  reportes: Reportes,
};

function Index() {
  const [active, setActive] = useState<ScreenId>("panel");
  const [navOpen, setNavOpen] = useState(false);
  const nav = navItems.find((n) => n.id === active)!;
  const Screen = screens[active];

  return (
    <NavigationProvider navigate={setActive}>
      <div className="flex min-h-screen bg-canvas text-foreground">
        <Sidebar
          active={active}
          onSelect={setActive}
          open={navOpen}
          onClose={() => setNavOpen(false)}
        />
        <main className="min-w-0 flex-1">
          <Topbar title={nav.title} subtitle={nav.subtitle} onMenu={() => setNavOpen(true)} />
          {/* Keyed on the screen so each switch replays the entrance rather than
              snapping. 240ms: short enough that nobody waits on it. */}
          <div key={active} className="screen-in mx-auto max-w-[1440px] px-6 py-6 lg:px-8">
            <Screen />
          </div>
        </main>
      </div>
    </NavigationProvider>
  );
}
