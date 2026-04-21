const { chatStore, createRoomId } = require("../utils/chatStore");

function notImplemented(name) {
	return (_req, res) =>
		res.status(501).json({ message: `${name} is not implemented yet` });
}

function findRoomById(roomId) {
	return chatStore.rooms.find((room) => room.id === Number(roomId));
}

async function createRoom(req, res) {
	const { name, description = "", visibility = "public" } = req.body || {};

	if (!name || typeof name !== "string" || !name.trim()) {
		return res.status(400).json({ message: "Room name is required" });
	}

	if (!["public", "private"].includes(visibility)) {
		return res.status(400).json({ message: "Visibility must be public or private" });
	}

	const now = new Date().toISOString();
	const room = {
		id: createRoomId(),
		name: name.trim(),
		description: String(description || ""),
		visibility,
		ownerId: req.user.id,
		memberCount: 1,
		members: [{ userId: req.user.id, role: "owner" }],
		createdAt: now,
		updatedAt: now,
	};

	chatStore.rooms.push(room);
	return res.status(201).json(room);
}

async function getMyRooms(req, res) {
	const myRooms = chatStore.rooms.filter((room) =>
		room.members.some((member) => member.userId === req.user.id)
	);
	return res.status(200).json(myRooms);
}

async function getPublicRooms(req, res) {
	const publicRooms = chatStore.rooms.filter((room) => room.visibility === "public");
	return res.status(200).json(publicRooms);
}

async function getRoom(req, res) {
	const room = findRoomById(req.params.roomId);
	if (!room) {
		return res.status(404).json({ message: "Room not found" });
	}
	return res.status(200).json(room);
}

async function updateRoom(req, res) {
	const room = findRoomById(req.params.roomId);
	if (!room) {
		return res.status(404).json({ message: "Room not found" });
	}

	if (room.ownerId !== req.user.id) {
		return res.status(403).json({ message: "Only room owner can update room" });
	}

	const { name, description, visibility } = req.body || {};
	if (typeof name === "string" && name.trim()) {
		room.name = name.trim();
	}
	if (typeof description === "string") {
		room.description = description;
	}
	if (["public", "private"].includes(visibility)) {
		room.visibility = visibility;
	}
	room.updatedAt = new Date().toISOString();

	return res.status(200).json(room);
}

async function deleteRoom(req, res) {
	const roomIndex = chatStore.rooms.findIndex((room) => room.id === Number(req.params.roomId));
	if (roomIndex === -1) {
		return res.status(404).json({ message: "Room not found" });
	}

	if (chatStore.rooms[roomIndex].ownerId !== req.user.id) {
		return res.status(403).json({ message: "Only room owner can delete room" });
	}

	chatStore.rooms.splice(roomIndex, 1);
	return res.status(200).json({ message: "Room deleted" });
}

async function joinRoom(req, res) {
	const room = findRoomById(req.params.roomId);
	if (!room) {
		return res.status(404).json({ message: "Room not found" });
	}

	const alreadyMember = room.members.some(
		(member) => member.userId === req.user.id
	);

	if (alreadyMember) {
		return res.status(200).json(room);
	}

	if (room.visibility === "private") {
		return res.status(403).json({
			message: "Cannot join private room without an invitation",
		});
	}

	room.members.push({ userId: req.user.id, role: "member" });
	room.memberCount = room.members.length;
	room.updatedAt = new Date().toISOString();

	return res.status(200).json(room);
}

async function leaveRoom(req, res) {
	const room = findRoomById(req.params.roomId);
	if (!room) {
		return res.status(404).json({ message: "Room not found" });
	}

	if (room.ownerId === req.user.id) {
		return res.status(400).json({
			message: "Room owner cannot leave the room",
		});
	}

	const initialLength = room.members.length;
	room.members = room.members.filter((member) => member.userId !== req.user.id);

	if (room.members.length === initialLength) {
		return res.status(404).json({ message: "You are not a member of this room" });
	}

	room.memberCount = room.members.length;
	room.updatedAt = new Date().toISOString();

	return res.status(200).json({ message: "Left room successfully" });
}

async function getMembers(req, res) {
	const room = findRoomById(req.params.roomId);
	if (!room) {
		return res.status(404).json({ message: "Room not found" });
	}

	const isMember = room.members.some((member) => member.userId === req.user.id);
	if (!isMember) {
		return res.status(403).json({ message: "Access denied" });
	}

	const members = room.members.map((member) => ({
		id: member.userId,
		userId: member.userId,
		role: member.role,
		isAdmin: member.role === "owner" || member.role === "admin",
	}));

	return res.status(200).json(members);
}

module.exports = {
	getPublicRooms,
	getMyRooms,
	getMyInvitations: notImplemented("getMyInvitations"),
	createRoom,
	getRoom,
	updateRoom,
	deleteRoom,
	joinRoom,
	leaveRoom,
	getMembers,
	removeMember: notImplemented("removeMember"),
	banUser: notImplemented("banUser"),
	unbanUser: notImplemented("unbanUser"),
	getBannedUsers: notImplemented("getBannedUsers"),
	addAdmin: notImplemented("addAdmin"),
	removeAdmin: notImplemented("removeAdmin"),
	inviteUser: notImplemented("inviteUser"),
	acceptInvite: notImplemented("acceptInvite"),
};
