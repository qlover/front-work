import {
  ExecutorPlugin,
  ExecutorError,
  ExecutorContext
} from '../../../../src/interface';

describe('ExecutorPlugin', () => {
  it('should execute onBefore hook and modify data', async () => {
    const plugin: ExecutorPlugin<Record<string, unknown>> = {
      pluginName: 'test',
      onBefore: ({ parameters }) => {
        parameters.modified = true;
      }
    };

    const context: ExecutorContext<Record<string, unknown>> = {
      parameters: { value: 'test' }
    };

    await plugin.onBefore?.(context);
    expect(context.parameters.modified).toBe(true);
  });

  it('should execute onError hook and handle error', async () => {
    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onError: ({ error }) => new ExecutorError('Handled Error', error)
    };

    const context: ExecutorContext = {
      error: new Error('original error'),
      parameters: undefined
    };

    const result = await plugin.onError?.(context);
    expect(result).toBeInstanceOf(ExecutorError);
    expect((result as ExecutorError).id).toBe('Handled Error');
  });

  it('should execute onSuccess hook and modify result', async () => {
    const plugin: ExecutorPlugin<string> = {
      pluginName: 'test',
      onSuccess: ({ returnValue }) => returnValue + ' success'
    };

    const context: ExecutorContext<string> = {
      returnValue: 'test',
      parameters: 'test'
    };

    const result = await plugin.onSuccess?.(context);
    expect(result).toBe('test success');
  });

  it('should execute onExec hook and modify task', async () => {
    const plugin: ExecutorPlugin = {
      pluginName: 'test',
      onExec: async <T>() => 'modified task' as T
    };

    const result = await plugin.onExec?.(() => 'original task');
    expect(result).toBe('modified task');
  });

  it('should respect onlyOne property and prevent duplicate plugins', () => {
    const plugin: ExecutorPlugin = {
      onlyOne: true,
      pluginName: 'test'
    };

    const executor = {
      plugins: [plugin],
      use: function (p: ExecutorPlugin): void {
        if (
          this.plugins.find(
            (existing) => existing.pluginName === p.pluginName
          ) &&
          p.onlyOne
        ) {
          console.warn(`Plugin ${p.pluginName} is already used, skip adding`);
          return;
        }
        this.plugins.push(p);
      }
    };

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    executor.use(plugin);
    expect(consoleSpy).toHaveBeenCalledWith(
      `Plugin ${plugin.pluginName} is already used, skip adding`
    );
    consoleSpy.mockRestore();
  });
});
