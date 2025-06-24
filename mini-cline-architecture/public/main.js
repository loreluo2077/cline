document.addEventListener("DOMContentLoaded", () => {
	const ws = new WebSocket(`ws://${window.location.host}`)

	const promptInput = document.getElementById("prompt-input")
	const sendButton = document.getElementById("send-button")
	const cancelButton = document.getElementById("cancel-button")
	const messagesDiv = document.getElementById("messages")
	const logsDiv = document.getElementById("logs")

	const addLog = (log) => {
		const logElement = document.createElement("div")
		logElement.textContent = `[${new Date().toLocaleTimeString()}] ${log}`
		logsDiv.appendChild(logElement)
		logsDiv.scrollTop = logsDiv.scrollHeight
	}

	ws.onopen = () => {
		addLog("Connected to the server.")
	}

	ws.onclose = () => {
		addLog("Disconnected from the server.")
	}

	ws.onerror = (error) => {
		addLog(`WebSocket Error: ${error.message}`)
	}

	// Function to handle all incoming messages from the server
	ws.onmessage = (event) => {
		const data = JSON.parse(event.data)
		addLog(`Received message type: ${data.type}`)

		if (data.type === "stateUpdate") {
			renderMessages(data.state.clineMessages)
			updateControls(data.state.isTaskRunning)
		} else if (data.type === "log") {
			addLog(data.message)
		}
	}

	// Render the entire message list
	const renderMessages = (messages) => {
		messagesDiv.innerHTML = ""
		messages.forEach((msg) => {
			const msgElement = document.createElement("div")
			msgElement.classList.add("message", msg.speaker)

			// In a real app, you'd sanitize this content
			let content = `<strong>${msg.speaker}:</strong><br>${msg.text || ""}`

			// Simple block rendering
			if (msg.blocks && msg.blocks.length > 0) {
				content += msg.blocks.map((b) => `<div class="tool">TOOL: ${b.name}</div>`).join("")
			}

			msgElement.innerHTML = content
			messagesDiv.appendChild(msgElement)
		})
		messagesDiv.scrollTop = messagesDiv.scrollHeight
	}

	// Enable/disable controls based on task status
	const updateControls = (isTaskRunning) => {
		promptInput.disabled = isTaskRunning
		sendButton.disabled = isTaskRunning
		cancelButton.disabled = !isTaskRunning
	}

	const sendMessage = () => {
		const prompt = promptInput.value.trim()
		if (prompt) {
			ws.send(JSON.stringify({ type: "new_task", prompt }))
			promptInput.value = ""
		}
	}

	const cancelTask = () => {
		ws.send(JSON.stringify({ type: "cancel_task" }))
	}

	sendButton.addEventListener("click", sendMessage)
	promptInput.addEventListener("keydown", (e) => {
		if (e.key === "Enter") sendMessage()
	})
	cancelButton.addEventListener("click", cancelTask)
})
