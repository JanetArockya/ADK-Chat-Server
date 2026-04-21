const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/room");
const messageRoutes = require("./routes/messages");
const dialogRoutes = require("./routes/dialog");
const friendRoutes = require("./routes/friends");
const attachmentRoutes = require("./routes/attachments");
const sessionRoutes = require("./routes/sessions");
const userRoutes = require("./routes/users");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
	res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/dialogs", dialogRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/attachments", attachmentRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/users", userRoutes);

module.exports = app;