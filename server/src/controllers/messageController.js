const { chatStore, createMessageId } = require("../utils/chatStore");

function findRoomById(roomId) {
	return chatStore.rooms.find((room) => room.id === Number(roomId));
}

function findMessageById(messageId) {
	return chatStore.messages.find((message) => message.id === Number(messageId));
}

async function getRoomMessages(req, res) {
	const roomId = Number(req.params.roomId);
	const room = findRoomById(roomId);
	if (!room) {
		return res.status(404).json({ message: "Room not found" });
	}

	const isMember = room.members.some((member) => member.userId === req.user.id);
	if (!isMember) {
		return res.status(403).json({ message: "Access denied" });
	}

	const parsedLimit = Number(req.query.limit);
	const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
		? Math.min(parsedLimit, 200)
		: 50;

	const messages = chatStore.messages
		.filter((message) => message.roomId === roomId)
		.slice(-limit);

	return res.status(200).json(messages);
}

async function sendRoomMessage(req, res) {
	const roomId = Number(req.params.roomId);
	const room = findRoomById(roomId);
	if (!room) {
		return res.status(404).json({ message: "Room not found" });
	}

	const isMember = room.members.some((member) => member.userId === req.user.id);
	if (!isMember) {
		return res.status(403).json({ message: "Access denied" });
	}

	const { content = "", replyTo = null, attachments = [] } = req.body || {};
	if (!String(content).trim() && (!Array.isArray(attachments) || attachments.length === 0)) {
		return res.status(400).json({ message: "Message content or attachments are required" });
	}

	const message = {
		id: createMessageId(),
		roomId,
		userId: req.user.id,
		userName: req.user.username,
		content: String(content || ""),
		replyTo: replyTo || null,
		attachments: Array.isArray(attachments) ? attachments : [],
		edited: false,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	chatStore.messages.push(message);
	return res.status(201).json(message);
}

async function editMessage(req, res) {
	const message = findMessageById(req.params.messageId);
	if (!message) {
		return res.status(404).json({ message: "Message not found" });
	}

	if (message.userId !== req.user.id) {
		return res.status(403).json({ message: "Only message author can edit this message" });
	}

	const { content } = req.body || {};
	if (!String(content || "").trim()) {
		return res.status(400).json({ message: "Message content is required" });
	}

	message.content = String(content);
	message.edited = true;
	message.updatedAt = new Date().toISOString();

	return res.status(200).json(message);
}

async function deleteMessage(req, res) {
	const messageId = Number(req.params.messageId);
	const index = chatStore.messages.findIndex((message) => message.id === messageId);
	if (index === -1) {
		return res.status(404).json({ message: "Message not found" });
	}

	if (chatStore.messages[index].userId !== req.user.id) {
		return res.status(403).json({ message: "Only message author can delete this message" });
	}

	chatStore.messages.splice(index, 1);
	return res.status(200).json({ message: "Message deleted" });
}

module.exports = {
	getRoomMessages,
	sendRoomMessage,
	editMessage,
	deleteMessage,
};
