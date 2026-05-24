import { useContext } from "react";

import { AppDependenciesContext } from "./AppDependenciesContext";

export function useAppDependencies() {
  const dependencies = useContext(AppDependenciesContext);

  if (!dependencies) {
    throw new Error("App dependencies are not available.");
  }

  return dependencies;
}
