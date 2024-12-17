import { Logger } from '@qlover/fe-core';
import chalk from 'chalk';

export class ScriptsLogger extends Logger {
  /**
   * @override
   * @param {string} value
   * @returns {string}
   */
  prefix(value: string): string {
    switch (value) {
      case 'INFO':
        return chalk.blue(value);
      case 'WARN':
        return chalk.yellow(value);
      case 'ERROR':
        return chalk.red(value);
      case 'DEBUG':
        return chalk.gray(value);
      default:
        return value;
    }
  }

  obtrusive(title: string): void {
    const header = chalk.bold(title);
    super.obtrusive(header);
  }
}
