const prisma = require('../utils/prisma');
const { getUserByUsername } = require('../utils/authStore');
const { getIO } = require('../utils/socketIO');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');

function roomPayload(room) {
  return {
    id: room.id,
    name: room.name,
    description: room.description,
    visibility: room.visibility,
    ownerId: room.ownerId,
    memberCount: room._count?.members ?? room.members?.length ?? 0,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

function isRoomAdmin(membership) {
  return membership && (membership.role === 'owner' || membership.role === 'admin');
}

async function getMembership(roomId, userId) {
  return prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
}

async function createRoom(req, res) {
  const { name, description = '', visibility = 'public' } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'Room name is required' });
  }
  if (!['public', 'private'].includes(visibility)) {
    return res.status(400).json({ message: 'Visibility must be public or private' });
  }
  try {
    const room = await prisma.room.create({
      data: {
        name: name.trim(),
        description: String(description || ''),
        visibility,
        ownerId: req.user.id,
        members: { create: { userId: req.user.id, role: 'owner' } },
      },
      include: { _count: { select: { members: true } } },
    });
    return res.status(201).json(roomPayload(room));
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Room name already taken' });
    throw err;
  }
}

async function getMyRooms(req, res) {
  const rooms = await prisma.room.findMany({
    where: { members: { some: { userId: req.user.id } } },
    include: { _count: { select: { members: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  return res.status(200).json(rooms.map(roomPayload));
}

async function getPublicRooms(req, res) {
  const search = String(req.query.search || req.query.q || '').trim();
  const rooms = await prisma.room.findMany({
    where: {
      visibility: 'public',
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    include: { _count: { select: { members: true } } },
    orderBy: { name: 'asc' },
  });
  return res.status(200).json(rooms.map(roomPayload));
}

async function getRoom(req, res) {
  const room = await prisma.room.findUnique({
    where: { id: Number(req.params.roomId) },
    include: { _count: { select: { members: true } } },
  });
  if (!room) return res.status(404).json({ message: 'Room not found' });
  return res.status(200).json(roomPayload(room));
}

async function updateRoom(req, res) {
  const roomId = Number(req.params.roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (room.ownerId !== req.user.id) return res.status(403).json({ message: 'Only room owner can update room' });

  const { name, description, visibility } = req.body || {};
  const data = {};
  if (typeof name === 'string' && name.trim()) data.name = name.trim();
  if (typeof description === 'string') data.description = description;
  if (['public', 'private'].includes(visibility)) data.visibility = visibility;

  try {
    const updated = await prisma.room.update({
      where: { id: roomId },
      data,
      include: { _count: { select: { members: true } } },
    });
    return res.status(200).json(roomPayload(updated));
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Room name already taken' });
    throw err;
  }
}

async function deleteRoom(req, res) {
  const roomId = Number(req.params.roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (room.ownerId !== req.user.id) return res.status(403).json({ message: 'Only room owner can delete room' });

  // Delete physical files
  const attachments = await prisma.attachment.findMany({ where: { roomId }, select: { storedName: true } });
  for (const att of attachments) {
    fs.unlink(path.join(UPLOAD_DIR, att.storedName), () => {});
  }

  await prisma.room.delete({ where: { id: roomId } });
  return res.status(200).json({ message: 'Room deleted' });
}

async function joinRoom(req, res) {
  const roomId = Number(req.params.roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { _count: { select: { members: true } } } });
  if (!room) return res.status(404).json({ message: 'Room not found' });

  const existing = await getMembership(roomId, req.user.id);
  if (existing) return res.status(200).json(roomPayload(room));

  // Check not banned
  const ban = await prisma.roomBan.findUnique({ where: { roomId_userId: { roomId, userId: req.user.id } } });
  if (ban) return res.status(403).json({ message: 'You are banned from this room' });

  if (room.visibility === 'private') {
    const invite = await prisma.roomInvitation.findUnique({
      where: { roomId_userId: { roomId, userId: req.user.id } },
    });
    if (!invite || invite.status !== 'pending') {
      return res.status(403).json({ message: 'Cannot join private room without an invitation' });
    }
    await prisma.roomInvitation.update({ where: { roomId_userId: { roomId, userId: req.user.id } }, data: { status: 'accepted' } });
  }

  await prisma.roomMember.create({ data: { roomId, userId: req.user.id, role: 'member' } });
  const updated = await prisma.room.findUnique({ where: { id: roomId }, include: { _count: { select: { members: true } } } });
  return res.status(200).json(roomPayload(updated));
}

async function leaveRoom(req, res) {
  const roomId = Number(req.params.roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (room.ownerId === req.user.id) return res.status(400).json({ message: 'Room owner cannot leave the room' });

  const existing = await getMembership(roomId, req.user.id);
  if (!existing) return res.status(404).json({ message: 'You are not a member of this room' });

  await prisma.roomMember.delete({ where: { roomId_userId: { roomId, userId: req.user.id } } });
  return res.status(200).json({ message: 'Left room successfully' });
}

async function getMembers(req, res) {
  const roomId = Number(req.params.roomId);
  const myMembership = await getMembership(roomId, req.user.id);
  if (!myMembership) return res.status(403).json({ message: 'Access denied' });

  const members = await prisma.roomMember.findMany({
    where: { roomId },
    include: { user: { select: { id: true, username: true, email: true } } },
    orderBy: [{ role: 'asc' }, { id: 'asc' }],
  });

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { ownerId: true } });

  return res.status(200).json(
    members.map((m) => ({
      id: m.userId,
      userId: m.userId,
      username: m.user.username,
      email: m.user.email,
      role: m.role,
      isAdmin: m.role === 'owner' || m.role === 'admin',
      isOwner: m.userId === room.ownerId,
    }))
  );
}

async function removeMember(req, res) {
  const roomId = Number(req.params.roomId);
  const targetUserId = Number(req.params.userId);

  const myMembership = await getMembership(roomId, req.user.id);
  if (!isRoomAdmin(myMembership)) return res.status(403).json({ message: 'Admin access required' });

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (targetUserId === room.ownerId) return res.status(400).json({ message: 'Cannot remove the room owner' });

  const targetMembership = await getMembership(roomId, targetUserId);
  if (!targetMembership) return res.status(404).json({ message: 'User is not a member' });

  // Removing = ban (per requirements)
  await prisma.roomMember.delete({ where: { roomId_userId: { roomId, userId: targetUserId } } });
  await prisma.roomBan.upsert({
    where: { roomId_userId: { roomId, userId: targetUserId } },
    update: {},
    create: { roomId, userId: targetUserId, bannedById: req.user.id },
  });

  getIO().to(`user:${targetUserId}`).emit('room:banned', { roomId });
  return res.status(200).json({ message: 'Member removed and banned' });
}

async function banUser(req, res) {
  const roomId = Number(req.params.roomId);
  const targetUserId = Number(req.params.userId);

  const myMembership = await getMembership(roomId, req.user.id);
  if (!isRoomAdmin(myMembership)) return res.status(403).json({ message: 'Admin access required' });

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (targetUserId === room.ownerId) return res.status(400).json({ message: 'Cannot ban the room owner' });

  // Remove from members if present
  await prisma.roomMember.deleteMany({ where: { roomId, userId: targetUserId } });

  await prisma.roomBan.upsert({
    where: { roomId_userId: { roomId, userId: targetUserId } },
    update: { bannedById: req.user.id },
    create: { roomId, userId: targetUserId, bannedById: req.user.id },
  });

  getIO().to(`user:${targetUserId}`).emit('room:banned', { roomId });
  return res.status(200).json({ message: 'User banned from room' });
}

async function unbanUser(req, res) {
  const roomId = Number(req.params.roomId);
  const targetUserId = Number(req.params.userId);

  const myMembership = await getMembership(roomId, req.user.id);
  if (!isRoomAdmin(myMembership)) return res.status(403).json({ message: 'Admin access required' });

  await prisma.roomBan.deleteMany({ where: { roomId, userId: targetUserId } });
  return res.status(200).json({ message: 'User unbanned' });
}

async function getBannedUsers(req, res) {
  const roomId = Number(req.params.roomId);
  const myMembership = await getMembership(roomId, req.user.id);
  if (!isRoomAdmin(myMembership)) return res.status(403).json({ message: 'Admin access required' });

  const bans = await prisma.roomBan.findMany({
    where: { roomId },
    include: {
      user: { select: { id: true, username: true } },
      bannedBy: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.status(200).json(
    bans.map((b) => ({
      userId: b.userId,
      userName: b.user.username,
      bannedBy: b.bannedBy.username,
      bannedById: b.bannedById,
      createdAt: b.createdAt,
    }))
  );
}

async function addAdmin(req, res) {
  const roomId = Number(req.params.roomId);
  const targetUserId = Number(req.params.userId);

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (room.ownerId !== req.user.id) return res.status(403).json({ message: 'Only owner can promote admins' });

  const targetMembership = await getMembership(roomId, targetUserId);
  if (!targetMembership) return res.status(404).json({ message: 'User is not a member' });
  if (targetMembership.role === 'owner') return res.status(400).json({ message: 'User is already the owner' });

  await prisma.roomMember.update({
    where: { roomId_userId: { roomId, userId: targetUserId } },
    data: { role: 'admin' },
  });
  return res.status(200).json({ message: 'User promoted to admin' });
}

async function removeAdmin(req, res) {
  const roomId = Number(req.params.roomId);
  const targetUserId = Number(req.params.userId);

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (room.ownerId !== req.user.id) return res.status(403).json({ message: 'Only owner can demote admins' });
  if (targetUserId === room.ownerId) return res.status(400).json({ message: 'Cannot remove admin from owner' });

  const targetMembership = await getMembership(roomId, targetUserId);
  if (!targetMembership) return res.status(404).json({ message: 'User is not a member' });

  await prisma.roomMember.update({
    where: { roomId_userId: { roomId, userId: targetUserId } },
    data: { role: 'member' },
  });
  return res.status(200).json({ message: 'Admin removed' });
}

async function inviteUser(req, res) {
  const roomId = Number(req.params.roomId);
  const { username } = req.body || {};

  const myMembership = await getMembership(roomId, req.user.id);
  if (!myMembership) return res.status(403).json({ message: 'You must be a member to invite users' });

  const targetUser = await getUserByUsername(username);
  if (!targetUser) return res.status(404).json({ message: 'User not found' });

  // Check not already a member
  const existing = await getMembership(roomId, targetUser.id);
  if (existing) return res.status(409).json({ message: 'User is already a member' });

  // Check not banned
  const ban = await prisma.roomBan.findUnique({ where: { roomId_userId: { roomId, userId: targetUser.id } } });
  if (ban) return res.status(403).json({ message: 'User is banned from this room' });

  await prisma.roomInvitation.upsert({
    where: { roomId_userId: { roomId, userId: targetUser.id } },
    update: { status: 'pending', invitedById: req.user.id },
    create: { roomId, userId: targetUser.id, invitedById: req.user.id },
  });

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { name: true } });
  getIO().to(`user:${targetUser.id}`).emit('room:invited', { roomId, roomName: room.name, invitedBy: req.user.username });
  return res.status(201).json({ message: 'Invitation sent' });
}

async function acceptInvite(req, res) {
  const roomId = Number(req.params.roomId);
  const userId = req.user.id;

  const invite = await prisma.roomInvitation.findUnique({ where: { roomId_userId: { roomId, userId } } });
  if (!invite || invite.status !== 'pending') return res.status(404).json({ message: 'Invitation not found' });

  // Check not banned
  const ban = await prisma.roomBan.findUnique({ where: { roomId_userId: { roomId, userId } } });
  if (ban) return res.status(403).json({ message: 'You are banned from this room' });

  await prisma.roomInvitation.update({ where: { roomId_userId: { roomId, userId } }, data: { status: 'accepted' } });

  const existing = await getMembership(roomId, userId);
  if (!existing) {
    await prisma.roomMember.create({ data: { roomId, userId, role: 'member' } });
  }

  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { _count: { select: { members: true } } } });
  return res.status(200).json(roomPayload(room));
}

async function getMyInvitations(req, res) {
  const invitations = await prisma.roomInvitation.findMany({
    where: { userId: req.user.id, status: 'pending' },
    include: {
      room: { select: { id: true, name: true, description: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.status(200).json(invitations.map((inv) => ({
    id: inv.id,
    roomId: inv.roomId,
    roomName: inv.room.name,
    roomDescription: inv.room.description,
    createdAt: inv.createdAt,
  })));
}

async function markRoomRead(req, res) {
  const roomId = Number(req.params.roomId);
  const userId = req.user.id;

  await prisma.roomUnread.upsert({
    where: { userId_roomId: { userId, roomId } },
    update: { count: 0 },
    create: { userId, roomId, count: 0 },
  });

  getIO().to(`user:${userId}`).emit('unread:update', { roomId, count: 0 });
  return res.status(200).json({ message: 'Marked as read' });
}

module.exports = {
  getPublicRooms,
  getMyRooms,
  getMyInvitations,
  createRoom,
  getRoom,
  updateRoom,
  deleteRoom,
  joinRoom,
  leaveRoom,
  getMembers,
  removeMember,
  banUser,
  unbanUser,
  getBannedUsers,
  addAdmin,
  removeAdmin,
  inviteUser,
  acceptInvite,
  markRoomRead,
};
