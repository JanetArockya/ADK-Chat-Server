const {createServer} = require("http");
const { Server } = require("socket.io");
const app = require("./src/app");
const { initSocketHandlers } = require("./src/sockets");
const { setIO } = require("./src/utils/socketIO");

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

setIO(io);
initSocketHandlers(io);

const PORT = Number(process.env.PORT) || 3000;

httpServer.on("error", (err) => {
    if (err && err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use.`);
        console.error("Stop the running server on this port, or start with a different PORT value.");
        process.exit(1);
    }
    throw err;
});

httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const shutdown = (signal) => {
    console.log(`${signal} received, shutting down server...`);
    io.close(() => {
        httpServer.close(() => process.exit(0));
    });
    setTimeout(() => process.exit(0), 3000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
