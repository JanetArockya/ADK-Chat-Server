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

httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});