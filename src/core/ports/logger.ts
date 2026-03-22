export interface ILogger {
  debug(tag: string, message: string, data?: unknown): void;
  info(tag: string, message: string, data?: unknown): void;
  warn(tag: string, message: string, data?: unknown): void;
  error(tag: string, message: string, data?: unknown): void;
}
