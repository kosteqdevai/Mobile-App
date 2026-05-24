import type { ReactNode } from "react";

import { AppDependenciesContext } from "./AppDependenciesContext";
import { defaultAppDependencies, type AppDependencies } from "./appDependencies";

type AppDependenciesProviderProps = {
  children: ReactNode;
  dependencies?: AppDependencies;
};

export function AppDependenciesProvider({
  children,
  dependencies = defaultAppDependencies,
}: AppDependenciesProviderProps) {
  return (
    <AppDependenciesContext.Provider value={dependencies}>
      {children}
    </AppDependenciesContext.Provider>
  );
}
