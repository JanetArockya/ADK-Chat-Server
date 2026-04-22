const { validationResult } = require('express-validator');
const {
  createUser,
  verifyCredentials,
  createSession,
  deleteSession,
  updatePassword,
  deleteUser,
  createPasswordResetToken,
  resetPasswordWithToken,
} = require('../utils/authStore');
const prisma = require('../utils/prisma');
const path = require('path');
const fs = require('fs');

async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
  }

  const { email, username, password } = req.body;
  let user;
  try {
    user = await createUser({ email, username, password });
  } catch (error) {
    return res.status(409).json({ message: error.message });
  }

  const token = await createSession(
    user,
    req.ip || req.headers['x-forwarded-for'] || 'unknown',
    req.headers['user-agent'] || 'unknown'
  );
  return res.status(201).json({ token, user });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  if (!password) return res.status(400).json({ message: 'Password is required' });

  const user = await verifyCredentials(email, password);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const token = await createSession(
    user,
    req.ip || req.headers['x-forwarded-for'] || 'unknown',
    req.headers['user-agent'] || 'unknown'
  );
  return res.status(200).json({ token, user });
}

async function logout(req, res) {
  if (req.token) await deleteSession(req.token);
  return res.status(200).json({ message: 'Logged out' });
}

async function me(req, res) {
  return res.status(200).json(req.user);
}

async function changePassword(req, res) {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Old and new passwords are required' });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters' });
  }
  try {
    await updatePassword(req.user.id, oldPassword, newPassword);
    return res.status(200).json({ message: 'Password changed' });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

async function requestPasswordReset(req, res) {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: 'Email is required' });
  const result = await createPasswordResetToken(email);
  if (!result) {
    // Return success regardless to avoid user enumeration
    return res.status(200).json({ message: 'If the email exists, a reset token was generated' });
  }
  // In production this would be emailed; here we return it for demo purposes
  return res.status(200).json({ message: 'Reset token generated', token: result.token });
}

async function resetPassword(req, res) {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }
  try {
    await resetPasswordWithToken(token, newPassword);
    return res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

async function deleteAccount(req, res) {
  const userId = req.user.id;

  // Delete physical files for owned rooms
  const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
  const ownedRooms = await prisma.room.findMany({ where: { ownerId: userId }, select: { id: true } });
  for (const room of ownedRooms) {
    const attachments = await prisma.attachment.findMany({ where: { roomId: room.id }, select: { storedName: true } });
    for (const att of attachments) {
      const filePath = path.join(UPLOAD_DIR, att.storedName);
      fs.unlink(filePath, () => {});
    }
    await prisma.room.delete({ where: { id: room.id } });
  }

  // Delete user's own physical attachment files not in owned rooms
  const userAttachments = await prisma.attachment.findMany({
    where: { uploadedById: userId, roomId: null },
    select: { storedName: true },
  });
  for (const att of userAttachments) {
    const filePath = path.join(UPLOAD_DIR, att.storedName);
    fs.unlink(filePath, () => {});
  }

  await deleteUser(userId);
  return res.status(200).json({ message: 'Account deleted' });
}

module.exports = { register, login, logout, me, changePassword, requestPasswordReset, resetPassword, deleteAccount };
