import { ExecutorError, ExecutorPlugin } from '../../../src/interface';
import { AsyncExecutor, SyncExecutor } from '../../../src/common';

describe('AsyncExecutor', () => {
  it('should successfully execute an asynchronous task', async () => {
    const executor = new AsyncExecutor();
    const result = await executor.exec(async () => 'success');
    expect(result).toBe('success');
  });

  it('should handle errors in asynchronous tasks', async () => {
    const executor = new AsyncExecutor();
    const error = new Error('test error');

    await expect(
      executor.exec(async () => {
        throw error;
      })
    ).rejects.toBeInstanceOf(ExecutorError);
  });

  it('should modify the execution result through plugins', async () => {
    const executor = new AsyncExecutor();
    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onSuccess: ({ returnValue }) => returnValue + ' modified'
    };

    executor.use(plugin);
    const result = await executor.exec(async () => 'test');
    expect(result).toBe('test modified');
  });

  it('should handle errors through plugins', async () => {
    const executor = new AsyncExecutor();
    const customError = new ExecutorError('CUSTOM_ERROR');

    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onError: () => customError
    };

    executor.use(plugin);

    await expect(
      executor.exec(async () => {
        throw new Error('original error');
      })
    ).rejects.toBe(customError);
  });

  it('execNoError should return ExecutorError instead of throwing an error', async () => {
    const executor = new AsyncExecutor();
    const result = await executor.execNoError(async () => {
      throw new Error('test error');
    });

    expect(result).toBeInstanceOf(ExecutorError);
  });
});

describe('SyncExecutor', () => {
  it('should successfully execute a synchronous task', () => {
    const executor = new SyncExecutor();
    const result = executor.exec(() => 'success');
    expect(result).toBe('success');
  });

  it('should handle errors in synchronous tasks', () => {
    const executor = new SyncExecutor();
    const error = new Error('test error');

    expect(() => {
      executor.exec(() => {
        throw error;
      });
    }).toThrow(ExecutorError);
  });

  it('should modify the execution result through plugins', () => {
    const executor = new SyncExecutor();
    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onSuccess: ({ returnValue }) => returnValue + ' modified'
    };

    executor.use(plugin);
    const result = executor.exec(() => 'test');
    expect(result).toBe('test modified');
  });

  it('should handle errors through plugins', () => {
    const executor = new SyncExecutor();
    const customError = new ExecutorError('CUSTOM_ERROR');

    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onError: () => customError
    };

    executor.use(plugin);

    expect(() => {
      executor.exec(() => {
        throw new Error('original error');
      });
    }).toThrow(customError);
  });

  it('execNoError should return ExecutorError instead of throwing an error', () => {
    const executor = new SyncExecutor();
    const result = executor.execNoError(() => {
      throw new Error('test error');
    });

    expect(result).toBeInstanceOf(ExecutorError);
  });
});

describe('ExecutorPlugin Chain', () => {
  it('should execute multiple plugins in order', async () => {
    const executor = new AsyncExecutor();
    const steps: number[] = [];

    const plugin1: ExecutorPlugin = {
      pluginName: 'test1',
      onSuccess: () => {
        steps.push(1);
      }
    };

    const plugin2: ExecutorPlugin = {
      pluginName: 'test2',
      onSuccess: () => {
        steps.push(2);
      }
    };

    executor.use(plugin1);
    executor.use(plugin2);

    await executor.exec(async () => 'test');
    expect(steps).toEqual([1, 2]);
  });

  it('if a plugin returns undefined, the chain should continue', async () => {
    const executor = new AsyncExecutor();
    let finalResult = '';

    const plugin1: ExecutorPlugin = {
      pluginName: 'test1',
      onSuccess: (): undefined => undefined
    };

    const plugin2: ExecutorPlugin = {
      pluginName: 'test2',
      onSuccess: ({ returnValue }) => {
        finalResult = returnValue + ' modified';
        return finalResult;
      }
    };

    executor.use(plugin1);
    executor.use(plugin2);

    const result = await executor.exec(async () => 'test');
    expect(result).toBe('test modified');
  });
});

describe('ExecutorPlugin Error', () => {
  it('should handle error in executor', async () => {
    const executor = new AsyncExecutor();

    await expect(
      executor.exec(async () => {
        throw new Error('Test ExecutorPlugin Error');
      })
    ).rejects.toBeInstanceOf(ExecutorError);
  });

  it('should handle plugin error', async () => {
    const executor = new AsyncExecutor();

    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onError: ({ error }) => new ExecutorError('PLUGIN_ERROR', error?.message)
    };

    executor.use(plugin);

    const promise = executor.exec(async () => {
      throw new Error('Test ExecutorPlugin Error');
    });

    await expect(promise).rejects.toBeInstanceOf(ExecutorError);
    await expect(promise).rejects.toHaveProperty('id', 'PLUGIN_ERROR');
    await expect(promise).rejects.toHaveProperty(
      'message',
      'Test ExecutorPlugin Error'
    );
  });

  it('should handle error break the chain, return the error', async () => {
    const executor = new SyncExecutor();

    const onError1 = jest.fn();
    const onError2 = jest.fn();
    const onError3 = jest.fn();
    const execTask = jest.fn();

    let count = 0;
    execTask.mockImplementationOnce(() => {
      throw new Error('Task Error');
    });

    onError1.mockImplementationOnce(({ error }) => {
      return error;
    });

    onError2.mockImplementationOnce(() => {
      count++;
    });

    onError3.mockImplementationOnce(() => {
      count++;
    });

    executor.use({ pluginName: 'test1', onError: onError1 });
    executor.use({ pluginName: 'test2', onError: onError2 });
    executor.use({ pluginName: 'test3', onError: onError3 });

    try {
      await executor.exec(execTask);
    } catch (error) {
      expect(error).toMatchObject({
        message: 'Task Error'
      });
    }

    expect(onError1).toHaveBeenCalledTimes(1);
    expect(onError2).toHaveBeenCalledTimes(0);
    expect(onError3).toHaveBeenCalledTimes(0);
    expect(count).toBe(0);
  });

  it('should handle error break the chain, throw  error', async () => {
    const executor = new SyncExecutor();

    const onError1 = jest.fn();
    const onError2 = jest.fn();
    const onError3 = jest.fn();
    const execTask = jest.fn();

    let count = 0;
    execTask.mockImplementationOnce(() => {
      throw new Error('Task Error');
    });

    onError1.mockImplementationOnce(({ error }) => {
      throw error;
    });

    onError2.mockImplementationOnce(() => {
      count++;
    });

    onError3.mockImplementationOnce(() => {
      count++;
    });

    executor.use({ pluginName: 'test1', onError: onError1 });
    executor.use({ pluginName: 'test2', onError: onError2 });
    executor.use({ pluginName: 'test3', onError: onError3 });

    try {
      executor.exec(execTask);
    } catch (error) {
      expect(error).toMatchObject({
        message: 'Task Error'
      });
    }

    expect(onError1).toHaveBeenCalledTimes(1);
    expect(onError2).toHaveBeenCalledTimes(0);
    expect(onError3).toHaveBeenCalledTimes(0);
    expect(count).toBe(0);
  });

  // if all plugins not return error, the error will be thrown
  it('should handle error all plugins not return error', async () => {
    const executor = new SyncExecutor();

    const onError1 = jest.fn();
    const onError2 = jest.fn();
    const onError3 = jest.fn();
    const execTask = jest.fn();

    execTask.mockImplementationOnce(() => {
      throw new Error('Task Error');
    });

    onError1.mockImplementationOnce(({ error }) => {
      if (error instanceof Error) {
        error.message = error.message + ' Task Error1';
      }
    });

    onError2.mockImplementationOnce(({ error }) => {
      if (error instanceof Error) {
        error.message = error.message + ' Task Error2';
      }
    });

    onError3.mockImplementationOnce(({ error }) => {
      if (error instanceof Error) {
        error.message = error.message + ' Task Error3';
      }
    });

    executor.use({ pluginName: 'test1', onError: onError1 });
    executor.use({ pluginName: 'test2', onError: onError2 });
    executor.use({ pluginName: 'test3', onError: onError3 });

    try {
      executor.exec(execTask);
    } catch (error) {
      expect(error).toMatchObject({
        message: 'Task Error Task Error1 Task Error2 Task Error3'
      });
    }

    expect(onError1).toHaveBeenCalledTimes(1);
    expect(onError2).toHaveBeenCalledTimes(1);
    expect(onError3).toHaveBeenCalledTimes(1);
  });
});

describe('ExecutorPlugin no throw error', () => {
  it('should handle no error in executor', async () => {
    const executor = new AsyncExecutor();
    const promise = executor.execNoError(async () => {
      throw new Error('Test ExecutorPlugin No Error');
    });
    await expect(promise).resolves.toBeInstanceOf(ExecutorError);
  });
});
