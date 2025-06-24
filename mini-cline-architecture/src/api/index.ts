import { Anthropic } from "@anthropic-ai/sdk"
import { type ApiConfiguration, type ModelInfo } from "../shared/api"
import { OpenRouterHandler } from "./providers/openrouter"

import { type ApiStream, type ApiStreamUsageChunk } from "@/api/transform/stream"
import { AnthropicHandler } from "./providers/anthropic"

export interface ApiHandler {
	createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream
	getModel(): { id: string; info: ModelInfo }
	getApiStreamUsage?(): Promise<ApiStreamUsageChunk | undefined>
}

export interface SingleCompletionHandler {
	completePrompt(prompt: string): Promise<string>
}

export function buildApiHandler(configuration: ApiConfiguration): ApiHandler {
	const { apiProvider, ...options } = configuration
	switch (apiProvider) {
		// case "anthropic":
		// 	return new AnthropicHandler(options)
		case "openrouter":
			return new OpenRouterHandler(options)
		// case "bedrock":
		// 	return new AwsBedrockHandler(options)
		// case "vertex":
		// 	return new VertexHandler(options)
		// case "openai":
		// 	return new OpenAiHandler(options)
		// case "ollama":
		// 	return new OllamaHandler(options)
		// case "lmstudio":
		// 	return new LmStudioHandler(options)
		// case "gemini":
		// 	return new GeminiHandler(options)
		// case "openai-native":
		// 	return new OpenAiNativeHandler(options)
		// case "deepseek":
		// 	return new DeepSeekHandler(options)
		// case "requesty":
		// 	return new RequestyHandler(options)
		// case "fireworks":
		// 	return new FireworksHandler(options)
		// case "together":
		// 	return new TogetherHandler(options)
		// case "qwen":
		// 	return new QwenHandler(options)
		// case "doubao":
		// 	return new DoubaoHandler(options)
		// case "mistral":
		// 	return new MistralHandler(options)
		// case "vscode-lm":
		// 	return new VsCodeLmHandler(options)
		// case "cline":
		// 	return new ClineHandler(options)
		// case "litellm":
		// 	return new LiteLlmHandler(options)
		// case "nebius":
		// 	return new NebiusHandler(options)
		// case "asksage":
		// 	return new AskSageHandler(options)
		// case "xai":
		// 	return new XAIHandler(options)
		// case "sambanova":
		// 	return new SambanovaHandler(options)
		// case "cerebras":
		// 	return new CerebrasHandler(options)
		// case "sapaicore":
		// 	return new SapAiCoreHandler(options)
		// case "claude-code":
		// 	return new ClaudeCodeHandler(options)
		default:
			return new AnthropicHandler(options)
	}
}
