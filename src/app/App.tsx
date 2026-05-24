import { AppProviders } from "./providers/AppProviders";
import type { AppDependencies } from "./providers/appDependencies";
import { AppRoutes } from "./routes/AppRoutes";

type AppProps = {
  dependencies?: AppDependencies;
};

export function App({ dependencies }: AppProps = {}) {
  return (
    <AppProviders dependencies={dependencies}>
      <AppRoutes />
    </AppProviders>
  );
}
