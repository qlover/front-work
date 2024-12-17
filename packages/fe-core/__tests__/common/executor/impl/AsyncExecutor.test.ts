import { ExecutorError, ExecutorPlugin } from '../../../../src/interface';
import { AsyncExecutor } from '../../../../src/common';

describe('AsyncExecutor onBefore Lifecycle', () => {
  it('should modify input data through onBefore hooks', async () => {
    const executor = new AsyncExecutor();
    const plugin1: ExecutorPlugin<Record<string, unknown>> = {
      pluginName: 'plugin1',
      onBefore: async (context) => {
        context.parameters.modifiedBy = 'plugin1';
      }
    };
    const plugin2: ExecutorPlugin<Record<string, unknown>> = {
      pluginName: 'plugin2',
      onBefore: async (context) => {
        context.parameters.modifiedBy = 'plugin2';
      }
    };

    executor.use(plugin1);
    executor.use(plugin2);

    const result = await executor.exec<string, Record<string, unknown>>(
      { value: 'test' },
      async (context) => context.parameters.modifiedBy as string
    );
    expect(result).toBe('plugin2');
  });

  it("should use the first plugin's onBefore return value if no subsequent plugin returns a value", async () => {
    const executor = new AsyncExecutor();
    const plugin1: ExecutorPlugin<Record<string, unknown>> = {
      pluginName: 'plugin1',
      onBefore: async (context) => {
        context.parameters.modifiedBy = 'plugin1';
      }
    };
    const plugin2: ExecutorPlugin = {
      pluginName: 'plugin2',
      onBefore: jest.fn()
    };

    executor.use(plugin1);
    executor.use(plugin2);

    const result = await executor.exec<string, Record<string, unknown>>(
      { value: 'test' },
      async (context) => context.parameters.modifiedBy as string
    );
    expect(result).toBe('plugin1');
  });

  it('should stop onBefore chain and enter onError if an error is thrown', async () => {
    const executor = new AsyncExecutor();
    const plugin1: ExecutorPlugin = {
      pluginName: 'plugin1',
      onBefore: async () => {
        throw new Error('Error in onBefore');
      }
    };
    const plugin2: ExecutorPlugin = {
      pluginName: 'plugin2',
      onBefore: jest.fn()
    };
    const onError = jest.fn();

    executor.use(plugin1);
    executor.use(plugin2);
    executor.use({ pluginName: 'plugin3', onError });

    await expect(
      executor.exec({ value: 'test' }, async (data) => data)
    ).rejects.toBeInstanceOf(ExecutorError);

    expect(plugin2.onBefore).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });
});

describe('AsyncExecutor onExec Lifecycle', () => {
  it('should modify the task through onExec hook', async () => {
    const executor = new AsyncExecutor();
    const plugin: ExecutorPlugin = {
      pluginName: 'plugin1',
      onExec: async <T>(): Promise<T> => 'modified task' as T
    };

    executor.use(plugin);

    const result = await executor.exec(async () => 'original task');
    expect(result).toBe('modified task');
  });

  it("should only use the first plugin's onExec hook", async () => {
    const executor = new AsyncExecutor();
    const plugin1: ExecutorPlugin = {
      pluginName: 'plugin1',
      onExec: async <T>() => 'modified by plugin1' as T
    };
    const plugin2: ExecutorPlugin = {
      pluginName: 'plugin2',
      onExec: async <T>() => 'modified by plugin2' as T
    };

    executor.use(plugin1);
    executor.use(plugin2);

    const result = await executor.exec(async () => 'original task');
    expect(result).toBe('modified by plugin1');
  });

  it('should execute the original task if no onExec hooks are present', async () => {
    const executor = new AsyncExecutor();
    const result = await executor.exec(async () => 'original task');
    expect(result).toBe('original task');
  });

  it('should stop execution and enter onError if onExec throws an error', async () => {
    const executor = new AsyncExecutor();
    const plugin: ExecutorPlugin = {
      pluginName: 'plugin1',
      onExec: async () => {
        throw new Error('Error in onExec');
      }
    };
    const onError = jest.fn();

    executor.use(plugin);
    executor.use({ pluginName: 'plugin3', onError });

    await expect(
      executor.exec(async () => 'original task')
    ).rejects.toBeInstanceOf(Error);

    expect(onError).toHaveBeenCalledTimes(0);
  });
});

describe('AsyncExecutor onError Lifecycle', () => {
  it('should handle errors through onError hooks', async () => {
    const executor = new AsyncExecutor();
    const plugin1: ExecutorPlugin = {
      pluginName: 'plugin1',
      onError: async ({ error }) =>
        new ExecutorError('Handled by plugin1', error)
    };
    const plugin2: ExecutorPlugin = {
      pluginName: 'plugin2',
      onError: async ({ error }) =>
        new ExecutorError('Handled by plugin2', error)
    };

    executor.use(plugin1);
    executor.use(plugin2);

    await expect(
      executor.exec(async () => {
        throw new Error('original error');
      })
    ).rejects.toBeInstanceOf(ExecutorError);
  });

  it('should stop onError chain if an error is thrown', async () => {
    const executor = new AsyncExecutor();
    const plugin1: ExecutorPlugin = {
      pluginName: 'plugin1',
      onError: async () => {
        throw new Error('Error in onError');
      }
    };
    const plugin2: ExecutorPlugin = {
      pluginName: 'plugin2',
      onError: jest.fn()
    };

    executor.use(plugin1);
    executor.use(plugin2);

    await expect(
      executor.exec(async () => {
        throw new Error('original error');
      })
    ).rejects.toBeInstanceOf(Error);

    expect(plugin2.onError).not.toHaveBeenCalled();
  });

  it('should wrap raw errors with ExecutorError if no onError returns or throws', async () => {
    const executor = new AsyncExecutor();
    const plugin1: ExecutorPlugin = {
      pluginName: 'plugin1',
      onError: jest.fn()
    };
    const plugin2: ExecutorPlugin = {
      pluginName: 'plugin2',
      onError: jest.fn()
    };

    executor.use(plugin1);
    executor.use(plugin2);

    await expect(
      executor.exec(async () => {
        throw new Error('original error');
      })
    ).rejects.toBeInstanceOf(ExecutorError);
  });
});

describe('AsyncExecutor onSuccess Lifecycle', () => {
  it('should execute onSuccess hook', async () => {
    const executor = new AsyncExecutor();
    const plugin: ExecutorPlugin = {
      pluginName: 'plugin1',
      onSuccess: async ({ returnValue }) => returnValue + ' success'
    };

    executor.use(plugin);
    const result = await executor.exec(async () => 'test');
    expect(result).toBe('test success');
  });

  it('should modify the result through onSuccess hooks', async () => {
    const executor = new AsyncExecutor();
    const plugin1: ExecutorPlugin = {
      pluginName: 'plugin1',
      onSuccess: async ({ returnValue }) => returnValue + ' modified by plugin1'
    };
    const plugin2: ExecutorPlugin = {
      pluginName: 'plugin2',
      onSuccess: async ({ returnValue }) => returnValue + ' modified by plugin2'
    };

    executor.use(plugin1);
    executor.use(plugin2);

    const result = await executor.exec(async () => 'test');
    expect(result).toBe('test modified by plugin1 modified by plugin2');
  });

  it('should stop onSuccess chain and enter onError if an error is thrown', async () => {
    const executor = new AsyncExecutor();
    const plugin1: ExecutorPlugin = {
      pluginName: 'plugin1',
      onSuccess: async () => {
        throw new Error('Error in onSuccess');
      }
    };
    const plugin2: ExecutorPlugin = {
      pluginName: 'plugin2',
      onSuccess: jest.fn()
    };
    const onError = jest.fn();

    executor.use(plugin1);
    executor.use(plugin2);
    executor.use({ pluginName: 'plugin3', onError });

    try {
      await executor.exec(async () => 'test');
    } catch (error) {
      expect(error).toBeInstanceOf(ExecutorError);
      expect((error as ExecutorError).id).toBe('UNKNOWN_ASYNC_ERROR');
      expect((error as ExecutorError).message).toBe('Error in onSuccess');
    }

    expect(plugin2.onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('should not execute onSuccess hook if task throws an error', async () => {
    const executor = new AsyncExecutor();
    const onSuccess = jest.fn();

    const plugin: ExecutorPlugin = {
      pluginName: 'plugin1',
      onSuccess
    };

    executor.use(plugin);

    await expect(
      executor.exec(async () => {
        throw new Error('test error');
      })
    ).rejects.toBeInstanceOf(ExecutorError);

    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe('AsyncExecutor execNoError Method', () => {
  it('should return ExecutorError instead of throwing an error', async () => {
    const executor = new AsyncExecutor();
    const result = await executor.execNoError(async () => {
      throw new Error('test error');
    });

    expect(result).toBeInstanceOf(ExecutorError);
  });

  it('should execute task and return result if no error occurs', async () => {
    const executor = new AsyncExecutor();
    const result = await executor.execNoError(async () => 'success');

    expect(result).toBe('success');
  });

  it('should handle errors through onError hooks and return the first error', async () => {
    const executor = new AsyncExecutor();
    const plugin1: ExecutorPlugin = {
      pluginName: 'plugin1',
      onError: async ({ error }) =>
        new ExecutorError('Handled by plugin1', error)
    };
    const plugin2: ExecutorPlugin = {
      pluginName: 'plugin2',
      onError: jest.fn()
    };

    executor.use(plugin1);
    executor.use(plugin2);

    const result = await executor.execNoError(async () => {
      throw new Error('original error');
    });

    expect(result).toBeInstanceOf(ExecutorError);
    expect((result as ExecutorError).message).toBe('original error');
  });

  it('should return the original error wrapped in ExecutorError if no onError hooks are present', async () => {
    const executor = new AsyncExecutor();
    const result = await executor.execNoError(async () => {
      throw new Error('original error');
    });

    expect(result).toBeInstanceOf(ExecutorError);
    expect((result as ExecutorError).message).toBe('original error');
  });

  it('should not execute onSuccess hooks if an error occurs', async () => {
    const executor = new AsyncExecutor();
    const onSuccess = jest.fn();

    const plugin: ExecutorPlugin = {
      pluginName: 'plugin1',
      onSuccess
    };

    executor.use(plugin);

    const result = await executor.execNoError(async () => {
      throw new Error('test error');
    });

    expect(result).toBeInstanceOf(ExecutorError);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe('AsyncExecutor Additional Tests', () => {
  it('should execute multiple plugins in sequence', async () => {
    const executor = new AsyncExecutor();
    const results: string[] = [];

    const plugin1: ExecutorPlugin = {
      pluginName: 'plugin1',
      onBefore: async () => {
        results.push('before1');
      },
      onSuccess: async () => {
        results.push('success1');
      },
      onError: async () => {
        results.push('error1');
      }
    };

    const plugin2: ExecutorPlugin = {
      pluginName: 'plugin2',
      onBefore: async () => {
        results.push('before2');
      },
      onSuccess: async () => {
        results.push('success2');
      },
      onError: async () => {
        results.push('error2');
      }
    };

    executor.use(plugin1);
    executor.use(plugin2);

    await executor.exec(async () => 'test');

    expect(results).toEqual(['before1', 'before2', 'success1', 'success2']);
  });

  it('should handle plugin that modifies data in onBefore hook', async () => {
    const executor = new AsyncExecutor();
    const plugin: ExecutorPlugin<Record<string, unknown>> = {
      pluginName: 'plugin1',
      onBefore: async (context) => {
        context.parameters.added = true;
      }
    };

    executor.use(plugin);

    const result = await executor.exec<boolean, Record<string, unknown>>(
      { value: 'test' },
      async (context) => context.parameters.added as boolean
    );
    expect(result).toBe(true);
  });

  it('should handle plugin that modifies result in onSuccess hook', async () => {
    const executor = new AsyncExecutor();
    const plugin: ExecutorPlugin<string> = {
      pluginName: 'plugin1',
      onSuccess: async ({ returnValue }) => returnValue + ' modified'
    };

    executor.use(plugin);

    const result = await executor.exec(async () => 'test');
    expect(result).toBe('test modified');
  });

  it('should handle plugin that suppresses error in onError hook', async () => {
    const executor = new AsyncExecutor();
    const plugin: ExecutorPlugin = {
      pluginName: 'plugin1',
      onError: async () => {
        return new ExecutorError('Handled Error');
      }
    };

    executor.use(plugin);

    const result = await executor.execNoError(async () => {
      throw new Error('test error');
    });

    expect(result).toBeInstanceOf(ExecutorError);
    expect((result as ExecutorError).message).toBe('Handled Error');
  });

  it('should execute task with no plugins', async () => {
    const executor = new AsyncExecutor();
    const result = await executor.exec(async () => 'no plugins');
    expect(result).toBe('no plugins');
  });

  it('should throw error if task is not a function', async () => {
    const executor = new AsyncExecutor();
    try {
      await executor.exec('not a function' as unknown as () => unknown);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Task must be a async function!');
    }
  });
});
