import type { ReactNode } from "react";

import { AppDependenciesProvider } from "./AppDependenciesProvider";
import type { AppDependencies } from "./appDependencies";

type AppProvidersProps = {
  children: ReactNode;
  dependencies?: AppDependencies;
};

export function AppProviders({ children, dependencies }: AppProvidersProps) {
  return <AppDependenciesProvider dependencies={dependencies}>{children}</AppDependenciesProvider>;
}
