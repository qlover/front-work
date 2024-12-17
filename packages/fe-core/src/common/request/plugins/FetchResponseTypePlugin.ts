import {
  ExecutorPlugin,
  ExecutorContext,
  RequestAdapterResponse
} from '../../../interface';
import { RequestAdapterFetchConfig } from '../adapter';

/**
 * FetchResponseTypePlugin is responsible for handling different response types
 * from fetch requests and converting them into a standardized adapter response.
 *
 * The core idea is to provide a flexible mechanism to process various response
 * types such as JSON, text, blob, etc., and return a consistent response format.
 *
 * Main function: Convert fetch responses into a RequestAdapterResponse based on
 * the specified response type in the configuration.
 *
 * Main purpose: To ensure that different response types are handled correctly
 * and consistently across the application.
 *
 * @since 1.0.14
 *
 * @example
 *
 * ```typescript
 * const plugin = new FetchResponseTypePlugin();
 * const mockResponse = new Response(JSON.stringify({ key: 'value' }), {
 *   status: 200,
 *   headers: { 'Content-Type': 'application/json' }
 * });
 *
 * const context: ExecutorContext<RequestAdapterFetchConfig> = {
 *   returnValue: mockResponse,
 *   parameters: { responseType: 'json' }
 * };
 * const result = await plugin.onSuccess(context);
 *
 * // => result.data is { key: 'value' }
 * // => result.status is 200
 * // => result.headers['content-type'] is 'application/json'
 * ```
 */
export class FetchResponseTypePlugin implements ExecutorPlugin {
  readonly pluginName = 'FetchResponseTypePlugin';

  /**
   * Converts the raw fetch response into a standardized adapter response.
   *
   * @param data The data extracted from the response based on the response type.
   * @param response The original fetch Response object.
   * @param config The configuration used for the fetch request.
   * @returns A RequestAdapterResponse containing the processed response data.
   */
  toAdapterResponse(
    data: unknown,
    response: Response,
    config: RequestAdapterFetchConfig
  ): RequestAdapterResponse {
    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: this.getResponseHeaders(response),
      config,
      response
    };
  }

  /**
   * Extracts headers from the fetch Response object and returns them as a record.
   *
   * @param response The fetch Response object from which headers are extracted.
   * @returns A record of headers with header names as keys and header values as values.
   */
  getResponseHeaders(response: Response): Record<string, string> {
    const headersObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    return headersObj;
  }

  /**
   * Processes the successful fetch response based on the specified response type.
   *
   * @param context The execution context containing the fetch response and configuration.
   * @returns A promise that resolves to a RequestAdapterResponse.
   */
  async onSuccess(
    context: ExecutorContext<RequestAdapterFetchConfig>
  ): Promise<RequestAdapterResponse> {
    const response = context.returnValue as Response;
    const config = context.parameters;

    switch (config.responseType) {
      case 'json':
        return this.toAdapterResponse(await response.json(), response, config);
      case 'arraybuffer':
        return this.toAdapterResponse(
          await response.arrayBuffer(),
          response,
          config
        );
      case 'blob':
        return this.toAdapterResponse(await response.blob(), response, config);
      case 'formdata':
        return this.toAdapterResponse(
          await response.formData(),
          response,
          config
        );
      case 'text':
        return this.toAdapterResponse(await response.text(), response, config);
      case 'document':
        return this.toAdapterResponse(await response.text(), response, config); // Assuming text for document
      case 'stream':
        return this.handleStreamResponse(response, config);
      default:
        return this.toAdapterResponse(await response.text(), response, config);
    }
  }

  /**
   * Handles the streaming response and tracks the progress.
   *
   * FIXME: if the content length is not available, the progress will not be accurate.
   *
   * @param response The Response object containing the stream.
   * @param config The configuration for the request adapter, which may include an onProgress callback.
   * @returns A promise that resolves to a RequestAdapterResponse.
   */
  async handleStreamResponse(
    response: Response,
    config: RequestAdapterFetchConfig
  ): Promise<RequestAdapterResponse> {
    const reader = response.body?.getReader();
    const contentLength = response.headers.get('Content-Length');
    let receivedLength = 0;
    const chunks: Uint8Array[] = [];
    const decoder = new TextDecoder();

    // Extract onProgress from config if available
    const onProgress = config.onStreamProgress;

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      chunks.push(value);
      receivedLength += value.length;

      // Calculate and report progress
      if (contentLength && onProgress) {
        const totalLength = parseInt(contentLength, 10);
        const progress = (receivedLength / totalLength) * 100;
        onProgress(progress);
      } else {
        onProgress?.(receivedLength);
      }
    }

    // Manually concatenate Uint8Array chunks
    const fullArray = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      fullArray.set(chunk, position);
      position += chunk.length;
    }

    const fullText = decoder.decode(fullArray);
    return this.toAdapterResponse(fullText, response, config);
  }
}
