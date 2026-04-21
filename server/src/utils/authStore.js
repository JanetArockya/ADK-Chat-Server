const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");

const sessions = new Map();
const usersById = new Map();
const usersByEmail = new Map();
const usersByUsername = new Map();
const dataDir = path.join(__dirname, "..", "..", "data");
const storePath = path.join(dataDir, "auth-store.json");
let userIdCounter = 1;

function loadStore() {
  try {
    if (!fs.existsSync(storePath)) {
      return [];
    }

    const raw = fs.readFileSync(storePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.users) ? parsed.users : [];
  } catch (_error) {
    return [];
  }
}

function persistUsers() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const users = [...usersById.values()];
  fs.writeFileSync(
    storePath,
    JSON.stringify({ users }, null, 2),
    "utf8"
  );
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
  };
}

function hydrateUsers() {
  const users = loadStore();

  for (const user of users) {
    usersById.set(user.id, user);
    usersByEmail.set(normalizeEmail(user.email), user.id);
    usersByUsername.set(normalizeUsername(user.username), user.id);
    userIdCounter = Math.max(userIdCounter, Number(user.id) + 1);
  }
}

hydrateUsers();

function getStoredUserByEmail(email) {
  const id = usersByEmail.get(normalizeEmail(email));
  return id ? usersById.get(id) : null;
}

function createUser({ email, username, password }) {
  const emailKey = normalizeEmail(email);
  const usernameKey = normalizeUsername(username);

  if (!emailKey || !usernameKey || !String(password || "").trim()) {
    throw new Error("Email, username, and password are required");
  }

  if (usersByEmail.has(emailKey)) {
    throw new Error("Email already in use");
  }

  if (usersByUsername.has(usernameKey)) {
    throw new Error("Username already in use");
  }

  const user = {
    id: userIdCounter++,
    email: emailKey,
    username: String(username).trim(),
    passwordHash: bcrypt.hashSync(String(password), 10),
    createdAt: new Date().toISOString(),
  };

  usersById.set(user.id, user);
  usersByEmail.set(emailKey, user.id);
  usersByUsername.set(usernameKey, user.id);
  persistUsers();

  return publicUser(user);
}

function getUserById(id) {
  const user = usersById.get(Number(id));
  return user ? publicUser(user) : null;
}

function getUserByEmail(email) {
  const user = getStoredUserByEmail(email);
  return user ? publicUser(user) : null;
}

function verifyCredentials(email, password) {
  const user = getStoredUserByEmail(email);
  if (!user) {
    return null;
  }

  const matches = bcrypt.compareSync(String(password || ""), user.passwordHash);
  return matches ? publicUser(user) : null;
}

function getUserByUsername(username) {
  const id = usersByUsername.get(normalizeUsername(username));
  return id ? getUserById(id) : null;
}

function updateUser(userId, { username }) {
  const id = Number(userId);
  const user = usersById.get(id);
  if (!user) {
    return null;
  }

  if (typeof username === "string" && username.trim()) {
    const usernameKey = normalizeUsername(username);
    const existingId = usersByUsername.get(usernameKey);
    if (existingId && existingId !== id) {
      throw new Error("Username already in use");
    }

    usersByUsername.delete(normalizeUsername(user.username));
    user.username = username.trim();
    usersByUsername.set(usernameKey, id);
    persistUsers();
  }

  return publicUser(user);
}

function searchUsers(query, excludeUserId) {
  const q = String(query || "").trim().toLowerCase();
  const excludedId = Number(excludeUserId);
  const users = [...usersById.values()]
    .filter((user) => user.id !== excludedId)
    .filter((user) => {
      if (!q) return true;
      return (
        user.username.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
      );
    })
    .slice(0, 50)
    .map(publicUser);

  return users;
}

function createSession(user) {
  const token = `dev_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  sessions.set(token, {
    user: publicUser(user),
    createdAt: new Date().toISOString(),
  });
  return token;
}

function getSession(token) {
  const session = sessions.get(token);
  return session ? session.user : null;
}

function deleteSession(token) {
  sessions.delete(token);
}

function getUserSessions(userId) {
  const id = Number(userId);
  return [...sessions.entries()]
    .filter(([, session]) => session.user.id === id)
    .map(([token, session]) => ({
      id: token,
      token,
      userId: session.user.id,
      lastActive: session.createdAt,
      browser: "Unknown Browser",
      ipAddress: "127.0.0.1",
    }));
}

function revokeAllUserSessions(userId, keepToken) {
  const id = Number(userId);
  for (const [token, session] of sessions.entries()) {
    if (session.user.id === id && token !== keepToken) {
      sessions.delete(token);
    }
  }
}

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  verifyCredentials,
  getUserByUsername,
  updateUser,
  searchUsers,
  createSession,
  getSession,
  deleteSession,
  getUserSessions,
  revokeAllUserSessions,
};
