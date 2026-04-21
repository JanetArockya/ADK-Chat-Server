const { getSession } = require("../utils/authStore");

function authenticate(req, res, next) {
	const authHeader = req.headers.authorization || "";
	const token = authHeader.startsWith("Bearer ")
		? authHeader.slice(7)
		: null;

	if (!token) {
		return res.status(401).json({ message: "Authentication required" });
	}

	const user = getSession(token);
	if (!user) {
		return res.status(401).json({ message: "Invalid or expired session" });
	}

	req.user = user;
	req.token = token;
	return next();
}

module.exports = { authenticate };
