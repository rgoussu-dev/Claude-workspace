import chalk from 'chalk';

/**
 * Minimal leveled logger for CLI output. Writes to stderr so that stdout
 * stays clean for structured output.
 */
export interface Logger {
  info(msg: string): void;
  success(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  debug(msg: string): void;
}

const DEBUG = process.env['KEEL_DEBUG'] === '1';

export const logger: Logger = {
  info: (m) => console.error(chalk.cyan('info'), m),
  success: (m) => console.error(chalk.green('ok  '), m),
  warn: (m) => console.error(chalk.yellow('warn'), m),
  error: (m) => console.error(chalk.red('err '), m),
  debug: (m) => {
    if (DEBUG) console.error(chalk.gray('dbg '), m);
  },
};
