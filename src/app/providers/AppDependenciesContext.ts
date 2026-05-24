import { createContext } from "react";

import type { AppDependencies } from "./appDependencies";

export const AppDependenciesContext = createContext<AppDependencies | undefined>(undefined);
