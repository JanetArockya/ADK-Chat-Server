const {
	searchUsers: searchUsersInStore,
	getUserById,
	updateUser,
} = require("../utils/authStore");

async function searchUsers(req, res) {
	const query = req.query.q || req.query.search || "";
	const users = searchUsersInStore(query, req.user.id);
	return res.status(200).json(users);
}

async function getUser(req, res) {
	const user = getUserById(req.params.userId);
	if (!user) {
		return res.status(404).json({ message: "User not found" });
	}
	return res.status(200).json(user);
}

async function updateProfile(req, res) {
	try {
		const user = updateUser(req.user.id, { username: req.body?.username });
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		return res.status(200).json(user);
	} catch (error) {
		return res.status(409).json({ message: error.message });
	}
}

module.exports = {
	searchUsers,
	getUser,
	updateProfile,
};
