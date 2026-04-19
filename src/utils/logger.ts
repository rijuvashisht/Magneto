import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

let currentLevel: LogLevel = LogLevel.INFO;

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (currentLevel <= LogLevel.DEBUG) {
      console.log(chalk.gray(`[magneto:debug] ${message}`), ...args);
    }
  },

  info(message: string, ...args: unknown[]): void {
    if (currentLevel <= LogLevel.INFO) {
      console.log(chalk.blue(`[magneto] ${message}`), ...args);
    }
  },

  success(message: string, ...args: unknown[]): void {
    if (currentLevel <= LogLevel.INFO) {
      console.log(chalk.green(`[magneto] ✓ ${message}`), ...args);
    }
  },

  warn(message: string, ...args: unknown[]): void {
    if (currentLevel <= LogLevel.WARN) {
      console.warn(chalk.yellow(`[magneto:warn] ${message}`), ...args);
    }
  },

  error(message: string, ...args: unknown[]): void {
    if (currentLevel <= LogLevel.ERROR) {
      console.error(chalk.red(`[magneto:error] ${message}`), ...args);
    }
  },

  banner(): void {
    if (currentLevel <= LogLevel.INFO) {
      console.log(
        chalk.magenta(`
╔══════════════════════════════════════╗
║         ⚡ MAGNETO FRAMEWORK ⚡      ║
║   AI Reasoning & Agent Control Plane ║
╚══════════════════════════════════════╝
`)
      );
    }
  },
};
