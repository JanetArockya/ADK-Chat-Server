const {
	deleteSession,
	getUserSessions,
	revokeAllUserSessions,
} = require("../utils/authStore");

async function getSessions(req, res) {
	const sessions = getUserSessions(req.user.id);
	return res.status(200).json(sessions);
}

async function revokeAllSessions(req, res) {
	revokeAllUserSessions(req.user.id, req.token);
	return res.status(200).json({ message: "All other sessions revoked" });
}

async function revokeSession(req, res) {
	const sessions = getUserSessions(req.user.id);
	const sessionId = String(req.params.sessionId);
	const exists = sessions.some((session) => session.id === sessionId);
	if (!exists) {
		return res.status(404).json({ message: "Session not found" });
	}

	deleteSession(sessionId);
	return res.status(200).json({ message: "Session revoked" });
}

module.exports = {
	getSessions,
	revokeAllSessions,
	revokeSession,
};
