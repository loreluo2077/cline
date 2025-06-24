// This file contains mock type definitions based on the original project structure.
// In a real application, these would be more detailed and potentially split into multiple files.

export type ApiProvider = "anthropic" | "openrouter" | "bedrock" | "gemini" | "ollama" | "vscode-lm" | "openai" | "mock" // Added for the mock architecture

export interface ApiConfiguration {
	apiProvider?: ApiProvider
	[key: string]: any // Mock for other properties
}

export interface ChatSettings {
	mode: "plan" | "act"
}

export interface UserInfo {
	email?: string
	displayName?: string
}

export interface HistoryItem {
	id: string
	ts: number
	task: string
	isFavorited?: boolean
}

export interface ClineMessage {
	speaker: "user" | "assistant"
	text?: string
	blocks?: any[]
	ts: number
}

export interface ExtensionState {
	version: string
	apiConfiguration?: ApiConfiguration
	clineMessages: ClineMessage[]
	taskHistory: HistoryItem[]
	chatSettings?: ChatSettings
	userInfo?: UserInfo
	isTaskRunning?: boolean
	// ... other state properties
}

export interface WebviewMessage {
	type: string
	[key: string]: any
}

export interface ExtensionMessage {
	type: "stateUpdate" | "otherAction"
	state?: ExtensionState
	[key: string]: any
}

export interface ToolBlock {
	type: "tool_use"
	id: string
	name: string
	input: any
}
