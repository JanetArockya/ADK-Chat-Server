const { getUserById, getUserByUsername } = require("../utils/authStore");

const friendships = [];
const friendRequests = [];
const bans = [];
let friendshipIdCounter = 1;
let requestIdCounter = 1;

function normalizedPair(a, b) {
	const [x, y] = [Number(a), Number(b)].sort((m, n) => m - n);
	return `${x}:${y}`;
}

function areFriends(a, b) {
	const key = normalizedPair(a, b);
	return friendships.some((friendship) => friendship.key === key);
}

function isBanned(a, b) {
	return bans.some(
		(ban) =>
			(ban.blockerId === Number(a) && ban.blockedId === Number(b)) ||
			(ban.blockerId === Number(b) && ban.blockedId === Number(a))
	);
}

async function getFriends(req, res) {
	const userId = Number(req.user.id);
	const friends = friendships
		.filter((friendship) =>
			friendship.userIds.includes(userId)
		)
		.map((friendship) => {
			const friendId = friendship.userIds.find((id) => id !== userId);
			return getUserById(friendId);
		})
		.filter(Boolean);

	return res.status(200).json(friends);
}

async function getFriendRequests(req, res) {
	const userId = Number(req.user.id);
	const requests = friendRequests
		.filter((request) => request.receiverId === userId && request.status === "pending")
		.map((request) => {
			const sender = getUserById(request.senderId);
			return {
				id: request.id,
				senderId: request.senderId,
				senderName: sender ? sender.username : "Unknown",
				message: request.message,
				createdAt: request.createdAt,
			};
		});

	return res.status(200).json(requests);
}

async function getBannedUsers(req, res) {
	const userId = Number(req.user.id);
	const blocked = bans
		.filter((ban) => ban.blockerId === userId)
		.map((ban) => {
			const user = getUserById(ban.blockedId);
			return {
				userId: ban.blockedId,
				username: user ? user.username : "Unknown",
			};
		});

	return res.status(200).json(blocked);
}

async function sendFriendRequest(req, res) {
	const senderId = Number(req.user.id);
	const { username } = req.body || {};
	const recipient = getUserByUsername(username);

	if (!recipient) {
		return res.status(404).json({ message: "User not found" });
	}

	if (recipient.id === senderId) {
		return res.status(400).json({ message: "Cannot send request to yourself" });
	}

	if (isBanned(senderId, recipient.id)) {
		return res.status(403).json({ message: "Cannot send request due to a ban" });
	}

	if (areFriends(senderId, recipient.id)) {
		return res.status(409).json({ message: "Already friends" });
	}

	const existingPending = friendRequests.find(
		(request) =>
			request.status === "pending" &&
			((request.senderId === senderId && request.receiverId === recipient.id) ||
				(request.senderId === recipient.id && request.receiverId === senderId))
	);

	if (existingPending) {
		return res.status(409).json({ message: "Friend request already pending" });
	}

	const request = {
		id: requestIdCounter++,
		senderId,
		receiverId: recipient.id,
		message: String(req.body?.message || ""),
		status: "pending",
		createdAt: new Date().toISOString(),
	};

	friendRequests.push(request);
	return res.status(201).json({ message: "Friend request sent", requestId: request.id });
}

async function acceptFriendRequest(req, res) {
	const userId = Number(req.user.id);
	const requestId = Number(req.params.requestId);
	const request = friendRequests.find((r) => r.id === requestId);

	if (!request || request.receiverId !== userId || request.status !== "pending") {
		return res.status(404).json({ message: "Friend request not found" });
	}

	request.status = "accepted";
	const key = normalizedPair(request.senderId, request.receiverId);
	if (!friendships.some((friendship) => friendship.key === key)) {
		friendships.push({
			id: friendshipIdCounter++,
			key,
			userIds: [request.senderId, request.receiverId],
			createdAt: new Date().toISOString(),
		});
	}

	return res.status(200).json({ message: "Friend request accepted" });
}

async function rejectFriendRequest(req, res) {
	const userId = Number(req.user.id);
	const requestId = Number(req.params.requestId);
	const request = friendRequests.find((r) => r.id === requestId);

	if (!request || request.receiverId !== userId || request.status !== "pending") {
		return res.status(404).json({ message: "Friend request not found" });
	}

	request.status = "rejected";
	return res.status(200).json({ message: "Friend request rejected" });
}

async function removeFriend(req, res) {
	const userId = Number(req.user.id);
	const friendId = Number(req.params.friendId);
	const key = normalizedPair(userId, friendId);
	const index = friendships.findIndex((friendship) => friendship.key === key);

	if (index === -1) {
		return res.status(404).json({ message: "Friend not found" });
	}

	friendships.splice(index, 1);
	return res.status(200).json({ message: "Friend removed" });
}

async function banUser(req, res) {
	const blockerId = Number(req.user.id);
	const blockedId = Number(req.params.userId);

	if (!getUserById(blockedId)) {
		return res.status(404).json({ message: "User not found" });
	}

	if (blockedId === blockerId) {
		return res.status(400).json({ message: "Cannot ban yourself" });
	}

	if (!bans.some((ban) => ban.blockerId === blockerId && ban.blockedId === blockedId)) {
		bans.push({ blockerId, blockedId, createdAt: new Date().toISOString() });
	}

	const key = normalizedPair(blockerId, blockedId);
	const friendshipIndex = friendships.findIndex((friendship) => friendship.key === key);
	if (friendshipIndex !== -1) {
		friendships.splice(friendshipIndex, 1);
	}

	return res.status(200).json({ message: "User banned" });
}

async function unbanUser(req, res) {
	const blockerId = Number(req.user.id);
	const blockedId = Number(req.params.userId);
	const index = bans.findIndex(
		(ban) => ban.blockerId === blockerId && ban.blockedId === blockedId
	);

	if (index === -1) {
		return res.status(404).json({ message: "Ban not found" });
	}

	bans.splice(index, 1);
	return res.status(200).json({ message: "User unbanned" });
}

module.exports = {
	getFriends,
	getFriendRequests,
	getBannedUsers,
	sendFriendRequest,
	acceptFriendRequest,
	rejectFriendRequest,
	removeFriend,
	banUser,
	unbanUser,
};
