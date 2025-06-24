import { describe, it, expect } from "bun:test"
import type { AssistantMessageContent, ToolUse } from "."
import { parseAssistantMessageV2, parseAssistantMessageV3 } from "./parse-assistant-message"

describe("parseAssistantMessageV2", () => {
	it("should parse a simple text message", () => {
		const message = "Hello, world!"
		const result = parseAssistantMessageV2(message)
		expect(result).toEqual([{ type: "text", content: "Hello, world!", partial: true }])
	})

	it("should handle an empty string", () => {
		const message = ""
		expect(parseAssistantMessageV2(message)).toEqual([])
	})

	it("should parse a simple tool use block", () => {
		const message = "<read_file><path>/path/to/file</path></read_file>"
		const expected: AssistantMessageContent[] = [
			{
				type: "tool_use",
				name: "read_file",
				params: { path: "/path/to/file" },
				partial: false,
			},
		]
		expect(parseAssistantMessageV2(message)).toEqual(expected)
	})

	it("should handle text and tool use", () => {
		const message = "Please read this file: <read_file><path>/path/to/file</path></read_file> Thank you."
		const result = parseAssistantMessageV2(message)
		expect(result).toEqual([
			{ type: "text", content: "Please read this file:", partial: false },
			{
				type: "tool_use",
				name: "read_file",
				params: { path: "/path/to/file" },
				partial: false,
			},
			{ type: "text", content: "Thank you.", partial: true },
		])
	})

	it("should handle multiple tool uses", () => {
		const message = `<ask_followup_question><question>q</question></ask_followup_question><replace_in_file><path>p</path></replace_in_file>`
		const result = parseAssistantMessageV2(message)
		expect(result).toEqual([
			{
				type: "tool_use",
				name: "ask_followup_question",
				params: { question: "q" },
				partial: false,
			},
			{
				type: "tool_use",
				name: "replace_in_file",
				params: { path: "p" },
				partial: false,
			},
		])
	})

	it("should handle partial tool use at the end of the message", () => {
		const message = "Thinking... <read_file><path>/path/to/file</path>"
		const expected: AssistantMessageContent[] = [
			{ type: "text", content: "Thinking...", partial: false },
			{
				type: "tool_use",
				name: "read_file",
				params: { path: "/path/to/file" },
				partial: true,
			},
		]
		expect(parseAssistantMessageV2(message)).toEqual(expected)
	})

	it("should handle partial parameter at the end of the message", () => {
		const message = "<read_file><path>/path/to/f"
		const expected: AssistantMessageContent[] = [
			{
				type: "tool_use",
				name: "read_file",
				params: { path: "/path/to/f" },
				partial: true,
			},
		]
		expect(parseAssistantMessageV2(message)).toEqual(expected)
	})

	it("should handle write_to_file with content correctly", () => {
		const message = `<write_to_file><path>file.txt</path><content>Hello\nWorld</content></write_to_file>`
		const expected: AssistantMessageContent[] = [
			{
				type: "tool_use",
				name: "write_to_file",
				params: {
					path: "file.txt",
					content: "Hello\nWorld",
				},
				partial: false,
			},
		]
		expect(parseAssistantMessageV2(message)).toEqual(expected)
	})

	it("should handle special content parameter for write_to_file even with missing closing tag", () => {
		const message = "<write_to_file><path>a.txt</path><content>some content</write_to_file>"
		const result = parseAssistantMessageV2(message)
		expect(result[0].type).toBe("tool_use")
		const toolUse = result[0] as ToolUse
		expect(toolUse.name).toBe("write_to_file")
		expect(toolUse.params.path).toBe("a.txt")
		expect(toolUse.params.content).toBe("some content</write_to_file>")
		expect(toolUse.partial).toBe(false) // The tool itself is closed.
	})
})

describe("parseAssistantMessageV3", () => {
	// V3 should still handle V2 cases
	it("should parse a simple text message", () => {
		const message = "Hello, world!"
		const result = parseAssistantMessageV3(message)
		expect(result).toEqual([{ type: "text", content: "Hello, world!", partial: true }])
	})

	it("should parse a simple tool use block (V2 style)", () => {
		const message = "<read_file><path>/path/to/file</path></read_file>"
		const result = parseAssistantMessageV3(message)
		expect(result).toEqual([
			{
				type: "tool_use",
				name: "read_file",
				params: { path: "/path/to/file" },
				partial: false,
			},
		])
	})

	// V3 specific cases
	it("should parse a simple function_calls block with LS", () => {
		const message = `<function_calls><invoke name="LS"><parameter name="path">./src</parameter></invoke></function_calls>`
		const result = parseAssistantMessageV3(message)
		expect(result).toEqual([
			{
				type: "tool_use",
				name: "list_files",
				params: { path: "./src", recursive: "false" },
				partial: false,
			},
		])
	})

	it("should parse text before and after function_calls block", () => {
		const message = `Okay, I will list the files.\n<function_calls><invoke name="LS"><parameter name="path">./</parameter></invoke></function_calls>\nDone.`
		const result = parseAssistantMessageV3(message)
		expect(result).toEqual([
			{ type: "text", content: "Okay, I will list the files.", partial: false },
			{
				type: "tool_use",
				name: "list_files",
				params: { path: "./", recursive: "false" },
				partial: false,
			},
			{ type: "text", content: "Done.", partial: true },
		])
	})

	it("should parse a Grep invoke", () => {
		const message = `<function_calls><invoke name="Grep"><parameter name="pattern">import</parameter><parameter name="path">./src</parameter></invoke></function_calls>`
		const result = parseAssistantMessageV3(message)
		expect(result).toEqual([
			{
				type: "tool_use",
				name: "search_files",
				params: { regex: "import", path: "./src" },
				partial: false,
			},
		])
	})

	it("should parse a Write invoke", () => {
		const message = `<function_calls><invoke name="Write"><parameter name="file_path">/tmp/test.txt</parameter><parameter name="content">Hello world</parameter></invoke></function_calls>`
		const result = parseAssistantMessageV3(message)
		expect(result).toEqual([
			{
				type: "tool_use",
				name: "write_to_file",
				params: { path: "/tmp/test.txt", content: "Hello world" },
				partial: false,
			},
		])
	})

	it("should parse multiple invokes", () => {
		const message = `<function_calls><invoke name="LS"><parameter name="path">.</parameter></invoke><invoke name="Read"><parameter name="file_path">./package.json</parameter></invoke></function_calls>`
		const result = parseAssistantMessageV3(message)
		expect(result).toEqual([
			{
				type: "tool_use",
				name: "list_files",
				params: { path: ".", recursive: "false" },
				partial: false,
			},
			{
				type: "tool_use",
				name: "read_file",
				params: { path: "./package.json" },
				partial: false,
			},
		])
	})

	it("should handle partial invoke", () => {
		const message = `<function_calls><invoke name="LS"><parameter name="path">.`
		const result = parseAssistantMessageV3(message)
		expect(result).toEqual([
			{
				type: "tool_use",
				name: "list_files",
				params: { path: "." },
				partial: true,
			},
		])
	})

	it("should handle partial function_calls", () => {
		const message = `<function_calls><invoke name="LS"><parameter name="path">.</parameter></invoke>`
		const result = parseAssistantMessageV3(message)
		expect(result).toEqual([
			{
				type: "tool_use",
				name: "list_files",
				params: { path: "." },
				partial: true, // because function_calls is not closed
			},
		])
	})

	it("should handle mixed content", () => {
		const message = `I will first list files. <function_calls><invoke name="LS"><parameter name="path">.</parameter></invoke></function_calls> Then I will read a file <read_file><path>./a.txt</path></read_file>`
		const result = parseAssistantMessageV3(message)
		expect(result).toEqual([
			{
				type: "text",
				content: "I will first list files.",
				partial: false,
			},
			{
				type: "tool_use",
				name: "list_files",
				params: { path: ".", recursive: "false" },
				partial: false,
			},
			{
				type: "text",
				content: "Then I will read a file",
				partial: false,
			},
			{
				type: "tool_use",
				name: "read_file",
				params: { path: "./a.txt" },
				partial: false,
			},
		])
	})
})
