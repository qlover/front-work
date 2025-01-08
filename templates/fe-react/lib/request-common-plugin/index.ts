import { get, isUndefined, set } from 'lodash';
import {
  ExecutorPlugin,
  RequestAdapterConfig,
  ExecutorContext,
  RequestAdapterResponse
} from '@qlover/fe-utils';

export type RequestCommonPluginConfig = {
  token?: string;

  /**
   * token prefix.
   *
   * eg. `Bearer xxx`, `Token xxx`
   */
  tokenPrefix?: string;

  /**
   * @default `Authorization`
   */
  authKey?: string;

  /**
   * default request headers
   */
  defaultHeaders?: Record<string, string>;

  /**
   * Whether the token is required.
   *
   * if not token provided, throw error.
   *
   * @default `false`
   */
  requiredToken?: boolean;

  /**
   * defualt request data
   */
  defaultRequestData?: Record<string, unknown>;

  /**
   * transform request data before sending.
   *
   * @param data - request data
   * @param context - executor context
   * @returns - request data
   */
  requestDataSerializer?: (
    data: unknown,
    context: ExecutorContext<RequestAdapterConfig>
  ) => unknown;
};

/**
 * Represents a plugin for handling common request configurations and behaviors.
 *
 * The RequestCommonPlugin is designed to manage request headers, token handling,
 * and data serialization before sending requests. It ensures that the necessary
 * configurations are applied to each request, enhancing the flexibility and
 * reusability of request handling in the application.
 *
 * Main functions include:
 * - Appending default headers and token to requests.
 * - Merging default request data with provided parameters.
 * - Serializing request data before sending.
 *
 * @example
 * const plugin = new RequestCommonPlugin({
 *   token: 'your-token',
 *   tokenPrefix: 'Bearer',
 *   defaultHeaders: { 'Custom-Header': 'value' },
 *   requiredToken: true,
 * });
 */
export class RequestCommonPlugin
  implements ExecutorPlugin<RequestAdapterConfig>
{
  readonly pluginName = 'RequestCommonPlugin';

  constructor(readonly config: RequestCommonPluginConfig = {}) {
    if (config.requiredToken && !config.token) {
      throw new Error('Token is required!');
    }
  }

  onBefore(context: ExecutorContext<RequestAdapterConfig>): void {
    const {
      token,
      tokenPrefix,
      defaultHeaders,
      authKey = 'Authorization',
      defaultRequestData,
      requestDataSerializer
    } = this.config;
    const { parameters } = context;

    // append default headers
    parameters.headers = {
      ...defaultHeaders,
      ...parameters.headers
    };

    // append content type header
    if (parameters.responseType === 'json') {
      parameters.headers['Content-Type'] = 'application/json';
    }

    // append token
    const authValue = tokenPrefix ? `${tokenPrefix} ${token}` : token;
    if (authKey && authValue) {
      parameters.headers[authKey] = authValue;
    }

    // merge defaults request data
    if (defaultRequestData) {
      Object.entries(defaultRequestData).forEach(([key, value]) => {
        const prevValue = get(parameters.data, key);
        if (isUndefined(prevValue)) {
          set(parameters.data as Record<string, unknown>, key, value);
        }
      });
    }

    // serialize request data
    if (requestDataSerializer && parameters.data) {
      parameters.data = requestDataSerializer(parameters.data, context);
    }
  }

  async onSuccess(
    context: ExecutorContext<RequestAdapterConfig>
  ): Promise<void> {
    const { parameters, returnValue } = context;
    const response = (returnValue as RequestAdapterResponse<unknown, Response>)
      .data;

    if (response instanceof Response) {
      switch (parameters.responseType) {
        case 'json':
          context.returnValue = await response.json();
          break;
        case 'text':
          context.returnValue = await response.text();
          break;
        case 'blob':
          context.returnValue = await response.blob();
          break;
        // FIXME: adapter support `arraybuffer`
        // @ts-expect-error
        case 'arrayBuffer':
        case 'arraybuffer':
          context.returnValue = await response.arrayBuffer();
          break;
      }
    }
  }
}