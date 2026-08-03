import OpenAI from "openai";

import type {
  ModelInfo,
  ModelProvider,
  ProviderCapabilities,
  ProviderRequest,
  ProviderResponse,
  ProviderResponseFormat,
  ProviderStreamEvent,
} from "@harborts/core";
import { NotImplementedError, ProviderError } from "@harborts/core";

import { mapOpenAIFinishReason, mapOpenAIUsage, toProviderError } from "./errors.js";
import { fromOpenAIResponse, toOpenAIMessages } from "./messages.js";
import { toOpenAITools } from "./tools.js";
import type { OpenAIChatCompletionResponse } from "./types.js";

const DEFAULT_MODEL = "gpt-4o-mini";

/**
 * Configuration for {@link OpenAIProvider}.
 */
export interface OpenAIProviderOptions {
  /**
   * OpenAI API key.
   *
   * Falls back to `process.env.OPENAI_API_KEY` when omitted.
   */
  apiKey?: string;

  /**
   * Default model id used when a request does not specify one.
   *
   * @defaultValue `"gpt-4o-mini"`
   */
  model?: string;

  /**
   * Optional OpenAI organization id.
   */
  organization?: string;

  /**
   * Optional custom API base URL.
   */
  baseURL?: string;

  /**
   * Optional preconfigured OpenAI client.
   *
   * Intended for tests and advanced dependency injection. When provided,
   * `apiKey` / `organization` / `baseURL` are ignored.
   */
  client?: OpenAI;
}

/**
 * Production {@link ModelProvider} backed by the official OpenAI Node SDK.
 *
 * Converts Harbor messages/tools to OpenAI Chat Completions payloads and maps
 * responses back into Harbor {@link ProviderResponse} values.
 */
export class OpenAIProvider implements ModelProvider {
  /**
   * Provider identifier.
   */
  readonly id = "openai";

  /**
   * Declared OpenAI provider capabilities.
   */
  readonly capabilities: ProviderCapabilities = {
    streaming: false,
    tools: true,
    structuredOutput: true,
    systemMessage: true,
  };

  readonly #client: OpenAI;
  readonly #defaultModel: string;

  /**
   * @param options - OpenAI provider configuration.
   */
  constructor(options: OpenAIProviderOptions = {}) {
    this.#defaultModel = options.model ?? DEFAULT_MODEL;

    if (options.client !== undefined) {
      this.#client = options.client;
      return;
    }

    const apiKey = options.apiKey ?? process.env["OPENAI_API_KEY"];
    if (apiKey === undefined || apiKey.length === 0) {
      throw new ProviderError("OpenAI API key is required. Pass apiKey or set OPENAI_API_KEY.", {
        code: "provider_authentication",
        provider: this.id,
      });
    }

    this.#client = new OpenAI({
      apiKey,
      ...(options.organization !== undefined ? { organization: options.organization } : {}),
      ...(options.baseURL !== undefined ? { baseURL: options.baseURL } : {}),
    });
  }

  /**
   * Generate a Harbor provider response via OpenAI Chat Completions.
   *
   * @param request - Provider-agnostic generation request.
   */
  async generate(request: ProviderRequest): Promise<ProviderResponse> {
    request.signal?.throwIfAborted();

    const model = request.model ?? this.#defaultModel;
    const messages = toOpenAIMessages(request.messages);
    const body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
      model,
      messages,
    };

    if (request.tools !== undefined && request.tools.length > 0) {
      body.tools = toOpenAITools(request.tools);
    }
    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }
    if (request.maxTokens !== undefined) {
      body.max_tokens = request.maxTokens;
    }
    if (request.stopSequences !== undefined && request.stopSequences.length > 0) {
      body.stop = request.stopSequences;
    }
    const responseFormat = toOpenAIResponseFormat(request.responseFormat);
    if (responseFormat !== undefined) {
      body.response_format = responseFormat;
    }

    try {
      const completion = await this.#client.chat.completions.create(
        body,
        request.signal !== undefined ? { signal: request.signal } : undefined,
      );

      return toHarborProviderResponse(completion as unknown as OpenAIChatCompletionResponse);
    } catch (error) {
      if (isAbortError(error)) {
        throw new ProviderError("OpenAI request was cancelled", {
          code: "provider_cancelled",
          provider: this.id,
          cause: error,
        });
      }
      throw toProviderError(error);
    }
  }

  /**
   * Streaming is not implemented yet.
   *
   * @param _request - Provider-agnostic generation request.
   */
  stream(_request: ProviderRequest): AsyncIterable<ProviderStreamEvent> {
    throw new NotImplementedError("OpenAIProvider.stream");
  }

  /**
   * Return basic model metadata for the given id.
   *
   * @param modelId - OpenAI model identifier.
   */
  getModelInfo(modelId: string): ModelInfo {
    return {
      id: modelId,
      name: modelId,
      provider: this.id,
      capabilities: this.capabilities,
    };
  }
}

function toHarborProviderResponse(completion: OpenAIChatCompletionResponse): ProviderResponse {
  const message = fromOpenAIResponse(completion);
  const choice = completion.choices[0];
  const response: ProviderResponse = {
    message,
  };

  const finishReason = mapOpenAIFinishReason(choice?.finish_reason);
  if (finishReason !== undefined) {
    response.finishReason = finishReason;
  }

  const usage = mapOpenAIUsage(completion.usage);
  if (usage !== undefined) {
    response.usage = usage;
  }

  if (completion.model !== undefined) {
    response.model = completion.model;
  }

  return response;
}

function toOpenAIResponseFormat(
  format: ProviderResponseFormat | undefined,
): OpenAI.Chat.Completions.ChatCompletionCreateParams["response_format"] | undefined {
  if (format === undefined) {
    return undefined;
  }

  switch (format.type) {
    case "text":
      return { type: "text" };
    case "json_object":
      return { type: "json_object" };
    case "json_schema":
      return {
        type: "json_schema",
        json_schema: {
          name: format.name,
          schema: format.schema,
          ...(format.strict !== undefined ? { strict: format.strict } : {}),
        },
      };
    default: {
      const _exhaustive: never = format;
      return _exhaustive;
    }
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}
