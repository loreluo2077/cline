import express from "express"
import http from "http"
import { WebSocketServer, WebSocket } from "ws"
import path from "path"
import { Controller } from "./core/Controller"

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "..", "public")))

wss.on("connection", (ws: WebSocket) => {
	console.log("Client connected")

	// Create a Controller for this specific client
	const Controller = new Controller((message) => {
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(message))
		}
	})

	// Handle messages from the client
	ws.on("message", (message: string) => {
		try {
			const parsedMessage = JSON.parse(message)
			// Forward the message to the Controller
			Controller.handleClientMessage(parsedMessage)
		} catch (error: any) {
			console.error("Failed to parse incoming message:", message, error)
		}
	})

	ws.on("close", () => {
		console.log("Client disconnected")
		// Clean up resources associated with the Controller/task
		Controller.cancelTask()
	})

	ws.on("error", (error) => {
		console.error("WebSocket error:", error)
	})
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
	console.log(`Server is listening on http://localhost:${PORT}`)
})
