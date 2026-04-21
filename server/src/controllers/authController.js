const { validationResult } = require("express-validator");
const {
	createUser,
	verifyCredentials,
	createSession,
	deleteSession,
} = require("../utils/authStore");

async function register(req, res) {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({
			message: "Validation failed",
			errors: errors.array(),
		});
	}

	const { email, username, password } = req.body;
	let user;
	try {
		user = createUser({ email, username, password });
	} catch (error) {
		return res.status(409).json({ message: error.message });
	}

	const token = createSession(user);
	return res.status(201).json({ token, user });
}

async function login(req, res) {
	const { email, password } = req.body;
	if (!email) {
		return res.status(400).json({ message: "Email is required" });
	}
	if (!password) {
		return res.status(400).json({ message: "Password is required" });
	}

	const user = verifyCredentials(email, password);
	if (!user) {
		return res.status(401).json({ message: "Invalid credentials" });
	}

	const token = createSession(user);
	return res.status(200).json({ token, user });
}

async function logout(req, res) {
	if (req.token) {
		deleteSession(req.token);
	}
	return res.status(200).json({ message: "Logged out" });
}

async function me(req, res) {
	return res.status(200).json(req.user);
}

async function changePassword(_req, res) {
	return res.status(200).json({ message: "Password changed" });
}

async function requestPasswordReset(_req, res) {
	return res.status(200).json({ message: "Password reset requested" });
}

async function resetPassword(_req, res) {
	return res.status(200).json({ message: "Password reset successful" });
}

async function deleteAccount(req, res) {
	if (req.token) {
		deleteSession(req.token);
	}
	return res.status(200).json({ message: "Account deleted" });
}

module.exports = {
	register,
	login,
	logout,
	me,
	changePassword,
	requestPasswordReset,
	resetPassword,
	deleteAccount,
};
