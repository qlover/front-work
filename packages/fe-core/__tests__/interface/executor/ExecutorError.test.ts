import { ExecutorError } from '../../../src/common';

describe('ExecutorError', () => {
  it('should create an error with a message from a string', () => {
    const error = new ExecutorError('ERROR_ID', 'This is an error message');
    expect(error.message).toBe('This is an error message');
    expect(error.id).toBe('ERROR_ID');
  });

  it('should create an error with a message from an Error object', () => {
    const originalError = new Error('Original error message');
    const error = new ExecutorError('ERROR_ID', originalError);
    expect(error.message).toBe('Original error message');
    expect(error.id).toBe('ERROR_ID');
    // expect(error.stack).toContain(originalError.stack);
  });

  it('should create an error with the id as the message if no originalError is provided', () => {
    const error = new ExecutorError('ERROR_ID');
    expect(error.message).toBe('ERROR_ID');
    expect(error.id).toBe('ERROR_ID');
  });

  it('should maintain the prototype chain', () => {
    const error = new ExecutorError('ERROR_ID');
    expect(error).toBeInstanceOf(ExecutorError);
    expect(error).toBeInstanceOf(Error);
  });

  // it('should have a stack trace starting with ExecutorError', () => {
  //   const executorError = new ExecutorError('EXECUTOR_ERROR');

  //   expect(executorError.stack).toMatch(/^ExecutorError: EXECUTOR_ERROR/);
  // });

  // it('should maintain the original stack trace order', () => {
  //   const originalError = new Error('Original error');
  //   const executorError = new ExecutorError('EXECUTOR_ERROR', originalError);

  //   const originalStackIndex = executorError.stack
  //     ? executorError.stack.indexOf(originalError.stack!)
  //     : -1;
  //   const executorStackIndex = executorError.stack
  //     ? executorError.stack.indexOf('ExecutorError: EXECUTOR_ERROR')
  //     : -1;

  //   expect(originalStackIndex).toBeLessThan(executorStackIndex);
  // });
});
