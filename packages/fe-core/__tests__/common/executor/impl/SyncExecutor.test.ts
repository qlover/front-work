import {
  ExecutorError,
  ExecutorPlugin,
  ExecutorContext
} from '../../../../src/interface';
import { SyncExecutor } from '../../../../src/common';

describe('SyncExecutor', () => {
  it('should execute a synchronous task successfully', () => {
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

  it('should execute onBefore hook', () => {
    const executor = new SyncExecutor();
    const plugin: ExecutorPlugin<Record<string, unknown>> = {
      pluginName: 'test',
      onBefore: ({ parameters }) => {
        parameters.modified = true;
      }
    };

    executor.use(plugin);
    const result = executor.exec(
      { value: 'test' },
      ({ parameters }: ExecutorContext<Record<string, unknown>>) =>
        parameters.modified as boolean
    );
    expect(result).toBe(true);
  });

  it('should execute onSuccess hook', () => {
    const executor = new SyncExecutor();
    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onSuccess: ({ returnValue }) => returnValue + ' success'
    };

    executor.use(plugin);
    const result = executor.exec(() => 'test');
    expect(result).toBe('test success');
  });

  it('should execute onError hook', () => {
    const executor = new SyncExecutor();
    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onError: ({ error }) => new ExecutorError('Handled Error', error)
    };

    executor.use(plugin);

    expect(() => {
      executor.exec(() => {
        throw new Error('original error');
      });
    }).toThrow(ExecutorError);
  });

  it('should not execute onSuccess hook if task throws an error', () => {
    const executor = new SyncExecutor();
    const onSuccess = jest.fn();

    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onSuccess
    };

    executor.use(plugin);

    expect(() => {
      executor.exec(() => {
        throw new Error('test error');
      });
    }).toThrow(ExecutorError);

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('should execute multiple plugins in sequence', () => {
    const executor = new SyncExecutor();
    const results: string[] = [];

    const plugin1: ExecutorPlugin = {
      pluginName: 'test',
      onBefore: () => {
        results.push('before1');
      },
      onSuccess: () => {
        results.push('success1');
      },
      onError: () => {
        results.push('error1');
      }
    };

    const plugin2: ExecutorPlugin = {
      pluginName: 'test2',
      onBefore: () => {
        results.push('before2');
      },
      onSuccess: () => {
        results.push('success2');
      },
      onError: () => {
        results.push('error2');
      }
    };

    executor.use(plugin1);
    executor.use(plugin2);

    executor.exec(() => 'test');

    expect(results).toEqual(['before1', 'before2', 'success1', 'success2']);
  });

  it('should handle plugin that modifies data in onBefore hook', () => {
    const executor = new SyncExecutor();
    const plugin: ExecutorPlugin<Record<string, unknown>> = {
      pluginName: 'test',
      onBefore: ({ parameters }) => {
        parameters.added = true;
      }
    };

    executor.use(plugin);

    const result = executor.exec(
      { value: 'test' },
      ({ parameters }: ExecutorContext<Record<string, unknown>>) =>
        parameters.added
    );
    expect(result).toBe(true);
  });

  it('should handle plugin that modifies result in onSuccess hook', () => {
    const executor = new SyncExecutor();
    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onSuccess: ({ returnValue }) => returnValue + ' modified'
    };

    executor.use(plugin);

    const result = executor.exec(() => 'test');
    expect(result).toBe('test modified');
  });

  it('should handle plugin that suppresses error in onError hook', () => {
    const executor = new SyncExecutor();
    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onError: () => {
        return new ExecutorError('Handled Error');
      }
    };

    executor.use(plugin);

    const result = executor.execNoError(() => {
      throw new Error('test error');
    });

    expect(result).toBeInstanceOf(ExecutorError);
    expect((result as ExecutorError).message).toBe('Handled Error');
  });

  it('should execute task with no plugins', () => {
    const executor = new SyncExecutor();
    const result = executor.exec(() => 'no plugins');
    expect(result).toBe('no plugins');
  });

  it('should throw error if task is not a function', () => {
    const executor = new SyncExecutor();
    expect(() => {
      executor.exec('not a function' as unknown as () => unknown);
    }).toThrow('Task must be a function!');
  });
});

describe('SyncExecutor has Error', () => {
  it('should handle error in onBefore hook', () => {
    const executor = new SyncExecutor();
    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onBefore: () => {
        throw new Error('Error in onBefore');
      }
    };

    executor.use(plugin);

    expect(() => {
      executor.exec(() => 'test');
    }).toThrow(ExecutorError);
  });

  it('should handle error in onSuccess hook', () => {
    const executor = new SyncExecutor();
    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onSuccess: () => {
        throw new Error('Error in onSuccess');
      }
    };

    executor.use(plugin);

    expect(() => {
      executor.exec(() => 'test');
    }).toThrow(ExecutorError);
  });

  it('should handle error in onError hook', () => {
    const executor = new SyncExecutor();
    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onError: (): ExecutorError => {
        return new ExecutorError('Error in onError');
      }
    };

    executor.use(plugin);

    expect(() => {
      executor.exec(() => {
        throw new Error('original error');
      });
    }).toThrow(ExecutorError);
  });

  it('should continue execution if onBefore hook does not throw', () => {
    const executor = new SyncExecutor();
    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onBefore: (context: ExecutorContext<Record<string, unknown>>) => {
        if (context.parameters.shouldThrow) {
          throw new Error('Error in onBefore');
        }
        return context.parameters;
      }
    };

    executor.use(plugin);

    const result = executor.exec({ shouldThrow: false }, (data) => 'success');
    expect(result).toBe('success');
  });

  it('should wrap error in ExecutorError if onError hook throws', () => {
    const executor = new SyncExecutor();
    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onError: (): Error => {
        return new Error('Error in onError');
      }
    };

    executor.use(plugin);

    expect(() => {
      executor.exec(() => {
        throw new Error('original error');
      });
    }).toThrow(ExecutorError);
  });

  it('should throw an error if an error occurred in onError', () => {
    const executor = new SyncExecutor();
    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onError: () => {
        throw new Error('Error in onError');
      }
    };

    executor.use(plugin);

    try {
      executor.exec(() => {
        throw new Error('original error');
      });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Error in onError');
    }
  });
});

describe('SyncExecutor onBefore Lifecycle', () => {
  it('should modify input data through onBefore hooks', () => {
    const executor = new SyncExecutor();
    const plugin1: ExecutorPlugin<Record<string, unknown>> = {
      pluginName: 'test',
      onBefore: ({ parameters }) => {
        parameters.modifiedBy = 'plugin1';
      }
    };
    const plugin2: ExecutorPlugin<Record<string, unknown>> = {
      pluginName: 'test2',
      onBefore: ({ parameters }) => {
        parameters.modifiedBy = 'plugin2';
      }
    };

    executor.use(plugin1);
    executor.use(plugin2);

    const result = executor.exec(
      { value: 'test' },
      ({ parameters }: ExecutorContext<Record<string, unknown>>) =>
        parameters.modifiedBy
    );
    expect(result).toBe('plugin2');
  });

  it("should use the first plugin's onBefore return value if no subsequent plugin returns a value", () => {
    const executor = new SyncExecutor();
    const plugin1: ExecutorPlugin<Record<string, unknown>> = {
      pluginName: 'test',
      onBefore: ({ parameters }) => {
        parameters.modifiedBy = 'plugin1';
      }
    };
    const plugin2: ExecutorPlugin<Record<string, unknown>> = {
      pluginName: 'test2',
      onBefore: jest.fn()
    };

    executor.use(plugin1);
    executor.use(plugin2);

    const result = executor.exec(
      { value: 'test' },
      ({ parameters }: ExecutorContext<Record<string, unknown>>) =>
        parameters.modifiedBy
    );
    expect(result).toBe('plugin1');
  });

  it('should stop onBefore chain and enter onError if an error is thrown', () => {
    const executor = new SyncExecutor();
    const plugin1: ExecutorPlugin = {
      pluginName: 'test',
      onBefore: () => {
        throw new Error('Error in onBefore');
      }
    };
    const plugin2: ExecutorPlugin = {
      pluginName: 'test2',
      onBefore: jest.fn()
    };
    const onError = jest.fn();

    executor.use(plugin1);
    executor.use(plugin2);
    executor.use({ pluginName: 'test3', onError });

    expect(() => {
      executor.exec({ value: 'test' }, (data) => data);
    }).toThrow(ExecutorError);

    expect(plugin2.onBefore).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it('should execute onError if onBefore throws an error', () => {
    const executor = new SyncExecutor();
    const plugin1: ExecutorPlugin = {
      pluginName: 'test',
      onBefore: () => {
        throw new Error('Error in onBefore');
      }
    };
    const onError = jest.fn();

    executor.use(plugin1);
    executor.use({ pluginName: 'test2', onError });

    expect(() => {
      executor.exec({ value: 'test' }, (data) => data);
    }).toThrow(ExecutorError);

    expect(onError).toHaveBeenCalled();
  });

  it('should not modify input data if no onBefore hooks are present', () => {
    const executor = new SyncExecutor();
    const result = executor.exec(
      { value: 'test' },
      ({ parameters }) => parameters.value
    );
    expect(result).toBe('test');
  });
});

describe('SyncExecutor onExec Lifecycle', () => {
  it('should modify the task through onExec hook', () => {
    const executor = new SyncExecutor();
    const plugin: ExecutorPlugin<Record<string, unknown>> = {
      pluginName: 'test',
      onExec<T>(): T {
        return 'modified task' as T;
      }
    };

    executor.use(plugin);

    const result = executor.exec(() => 'original task');
    expect(result).toBe('modified task');
  });

  it("should only use the first plugin's onExec hook", () => {
    const executor = new SyncExecutor();
    const plugin1: ExecutorPlugin = {
      pluginName: 'test',
      onExec<T>(): T {
        return 'modified by plugin1' as T;
      }
    };
    const plugin2: ExecutorPlugin = {
      pluginName: 'test2',
      onExec<T>(): T {
        return 'modified by plugin2' as T;
      }
    };

    executor.use(plugin1);
    executor.use(plugin2);

    const result = executor.exec(() => 'original task');
    expect(result).toBe('modified by plugin1');
  });

  it('should execute the original task if no onExec hooks are present', () => {
    const executor = new SyncExecutor();
    const result = executor.exec(() => 'original task');
    expect(result).toBe('original task');
  });

  it('should stop execution and enter onError if onExec throws an error', () => {
    const executor = new SyncExecutor();
    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onExec: () => {
        throw new Error('Error in onExec');
      }
    };
    const onError = jest.fn();

    executor.use(plugin);
    executor.use({ pluginName: 'test2', onError });

    try {
      executor.exec(() => 'original task');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Error in onExec');
      expect(onError).toHaveBeenCalledTimes(0);
    }
  });
});

describe('SyncExecutor onError Lifecycle', () => {
  it('should handle errors through onError hooks', () => {
    const executor = new SyncExecutor();
    const plugin1: ExecutorPlugin = {
      pluginName: 'test',
      onError: ({ error }) => new ExecutorError('Handled by plugin1', error)
    };
    const plugin2: ExecutorPlugin = {
      pluginName: 'test2',
      onError: ({ error }) => new ExecutorError('Handled by plugin2', error)
    };

    executor.use(plugin1);
    executor.use(plugin2);

    expect(() => {
      executor.exec(() => {
        throw new Error('original error');
      });
    }).toThrow(ExecutorError);
  });

  it('should stop onError chain if an error is thrown', () => {
    const executor = new SyncExecutor();
    const plugin1: ExecutorPlugin = {
      pluginName: 'test',
      onError: () => {
        throw new Error('Error in onError');
      }
    };
    const plugin2: ExecutorPlugin = {
      pluginName: 'test2',
      onError: jest.fn()
    };

    executor.use(plugin1);
    executor.use(plugin2);

    expect(() => {
      executor.exec(() => {
        throw new Error('original error');
      });
    }).toThrow(Error);

    expect(plugin2.onError).not.toHaveBeenCalled();
  });

  it('should wrap raw errors with ExecutorError if no onError returns or throws', () => {
    const executor = new SyncExecutor();
    const plugin1: ExecutorPlugin = {
      pluginName: 'test',
      onError: jest.fn()
    };
    const plugin2: ExecutorPlugin = {
      pluginName: 'test2',
      onError: jest.fn()
    };

    executor.use(plugin1);
    executor.use(plugin2);

    expect(() => {
      executor.exec(() => {
        throw new Error('original error');
      });
    }).toThrow(ExecutorError);
  });

  it('should return the first error encountered in execNoError', () => {
    const executor = new SyncExecutor();
    const plugin1: ExecutorPlugin = {
      pluginName: 'test',
      onError: ({ error }) => new ExecutorError('Handled by plugin1', error)
    };
    const plugin2: ExecutorPlugin = {
      pluginName: 'test2',
      onError: jest.fn()
    };

    executor.use(plugin1);
    executor.use(plugin2);

    try {
      executor.exec(() => {
        throw new Error('original error');
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ExecutorError);
      expect((error as ExecutorError).message).toBe('original error');
      expect(plugin2.onError).toHaveBeenCalledTimes(0);
    }
  });
});

describe('SyncExecutor onSuccess Lifecycle', () => {
  it('should execute onSuccess hook', () => {
    const executor = new SyncExecutor();
    const plugin: ExecutorPlugin = {
      pluginName: 'test2',
      onSuccess: ({ returnValue }) => returnValue + ' success'
    };

    executor.use(plugin);
    const result = executor.exec(() => 'test');
    expect(result).toBe('test success');
  });

  it('should modify the result through onSuccess hooks', () => {
    const executor = new SyncExecutor();
    const plugin1: ExecutorPlugin = {
      pluginName: 'test',
      onSuccess: ({ returnValue }) => returnValue + ' modified by plugin1'
    };
    const plugin2: ExecutorPlugin = {
      pluginName: 'test2',
      onSuccess: ({ returnValue }) => returnValue + ' modified by plugin2'
    };

    executor.use(plugin1);
    executor.use(plugin2);

    const result = executor.exec(() => 'test');
    expect(result).toBe('test modified by plugin1 modified by plugin2');
  });

  it('should stop onSuccess chain and enter onError if an error is thrown', () => {
    const executor = new SyncExecutor();
    const plugin1: ExecutorPlugin = {
      pluginName: 'test',
      onSuccess: () => {
        throw new Error('Error in onSuccess');
      }
    };
    const plugin2: ExecutorPlugin = {
      pluginName: 'test2',
      onSuccess: jest.fn()
    };
    const onError = jest.fn();

    executor.use(plugin1);
    executor.use(plugin2);
    executor.use({ pluginName: 'test3', onError });

    expect(() => {
      executor.exec(() => 'test');
    }).toThrow(ExecutorError);

    expect(plugin2.onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it('should not execute onSuccess hook if task throws an error', () => {
    const executor = new SyncExecutor();
    const onSuccess = jest.fn();

    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onSuccess
    };

    executor.use(plugin);

    expect(() => {
      executor.exec(() => {
        throw new Error('test error');
      });
    }).toThrow(ExecutorError);

    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe('SyncExecutor execNoError Method', () => {
  it('should return ExecutorError instead of throwing an error', () => {
    const executor = new SyncExecutor();
    const result = executor.execNoError(() => {
      throw new Error('test error');
    });

    expect(result).toBeInstanceOf(ExecutorError);
  });

  it('should execute task and return result if no error occurs', () => {
    const executor = new SyncExecutor();
    const result = executor.execNoError(() => 'success');

    expect(result).toBe('success');
  });

  it('should handle errors through onError hooks and return the first error', () => {
    const executor = new SyncExecutor();
    const plugin1: ExecutorPlugin = {
      pluginName: 'test',
      onError: ({ error }) => new ExecutorError('Handled by plugin1', error)
    };
    const plugin2: ExecutorPlugin = {
      pluginName: 'test2',
      onError: jest.fn()
    };

    executor.use(plugin1);
    executor.use(plugin2);

    const result = executor.execNoError(() => {
      throw new Error('original error');
    });

    expect(result).toBeInstanceOf(ExecutorError);
    expect((result as ExecutorError).message).toBe('original error');
  });

  it('should return the original error wrapped in ExecutorError if no onError hooks are present', () => {
    const executor = new SyncExecutor();
    const result = executor.execNoError(() => {
      throw new Error('original error');
    });

    expect(result).toBeInstanceOf(ExecutorError);
    expect((result as ExecutorError).message).toBe('original error');
  });

  it('should not execute onSuccess hooks if an error occurs', () => {
    const executor = new SyncExecutor();
    const onSuccess = jest.fn();

    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onSuccess
    };

    executor.use(plugin);

    const result = executor.execNoError(() => {
      throw new Error('test error');
    });

    expect(result).toBeInstanceOf(ExecutorError);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
