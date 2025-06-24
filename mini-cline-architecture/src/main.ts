import { OpenRouterHandler } from "./api/providers/openrouter"
import type { ApiHandlerOptions } from "./shared/api"
import { Anthropic } from "@anthropic-ai/sdk"
import * as dotenv from "dotenv"

// 加载环境变量
dotenv.config()

async function main() {
	// 从环境变量获取 API key
	const apiKey = process.env.OPENROUTER_API_KEY
	if (!apiKey) {
		throw new Error("请设置 OPENROUTER_API_KEY 环境变量")
	}

	// 构造 ApiHandlerOptions
	const options: ApiHandlerOptions = {
		openRouterApiKey: apiKey,
		reasoningEffort: "0.5", // 需要是字符串类型
		thinkingBudgetTokens: 1000,
		openRouterProviderSorting: "price",
		openRouterModelId: "anthropic/claude-3.7-sonnet",
	}

	// 创建 OpenRouterHandler 实例
	const handler = new OpenRouterHandler(options)

	// 构造系统提示词和消息
	const systemPrompt = "你是一个友好的AI助手。"
	const messages: Anthropic.Messages.MessageParam[] = [
		{
			role: "user",
			content: "你好!请介绍一下自己。",
		},
	]

	try {
		// 调用 createMessage 方法并处理流式响应
		console.log("开始生成回复...")
		for await (const chunk of handler.createMessage(systemPrompt, messages)) {
			switch (chunk.type) {
				case "text":
					process.stdout.write(chunk.text)
					break
				case "reasoning":
					console.log("\n[推理过程]:", chunk.reasoning)
					break
				case "usage":
					console.log("\n\n使用统计:")
					console.log("- 输入tokens:", chunk.inputTokens)
					console.log("- 输出tokens:", chunk.outputTokens)
					console.log("- 缓存读取tokens:", chunk.cacheReadTokens)
					console.log("- 总成本:", chunk.totalCost)
					break
			}
		}
	} catch (error) {
		console.error("发生错误:", error)
	}
}

main().catch(console.error)
