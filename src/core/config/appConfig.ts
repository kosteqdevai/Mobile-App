import { appEnvironment } from "./environment";

export const appConfig = {
  name: "LaCucina",
  stage: "Foundation",
  environment: appEnvironment,
} as const;
