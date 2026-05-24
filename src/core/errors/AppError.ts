export type AppErrorCode = "validation" | "not-found" | "storage-unavailable" | "unknown";

export type AppError = {
  code: AppErrorCode;
  message: string;
};
