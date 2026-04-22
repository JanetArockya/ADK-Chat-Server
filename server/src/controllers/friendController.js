const prisma = require('../utils/prisma');
const { getUserByUsername, getUserById } = require('../utils/authStore');

function normalizedPair(a, b) {
  const [x, y] = [Number(a), Number(b)].sort((m, n) => m - n);
  return { user1Id: x, user2Id: y };
}

async function areFriends(a, b) {
  const { user1Id, user2Id } = normalizedPair(a, b);
  const f = await prisma.friendship.findUnique({ where: { user1Id_user2Id: { user1Id, user2Id } } });
  return !!f;
}

async function isBanned(a, b) {
  const count = await prisma.userBan.count({
    where: {
      OR: [
        { blockerId: Number(a), blockedId: Number(b) },
        { blockerId: Number(b), blockedId: Number(a) },
      ],
    },
  });
  return count > 0;
}

async function getFriends(req, res) {
  const userId = req.user.id;
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    include: {
      user1: { select: { id: true, username: true, email: true } },
      user2: { select: { id: true, username: true, email: true } },
    },
  });
  const friends = friendships.map((f) => (f.user1Id === userId ? f.user2 : f.user1));
  return res.status(200).json(friends);
}

async function getFriendRequests(req, res) {
  const requests = await prisma.friendRequest.findMany({
    where: { receiverId: req.user.id, status: 'pending' },
    include: { sender: { select: { id: true, username: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return res.status(200).json(
    requests.map((r) => ({
      id: r.id,
      senderId: r.senderId,
      senderName: r.sender.username,
      message: r.message,
      createdAt: r.createdAt,
    }))
  );
}

async function getBannedUsers(req, res) {
  const bans = await prisma.userBan.findMany({
    where: { blockerId: req.user.id },
    include: { blocked: { select: { id: true, username: true } } },
  });
  return res.status(200).json(bans.map((b) => ({ userId: b.blockedId, username: b.blocked.username })));
}

async function sendFriendRequest(req, res) {
  const senderId = req.user.id;
  const { username } = req.body || {};
  const recipient = await getUserByUsername(username);
  if (!recipient) return res.status(404).json({ message: 'User not found' });
  if (recipient.id === senderId) return res.status(400).json({ message: 'Cannot send request to yourself' });

  if (await isBanned(senderId, recipient.id)) return res.status(403).json({ message: 'Cannot send request due to a ban' });
  if (await areFriends(senderId, recipient.id)) return res.status(409).json({ message: 'Already friends' });

  const existing = await prisma.friendRequest.findFirst({
    where: {
      status: 'pending',
      OR: [
        { senderId, receiverId: recipient.id },
        { senderId: recipient.id, receiverId: senderId },
      ],
    },
  });
  if (existing) return res.status(409).json({ message: 'Friend request already pending' });

  const request = await prisma.friendRequest.create({
    data: { senderId, receiverId: recipient.id, message: String(req.body?.message || '') },
  });
  return res.status(201).json({ message: 'Friend request sent', requestId: request.id });
}

async function acceptFriendRequest(req, res) {
  const userId = req.user.id;
  const requestId = Number(req.params.requestId);
  const request = await prisma.friendRequest.findFirst({ where: { id: requestId, receiverId: userId, status: 'pending' } });
  if (!request) return res.status(404).json({ message: 'Friend request not found' });

  await prisma.friendRequest.update({ where: { id: requestId }, data: { status: 'accepted' } });

  const { user1Id, user2Id } = normalizedPair(request.senderId, request.receiverId);
  const existing = await prisma.friendship.findUnique({ where: { user1Id_user2Id: { user1Id, user2Id } } });
  if (!existing) {
    await prisma.friendship.create({ data: { user1Id, user2Id } });
  }
  return res.status(200).json({ message: 'Friend request accepted' });
}

async function rejectFriendRequest(req, res) {
  const userId = req.user.id;
  const requestId = Number(req.params.requestId);
  const request = await prisma.friendRequest.findFirst({ where: { id: requestId, receiverId: userId, status: 'pending' } });
  if (!request) return res.status(404).json({ message: 'Friend request not found' });

  await prisma.friendRequest.update({ where: { id: requestId }, data: { status: 'rejected' } });
  return res.status(200).json({ message: 'Friend request rejected' });
}

async function removeFriend(req, res) {
  const userId = req.user.id;
  const friendId = Number(req.params.friendId);
  const { user1Id, user2Id } = normalizedPair(userId, friendId);

  await prisma.friendship.deleteMany({ where: { user1Id, user2Id } });
  return res.status(200).json({ message: 'Friend removed' });
}

async function banUser(req, res) {
  const blockerId = req.user.id;
  const blockedId = Number(req.params.userId);
  if (!await getUserById(blockedId)) return res.status(404).json({ message: 'User not found' });
  if (blockedId === blockerId) return res.status(400).json({ message: 'Cannot ban yourself' });

  await prisma.userBan.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    update: {},
    create: { blockerId, blockedId },
  });

  // Remove friendship
  const { user1Id, user2Id } = normalizedPair(blockerId, blockedId);
  await prisma.friendship.deleteMany({ where: { user1Id, user2Id } });

  return res.status(200).json({ message: 'User banned' });
}

async function unbanUser(req, res) {
  const blockerId = req.user.id;
  const blockedId = Number(req.params.userId);
  await prisma.userBan.deleteMany({ where: { blockerId, blockedId } });
  return res.status(200).json({ message: 'User unbanned' });
}

module.exports = { getFriends, getFriendRequests, getBannedUsers, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, banUser, unbanUser, areFriends, isBanned };
