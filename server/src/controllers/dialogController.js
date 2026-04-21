const { getUserById } = require("../utils/authStore");
const { getIO } = require("../utils/socketIO");

const dialogs = [];
const messages = [];
let dialogIdCounter = 1;
let messageIdCounter = 1;

function getDialogKey(userA, userB) {
	const [a, b] = [Number(userA), Number(userB)].sort((x, y) => x - y);
	return `${a}:${b}`;
}

function findDialogByUsers(userA, userB) {
	const key = getDialogKey(userA, userB);
	return dialogs.find((dialog) => dialog.key === key) || null;
}

function ensureDialog(userA, userB) {
	let dialog = findDialogByUsers(userA, userB);
	if (!dialog) {
		dialog = {
			id: dialogIdCounter++,
			key: getDialogKey(userA, userB),
			participantIds: [Number(userA), Number(userB)],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		dialogs.push(dialog);
	}
	return dialog;
}

function toDialogPayload(dialog, currentUserId) {
	const participantId = dialog.participantIds.find(
		(id) => id !== Number(currentUserId)
	);
	const participant = getUserById(participantId) || {
		id: participantId,
		username: `user${participantId}`,
		email: "unknown@example.com",
	};

	return {
		id: dialog.id,
		participantId,
		participant,
		updatedAt: dialog.updatedAt,
	};
}

function resolveDialog(req, res) {
	const currentUserId = Number(req.user.id);
	const rawId = Number(req.params.dialogId);

	let dialog = dialogs.find((d) => d.id === rawId);
	if (dialog) {
		if (!dialog.participantIds.includes(currentUserId)) {
			res.status(403).json({ message: "Access denied" });
			return null;
		}
		return dialog;
	}

	const possibleUser = getUserById(rawId);
	if (possibleUser && possibleUser.id !== currentUserId) {
		return ensureDialog(currentUserId, possibleUser.id);
	}

	res.status(404).json({ message: "Dialog not found" });
	return null;
}

async function getDialogs(req, res) {
	const currentUserId = Number(req.user.id);
	const result = dialogs
		.filter((dialog) => dialog.participantIds.includes(currentUserId))
		.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
		.map((dialog) => toDialogPayload(dialog, currentUserId));

	return res.status(200).json(result);
}

async function getDialog(req, res) {
	const currentUserId = Number(req.user.id);
	const otherUserId = Number(req.params.userId);
	if (!getUserById(otherUserId)) {
		return res.status(404).json({ message: "User not found" });
	}

	if (otherUserId === currentUserId) {
		return res.status(400).json({ message: "Cannot open dialog with yourself" });
	}

	const dialog = ensureDialog(currentUserId, otherUserId);
	return res.status(200).json(toDialogPayload(dialog, currentUserId));
}

async function getMessages(req, res) {
	const dialog = resolveDialog(req, res);
	if (!dialog) {
		return;
	}

	const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
	const dialogMessages = messages
		.filter((message) => message.dialogId === dialog.id)
		.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
		.slice(-limit)
		.map((message) => ({
			...message,
			userName: (getUserById(message.userId) || {}).username || "Unknown",
		}));

	return res.status(200).json(dialogMessages);
}

async function sendMessage(req, res) {
	const currentUserId = Number(req.user.id);
	const otherUserId = Number(req.params.userId);
	const content = String(req.body?.content || "").trim();

	if (!content) {
		return res.status(400).json({ message: "Message content is required" });
	}

	if (!getUserById(otherUserId)) {
		return res.status(404).json({ message: "Recipient not found" });
	}

	if (otherUserId === currentUserId) {
		return res.status(400).json({ message: "Cannot send message to yourself" });
	}

	const dialog = ensureDialog(currentUserId, otherUserId);
	const now = new Date().toISOString();
	const message = {
		id: messageIdCounter++,
		dialogId: dialog.id,
		userId: currentUserId,
		content,
		replyTo: req.body?.replyTo || null,
		attachments: req.body?.attachments || [],
		edited: false,
		createdAt: now,
		updatedAt: now,
	};

	messages.push(message);
	dialog.updatedAt = now;

	const io = getIO();
	io.to(`dialog:${dialog.id}`).emit("message:received", {
		...message,
		userName: req.user.username,
	});

	return res.status(201).json({
		...message,
		userName: req.user.username,
	});
}

module.exports = {
	getDialogs,
	getDialog,
	getMessages,
	sendMessage,
};
