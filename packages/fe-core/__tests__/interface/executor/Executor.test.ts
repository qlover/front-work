import { Executor, ExecutorContext, Task } from '../../../src/common';

class MyExecutor extends Executor {
  constructor() {
    super();
  }
  runHooks(): void {}

  exec<Result, Params = unknown>(task: Task<Result, Params>): Result {
    return task({} as ExecutorContext<Params>) as Result;
  }

  execNoError<Result, Params = unknown>(task: Task<Result, Params>): Result {
    return task({} as ExecutorContext<Params>) as Result;
  }
}

describe('Executor', () => {
  it('should handle base implementation', async () => {
    const executor = new MyExecutor();
    const result = executor.exec(() => 'success');
    expect(result).toBe('success');
  });
});
