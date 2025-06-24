import { buildApiHandler } from "@/api/mock"
import { HistoryItem, ClineMessage, ToolBlock } from "@shared/types"
import { v4 as uuidv4 } from "uuid"

// Helper to simulate async operations
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * The Task class represents a single, continuous job given by the user.
 * It contains the core logic loop for interacting with the AI.
 */
export class Task {
	public readonly taskId: string
	private abort = false
	private api

	// Callbacks to communicate with the Controller
	private updateTaskHistory: (item: Omit<HistoryItem, "id">) => void
	private postStateToWebview: () => void
	private addMessage: (message: Omit<ClineMessage, "blocks" | "ts">) => void
	private log: (message: string) => void

	constructor(
		updateTaskHistory: (item: Omit<HistoryItem, "id">) => void,
		postStateToWebview: () => void,
		addMessage: (message: Omit<ClineMessage, "blocks" | "ts">) => void,
		log: (message: string) => void,
	) {
		this.taskId = uuidv4()
		this.updateTaskHistory = updateTaskHistory
		this.postStateToWebview = postStateToWebview
		this.addMessage = addMessage
		this.log = log
		this.api = buildApiHandler({ apiProvider: "mock" })

		this.log(`[Task ${this.taskId}]: Created.`)
	}

	/**
	 * The core execution loop of a task.
	 */
	async initiateTaskLoop(prompt: string) {
		this.log(`[Task ${this.taskId}]: Starting loop with prompt: "${prompt}"`)
		let currentPrompt = prompt

		// Loop until there are no more tools to execute
		while (!this.abort) {
			this.log(`[Task ${this.taskId}]: Calling API...`)
			this.addMessage({ speaker: "assistant", text: "Thinking..." })

			const apiConversation = [{ role: "user", content: currentPrompt }]
			const stream = this.api.createMessage("You are a helpful assistant.", apiConversation)

			let fullResponse = ""
			let toolCalls: ToolBlock[] = []
			let lastMessageId = uuidv4()

			for await (const chunk of stream) {
				if (this.abort) break

				if (chunk.type === "text") {
					fullResponse += chunk.text
					this.addMessage({ id: lastMessageId, speaker: "assistant", text: fullResponse })
				} else if (chunk.type === "tool_use") {
					this.log(`[Task ${this.taskId}]: Received tool call: ${chunk.name}`)
					toolCalls.push(chunk)
					lastMessageId = uuidv4() // Reset for next message after tool
				}
			}

			if (this.abort) {
				this.log(`[Task ${this.taskId}]: Aborted during API stream.`)
				break
			}

			if (toolCalls.length === 0) {
				this.log(`[Task ${this.taskId}]: Loop finished. No more tool calls.`)
				break
			}

			let toolResults = ""
			for (const toolCall of toolCalls) {
				const result = await this.executeTool(toolCall)
				toolResults += `Tool: ${toolCall.name}, Result: ${result}\n`
			}
			currentPrompt = `Here are the tool results:\n${toolResults}`
			toolCalls = []
		}

		await this.updateTaskHistory({ task: prompt, ts: Date.now() })
	}

	/**
	 * Mocks the execution of a tool.
	 */
	private async executeTool(tool: ToolBlock): Promise<string> {
		this.log(`[Task ${this.taskId}]: Executing tool "${tool.name}" with input: ${JSON.stringify(tool.input)}`)
		this.addMessage({ speaker: "assistant", text: `Executing tool: <b>${tool.name}</b>...` })
		await sleep(1000) // Simulate work
		const result = `Mock result for ${tool.name}`
		this.addMessage({ speaker: "assistant", text: `Tool <b>${tool.name}</b> finished.` })
		return result
	}

	/**
	 * Sets the abort flag to gracefully stop the task loop.
	 */
	abortTask() {
		this.log(`[Task ${this.taskId}]: Abort signal received.`)
		this.abort = true
	}
}

// Modify ClineMessage to include an optional ID for streaming updates
declare module "@shared/types" {
	export interface ClineMessage {
		id?: string
	}
}
