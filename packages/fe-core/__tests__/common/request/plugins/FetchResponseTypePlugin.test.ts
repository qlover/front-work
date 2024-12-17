import { FetchResponseTypePlugin } from '../../../../src/common/request/plugins/FetchResponseTypePlugin';
import { ExecutorContext } from '../../../../src/interface';
import { RequestAdapterFetchConfig } from '../../../../src/common/request/adapter/RequestAdapterFetch';

describe('json responseType', () => {
  it('should handle json response correctly', async () => {
    const plugin = new FetchResponseTypePlugin();
    const mockResponse = new Response(JSON.stringify({ key: 'value' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    const context: ExecutorContext<RequestAdapterFetchConfig> = {
      returnValue: mockResponse,
      parameters: { responseType: 'json' }
    };

    const result = await plugin.onSuccess(context);

    expect(result.data).toEqual({ key: 'value' });
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('application/json');
  });

  it('should handle empty json response', async () => {
    const plugin = new FetchResponseTypePlugin();
    const mockResponse = new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    const context: ExecutorContext<RequestAdapterFetchConfig> = {
      returnValue: mockResponse,
      parameters: { responseType: 'json' }
    };

    const result = await plugin.onSuccess(context);

    expect(result.data).toEqual({});
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('application/json');
  });

  it('should handle invalid json response', async () => {
    const plugin = new FetchResponseTypePlugin();
    const mockResponse = new Response('Invalid JSON', {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    const context: ExecutorContext<RequestAdapterFetchConfig> = {
      returnValue: mockResponse,
      parameters: { responseType: 'json' }
    };

    await expect(plugin.onSuccess(context)).rejects.toThrow(/Unexpected token/);
  });
});

describe('arraybuffer responseType', () => {
  it('should handle arraybuffer response correctly', async () => {
    const plugin = new FetchResponseTypePlugin();
    const buffer = new ArrayBuffer(8);
    const mockResponse = new Response(buffer, {
      status: 200,
      headers: { 'Content-Type': 'application/octet-stream' }
    });

    const context: ExecutorContext<RequestAdapterFetchConfig> = {
      returnValue: mockResponse,
      parameters: { responseType: 'arraybuffer' }
    };

    const result = await plugin.onSuccess(context);

    expect(result.data).toBeInstanceOf(ArrayBuffer);
    expect((result.data as ArrayBuffer).byteLength).toBe(8);
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('application/octet-stream');
  });

  it('should handle empty arraybuffer response', async () => {
    const plugin = new FetchResponseTypePlugin();
    const buffer = new ArrayBuffer(0);
    const mockResponse = new Response(buffer, {
      status: 200,
      headers: { 'Content-Type': 'application/octet-stream' }
    });

    const context: ExecutorContext<RequestAdapterFetchConfig> = {
      returnValue: mockResponse,
      parameters: { responseType: 'arraybuffer' }
    };

    const result = await plugin.onSuccess(context);

    expect(result.data).toBeInstanceOf(ArrayBuffer);
    expect((result.data as ArrayBuffer).byteLength).toBe(0);
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('application/octet-stream');
  });
});

describe('blob responseType', () => {
  it('should handle blob response correctly', async () => {
    const plugin = new FetchResponseTypePlugin();
    const blob = new Blob(['Hello, world!'], { type: 'text/plain' });
    const mockResponse = new Response(blob, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });

    const context: ExecutorContext<RequestAdapterFetchConfig> = {
      returnValue: mockResponse,
      parameters: { responseType: 'blob' }
    };

    const result = await plugin.onSuccess(context);

    expect(result.data).toBeInstanceOf(Blob);
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('text/plain');
  });

  it('should handle empty blob response', async () => {
    const plugin = new FetchResponseTypePlugin();
    const blob = new Blob([], { type: 'text/plain' });
    const mockResponse = new Response(blob, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });

    const context: ExecutorContext<RequestAdapterFetchConfig> = {
      returnValue: mockResponse,
      parameters: { responseType: 'blob' }
    };

    const result = await plugin.onSuccess(context);

    expect(result.data).toBeInstanceOf(Blob);
    expect((result.data as Blob).size).toBe(0);
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('text/plain');
  });
});

describe('text responseType', () => {
  it('should handle text response correctly', async () => {
    const plugin = new FetchResponseTypePlugin();
    const mockResponse = new Response('Hello, world!', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });

    const context: ExecutorContext<RequestAdapterFetchConfig> = {
      returnValue: mockResponse,
      parameters: { responseType: 'text' }
    };

    const result = await plugin.onSuccess(context);

    expect(result.data).toBe('Hello, world!');
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('text/plain');
  });

  it('should handle empty text response', async () => {
    const plugin = new FetchResponseTypePlugin();
    const mockResponse = new Response('', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });

    const context: ExecutorContext<RequestAdapterFetchConfig> = {
      returnValue: mockResponse,
      parameters: { responseType: 'text' }
    };

    const result = await plugin.onSuccess(context);

    expect(result.data).toBe('');
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('text/plain');
  });
});

describe('document responseType', () => {
  it('should handle document response correctly', async () => {
    const plugin = new FetchResponseTypePlugin();
    const mockResponse = new Response(
      '<html><body>Hello, world!</body></html>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );

    const context: ExecutorContext<RequestAdapterFetchConfig> = {
      returnValue: mockResponse,
      parameters: { responseType: 'document' }
    };

    const result = await plugin.onSuccess(context);

    expect(result.data).toContain('Hello, world!');
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('text/html');
  });

  it('should handle empty document response', async () => {
    const plugin = new FetchResponseTypePlugin();
    const mockResponse = new Response('', {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });

    const context: ExecutorContext<RequestAdapterFetchConfig> = {
      returnValue: mockResponse,
      parameters: { responseType: 'document' }
    };

    const result = await plugin.onSuccess(context);

    expect(result.data).toBe('');
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('text/html');
  });
});

describe('stream responseType', () => {
  it('should handle stream response correctly', async () => {
    const plugin = new FetchResponseTypePlugin();
    const readableStream = new ReadableStream({
      start(controller): void {
        controller.enqueue(new TextEncoder().encode('Hello, world!'));
        controller.close();
      }
    });

    const mockResponse = new Response(readableStream, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });

    const context: ExecutorContext<RequestAdapterFetchConfig> = {
      returnValue: mockResponse,
      parameters: { responseType: 'stream' }
    };

    const result = await plugin.onSuccess(context);

    expect(result.data).toBe('Hello, world!');
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('text/plain');
  });

  it('should handle empty stream response', async () => {
    const plugin = new FetchResponseTypePlugin();
    const readableStream = new ReadableStream({
      start(controller): void {
        controller.close();
      }
    });

    const mockResponse = new Response(readableStream, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });

    const context: ExecutorContext<RequestAdapterFetchConfig> = {
      returnValue: mockResponse,
      parameters: { responseType: 'stream' }
    };

    const result = await plugin.onSuccess(context);

    expect(result.data).toBe('');
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('text/plain');
  });
});

describe('stream responseType with JSON data', () => {
  it('should handle stream response with JSON data correctly', async () => {
    const plugin = new FetchResponseTypePlugin();
    const jsonData = JSON.stringify({ message: 'Hello, world!' });
    const readableStream = new ReadableStream({
      start(controller): void {
        // 将 JSON 数据分块传输
        const encoder = new TextEncoder();
        const chunk1 = encoder.encode(jsonData.slice(0, 10));
        const chunk2 = encoder.encode(jsonData.slice(10));
        controller.enqueue(chunk1);
        controller.enqueue(chunk2);
        controller.close();
      }
    });

    const mockResponse = new Response(readableStream, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    const context: ExecutorContext<RequestAdapterFetchConfig> = {
      returnValue: mockResponse,
      parameters: { responseType: 'stream' }
    };

    const result = await plugin.onSuccess(context);

    expect(result.data).toBe(jsonData);
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('application/json');
  });

  it('should handle stream response with complex JSON data correctly', async () => {
    const plugin = new FetchResponseTypePlugin();
    const jsonData = JSON.stringify({
      message: 'Hello, world!',
      data: {
        id: 123,
        name: 'Test',
        attributes: {
          height: 180,
          weight: 75
        },
        tags: ['example', 'test', 'json']
      }
    });

    const readableStream = new ReadableStream({
      start(controller): void {
        // 将复杂的 JSON 数据分块传输
        const encoder = new TextEncoder();
        const chunk1 = encoder.encode(jsonData.slice(0, 20));
        const chunk2 = encoder.encode(jsonData.slice(20, 50));
        const chunk3 = encoder.encode(jsonData.slice(50));
        controller.enqueue(chunk1);
        controller.enqueue(chunk2);
        controller.enqueue(chunk3);
        controller.close();
      }
    });

    const mockResponse = new Response(readableStream, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    const context: ExecutorContext<RequestAdapterFetchConfig> = {
      returnValue: mockResponse,
      parameters: { responseType: 'stream' }
    };

    const result = await plugin.onSuccess(context);

    expect(result.data).toBe(jsonData);
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('application/json');
  });
});

describe('stream responseType with progress tracking', () => {
  it('should track progress of stream response', async () => {
    const plugin = new FetchResponseTypePlugin();
    const jsonData = JSON.stringify({ message: 'Hello, world!' });
    const readableStream = new ReadableStream({
      start(controller): void {
        const encoder = new TextEncoder();
        const chunk1 = encoder.encode(jsonData.slice(0, 10));
        const chunk2 = encoder.encode(jsonData.slice(10));
        controller.enqueue(chunk1);
        controller.enqueue(chunk2);
        controller.close();
      }
    });

    const mockResponse = new Response(readableStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': jsonData.length.toString()
      }
    });

    const onProgressMock = jest.fn();

    const context: ExecutorContext<RequestAdapterFetchConfig> = {
      returnValue: mockResponse,
      parameters: { responseType: 'stream', onStreamProgress: onProgressMock }
    };

    const result = await plugin.onSuccess(context);

    expect(result.data).toBe(jsonData);
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('application/json');

    // Verify that onProgress was called with expected values
    expect(onProgressMock).toHaveBeenCalled();
    expect(onProgressMock).toHaveBeenCalledWith(expect.any(Number));
  });
});

describe('stream responseType with large JSON data and progress tracking', () => {
  it('should handle large JSON data and track progress correctly', async () => {
    const plugin = new FetchResponseTypePlugin();
    const largeJsonData = JSON.stringify({
      message: 'Hello, world!',
      data: Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        value: `Item ${i}`
      }))
    });

    const readableStream = new ReadableStream({
      start(controller): void {
        const encoder = new TextEncoder();
        let position = 0;
        const chunkSize = 1024; // 每次传输1KB的数据

        while (position < largeJsonData.length) {
          const chunk = encoder.encode(
            largeJsonData.slice(position, position + chunkSize)
          );
          controller.enqueue(chunk);
          position += chunkSize;
        }
        controller.close();
      }
    });

    const mockResponse = new Response(readableStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': largeJsonData.length.toString()
      }
    });

    const onProgressMock = jest.fn();

    const context: ExecutorContext<RequestAdapterFetchConfig> = {
      returnValue: mockResponse,
      parameters: { responseType: 'stream', onStreamProgress: onProgressMock }
    };

    const result = await plugin.onSuccess(context);

    expect(result.data).toBe(largeJsonData);
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('application/json');

    // Verify that onProgress was called multiple times
    expect(onProgressMock).toHaveBeenCalled();
    expect(onProgressMock.mock.calls.length).toBeGreaterThan(1);

    // Verify that onProgress was called with increasing progress values
    const progressValues = onProgressMock.mock.calls.map((call) => call[0]);
    for (let i = 1; i < progressValues.length; i++) {
      expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
    }
  });
});

describe('stream responseType simulating ChatGPT API with detailed response', () => {
  it('should handle stream response from ChatGPT API with detailed response correctly', async () => {
    const plugin = new FetchResponseTypePlugin();
    const chatGptResponseChunks = [
      '{"id":"chatcmpl-1","object":"chat.completion.chunk","created":1620000000,"model":"gpt-3.5-turbo","choices":[{"delta":{"content":"JavaScript is a versatile programming language."},"index":0,"finish_reason":null}]}',
      '{"id":"chatcmpl-1","object":"chat.completion.chunk","created":1620000001,"model":"gpt-3.5-turbo","choices":[{"delta":{"content":" It is commonly used for web development."},"index":0,"finish_reason":null}]}',
      '{"id":"chatcmpl-1","object":"chat.completion.chunk","created":1620000002,"model":"gpt-3.5-turbo","choices":[{"delta":{"content":" JavaScript can be run in the browser and on the server."},"index":0,"finish_reason":"stop"}]}'
    ];

    const readableStream = new ReadableStream({
      start(controller): void {
        const encoder = new TextEncoder();
        chatGptResponseChunks.forEach((chunk) => {
          controller.enqueue(encoder.encode(chunk));
        });
        controller.close();
      }
    });
    const totalLength = chatGptResponseChunks.reduce(
      (acc, chunk) => acc + chunk.length,
      0
    );

    const mockResponse = new Response(readableStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': totalLength.toString()
      }
    });

    const onProgressMock = jest.fn();

    const context: ExecutorContext<RequestAdapterFetchConfig> = {
      returnValue: mockResponse,
      parameters: { responseType: 'stream', onStreamProgress: onProgressMock }
    };

    const result = await plugin.onSuccess(context);

    // Combine chunks to simulate full response
    const expectedResponse = chatGptResponseChunks.join('');
    expect(result.data).toBe(expectedResponse);
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('application/json');

    // Verify that onProgress was called
    expect(onProgressMock).toHaveBeenCalled();
  });
});
