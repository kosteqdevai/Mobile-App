import { appEnvironment } from "./environment";

export const appConfig = {
  name: "Comero",
  stage: "Foundation",
  environment: appEnvironment,
} as const;
