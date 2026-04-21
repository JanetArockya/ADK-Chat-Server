const chatStore = {
  rooms: [],
  messages: [],
  nextRoomId: 1,
  nextMessageId: 1,
};

function createRoomId() {
  const id = chatStore.nextRoomId;
  chatStore.nextRoomId += 1;
  return id;
}

function createMessageId() {
  const id = chatStore.nextMessageId;
  chatStore.nextMessageId += 1;
  return id;
}

module.exports = {
  chatStore,
  createRoomId,
  createMessageId,
};
