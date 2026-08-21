import { createContext, useContext, useState, type ReactNode } from "react";
import type { ScreenId } from "./backoffice-data";

type NavigateFn = (screen: ScreenId, focusExp?: string) => void;

const NavigationContext = createContext<NavigateFn | null>(null);
const FocusContext = createContext<{ focusExp: string | null; clearFocus: () => void } | null>(
  null,
);

export function NavigationProvider({
  navigate,
  children,
}: {
  navigate: (screen: ScreenId) => void;
  children: ReactNode;
}) {
  const [focusExp, setFocusExp] = useState<string | null>(null);

  const navigateWithFocus: NavigateFn = (screen, focusExpArg) => {
    navigate(screen);
    setFocusExp(focusExpArg ?? null);
  };

  return (
    <NavigationContext.Provider value={navigateWithFocus}>
      <FocusContext.Provider value={{ focusExp, clearFocus: () => setFocusExp(null) }}>
        {children}
      </FocusContext.Provider>
    </NavigationContext.Provider>
  );
}

/** navigate(screen) switches screens; navigate(screen, exp) also flags `exp` for the target screen to focus/expand. */
export function useNavigate() {
  const navigate = useContext(NavigationContext);
  return navigate ?? (() => {});
}

/** Consumes the exp flagged by a navigate(screen, exp) call — read once, then call clearFocus(). */
export function useNavigationFocus() {
  const ctx = useContext(FocusContext);
  return ctx ?? { focusExp: null, clearFocus: () => {} };
}
