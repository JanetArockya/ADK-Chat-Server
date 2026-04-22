const bcrypt = require('bcrypt');
const prisma = require('./prisma');

function publicUser(user) {
  return { id: user.id, email: user.email, username: user.username };
}

async function createUser({ email, username, password }) {
  const emailKey = String(email).trim().toLowerCase();
  const usernameKey = String(username).trim();
  if (!emailKey || !usernameKey || !String(password || '').trim()) {
    throw new Error('Email, username, and password are required');
  }
  try {
    const user = await prisma.user.create({
      data: {
        email: emailKey,
        username: usernameKey,
        passwordHash: await bcrypt.hash(String(password), 10),
      },
    });
    return publicUser(user);
  } catch (err) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.join?.(',')?.includes('email') ? 'Email' : 'Username';
      throw new Error(`${field} already in use`);
    }
    throw err;
  }
}

async function getUserById(id) {
  const user = await prisma.user.findUnique({ where: { id: Number(id) } });
  return user ? publicUser(user) : null;
}

async function getUserByEmail(email) {
  const user = await prisma.user.findUnique({
    where: { email: String(email).trim().toLowerCase() },
  });
  return user ? publicUser(user) : null;
}

async function getUserByUsername(username) {
  const user = await prisma.user.findUnique({
    where: { username: String(username).trim() },
  });
  return user ? publicUser(user) : null;
}

async function verifyCredentials(email, password) {
  const user = await prisma.user.findUnique({
    where: { email: String(email).trim().toLowerCase() },
  });
  if (!user) return null;
  const matches = await bcrypt.compare(String(password || ''), user.passwordHash);
  return matches ? publicUser(user) : null;
}

async function updatePassword(userId, oldPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
  if (!user) throw new Error('User not found');
  const matches = await bcrypt.compare(String(oldPassword || ''), user.passwordHash);
  if (!matches) throw new Error('Current password is incorrect');
  await prisma.user.update({
    where: { id: Number(userId) },
    data: { passwordHash: await bcrypt.hash(String(newPassword), 10) },
  });
}

async function deleteUser(userId) {
  await prisma.user.delete({ where: { id: Number(userId) } });
}

async function searchUsers(query, excludeUserId) {
  const q = String(query || '').trim();
  const users = await prisma.user.findMany({
    where: {
      id: { not: Number(excludeUserId) },
      ...(q
        ? {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    take: 50,
  });
  return users.map(publicUser);
}

async function createSession(user, ipAddress, userAgent) {
  const session = await prisma.session.create({
    data: {
      userId: Number(user.id),
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
    },
  });
  return session.id;
}

async function getSession(token) {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: true },
  });
  if (!session) return null;
  // Update lastActive
  await prisma.session.update({
    where: { id: token },
    data: { lastActive: new Date() },
  }).catch(() => {});
  return publicUser(session.user);
}

async function deleteSession(token) {
  await prisma.session.delete({ where: { id: token } }).catch(() => {});
}

async function getUserSessions(userId) {
  const sessions = await prisma.session.findMany({
    where: { userId: Number(userId) },
    orderBy: { createdAt: 'desc' },
  });
  return sessions.map((s) => ({
    id: s.id,
    userId: s.userId,
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    createdAt: s.createdAt,
    lastActive: s.lastActive,
  }));
}

async function revokeAllUserSessions(userId, keepToken) {
  await prisma.session.deleteMany({
    where: { userId: Number(userId), id: { not: keepToken } },
  });
}

async function createPasswordResetToken(email) {
  const user = await prisma.user.findUnique({
    where: { email: String(email).trim().toLowerCase() },
  });
  if (!user) return null;
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const token = await prisma.passwordResetToken.create({
    data: { userId: user.id, expiresAt },
  });
  return { token: token.id, userId: user.id };
}

async function resetPasswordWithToken(token, newPassword) {
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { id: token } });
  if (!resetToken || resetToken.expiresAt < new Date()) {
    throw new Error('Invalid or expired reset token');
  }
  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { passwordHash: await bcrypt.hash(String(newPassword), 10) },
  });
  await prisma.passwordResetToken.delete({ where: { id: token } });
}

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  getUserByUsername,
  verifyCredentials,
  updatePassword,
  deleteUser,
  searchUsers,
  createSession,
  getSession,
  deleteSession,
  getUserSessions,
  revokeAllUserSessions,
  createPasswordResetToken,
  resetPasswordWithToken,
};
