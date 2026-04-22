const { searchUsers, getUserById } = require('../utils/authStore');

async function searchUsersHandler(req, res) {
  const query = req.query.q || req.query.search || '';
  const users = await searchUsers(query, req.user.id);
  return res.status(200).json(users);
}

async function getUser(req, res) {
  const user = await getUserById(req.params.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.status(200).json(user);
}

module.exports = { searchUsers: searchUsersHandler, getUser };
