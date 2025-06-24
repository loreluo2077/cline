import { Task } from "../task"
import { ExtensionState, WebviewMessage, ExtensionMessage, HistoryItem, ClineMessage } from "@shared/types"
import { v4 as uuidv4 } from "uuid"

/**
 * The Controller (Virtual Character) is the "brain" for a client's session. It manages state,
 * orchestrates tasks, and handles all communication from the client.
 */
export class Controller {
	task?: Task
	private sendToClient: (message: any) => void

	// Mocked state, now includes task status
	private state: ExtensionState = {
		version: "0.2.0",
		clineMessages: [],
		taskHistory: [],
		apiConfiguration: { apiProvider: "mock" },
		chatSettings: { mode: "plan" },
		isTaskRunning: false,
	}

	constructor(sendToClient: (message: any) => void) {
		this.sendToClient = sendToClient
		this.logToClient("[Controller]: Initialized for new client.")
		this.postStateToClient()
	}

	/**
	 * The main message handler for all incoming messages from the client.
	 */
	async handleClientMessage(message: WebviewMessage) {
		this.logToClient(`[Controller]: Received message type: ${message.type}`)
		switch (message.type) {
			case "new_task":
				await this.initTask(message.prompt)
				break

			case "cancel_task":
				await this.cancelTask()
				break

			default:
				this.logToClient(`[Controller]: Unknown message type: ${message.type}`)
		}
	}

	/**
	 * Creates and starts a new Task.
	 */
	async initTask(prompt: string) {
		this.logToClient(`[Controller]: Initializing new task with prompt: "${prompt}"`)
		await this.clearTask() // Ensure no task is running

		this.state.isTaskRunning = true
		this.addMessage({ speaker: "user", text: prompt, ts: Date.now() })

		this.task = new Task(
			(historyItem) => this.updateTaskHistory(historyItem),
			() => this.postStateToClient(),
			(message) => this.addMessage(message),
			(log) => this.logToClient(log),
		)

		this.task
			.initiateTaskLoop(prompt)
			.catch((err: any) => this.logToClient(`[Controller]: Task loop failed: ${err.message}`))
			.finally(async () => {
				this.logToClient("[Controller]: Task loop finished.")
				this.state.isTaskRunning = false
				await this.clearTask()
				await this.postStateToClient()
			})
	}

	/**
	 * Cancels the currently active task.
	 */
	async cancelTask() {
		this.logToClient("[Controller]: Cancelling task...")
		if (this.task) {
			this.task.abortTask()
		}
		this.state.isTaskRunning = false
		await this.postStateToClient()
	}

	private async clearTask() {
		if (this.task) {
			this.task.abortTask()
			this.task = undefined
		}
	}

	private addMessage(message: Omit<ClineMessage, "blocks" | "ts"> & { ts?: number }) {
		// This logic should be improved to update the last message if the ID is the same.
		const existingMessageIndex = message.id ? this.state.clineMessages.findIndex((m) => m.id === message.id) : -1

		if (existingMessageIndex !== -1) {
			this.state.clineMessages[existingMessageIndex] = {
				...this.state.clineMessages[existingMessageIndex],
				...message,
			}
		} else {
			this.state.clineMessages.push({ ...message, id: message.id || uuidv4(), ts: message.ts || Date.now(), blocks: [] })
		}

		this.postStateToClient()
	}

	private async updateTaskHistory(item: Omit<HistoryItem, "id">) {
		const historyItem: HistoryItem = { ...item, id: uuidv4() }
		this.logToClient(`[Controller]: Updating task history with: ${item.task}`)
		this.state.taskHistory.push(historyItem)
		this.postStateToClient()
	}

	/**
	 * Sends the current state to the client.
	 */
	async postStateToClient() {
		this.sendToClient({
			type: "stateUpdate",
			state: this.state,
		})
	}

	logToClient(message: string) {
		console.log(message) // Also log to server console
		this.sendToClient({
			type: "log",
			message: message,
		})
	}
}
