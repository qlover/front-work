import { Logger } from '../../../src/common';

function mockLogStdIo(log?: Logger): {
  log: Logger;
  spy: jest.SpyInstance;
  lastStdout: () => string;
  stdouts: () => string;
  end: () => void;
} {
  log = log ?? new Logger();
  // mock console.log to avoid printing to stdout
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

  const end = (): void => {
    spy.mockRestore();
  };

  const lastStdout = (): string => {
    if (spy.mock.calls.length === 0) {
      return '';
    }
    return spy.mock.calls[spy.mock.calls.length - 1].join('');
  };

  const allStdout = (): string => {
    return spy.mock.calls.map((call) => call.join('')).join('');
  };

  return { log, spy, end, lastStdout, stdouts: allStdout };
}

describe('Logger', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should write to stdout', () => {
    const { log, lastStdout, end } = mockLogStdIo();

    log.log('foo');

    expect(lastStdout()).toBe('foo');

    end();
  });

  it('should write to stderr', () => {
    const { log, lastStdout, end } = mockLogStdIo();

    log.error('foo');

    expect(lastStdout()).toBe('ERROR foo');

    end();
  });

  it('should print a warning', () => {
    const { log, lastStdout, end } = mockLogStdIo();

    log.warn('foo');

    expect(lastStdout()).toBe('WARN foo');

    end();
  });

  it('should print a debug', () => {
    const { log, lastStdout, end } = mockLogStdIo(new Logger({ debug: true }));

    log.debug('foo');
    expect(lastStdout()).toBe('DEBUG foo');

    end();
  });

  it('should print a debug, first argument is object', () => {
    const { log, lastStdout, end } = mockLogStdIo(new Logger({ debug: true }));

    log.debug({ foo: 'bar' });
    expect(lastStdout()).toBe('DEBUG {"foo":"bar"}');

    end();
  });

  it('should print a debug, first argument is array', () => {
    const { log, lastStdout, end } = mockLogStdIo(new Logger({ debug: true }));

    log.debug(['foo', 'bar']);
    expect(lastStdout()).toBe('DEBUG ["foo","bar"]');

    end();
  });

  it('should not print command execution by default', () => {
    const { log, lastStdout, end } = mockLogStdIo();

    log.exec('foo');

    expect(lastStdout()).toBe('');

    end();
  });

  it('should print command execution (dry run)', () => {
    const { log, lastStdout, end } = mockLogStdIo(new Logger({ dryRun: true }));

    log.exec('foo', 'bar');

    expect(lastStdout()).toBe('$ foo bar');

    end();
  });

  it('should print command execution (verbose/dry run)', () => {
    const { log, lastStdout, end } = mockLogStdIo(new Logger());

    log.exec('foo', { isDryRun: true, isExternal: false });

    expect(lastStdout()).toBe('! foo');

    end();
  });

  it('should print command execution (write)', () => {
    const { log, lastStdout, end } = mockLogStdIo(new Logger({ dryRun: true }));

    log.exec('foo', '--arg n', { isDryRun: true });

    expect(lastStdout()).toBe('$ foo --arg n');

    end();
  });

  it('should print obtrusive (only in node env)', () => {
    const { log, stdouts, end } = mockLogStdIo(new Logger({ isCI: false }));

    log.obtrusive('spacious');

    expect(stdouts()).toBe('spacious');

    end();
  });
});
