const { Server } = require("socket.io");
const authService = require("../services/authService");

function initSocket(server) {
    const io = new Server(server);

    io.on("connection", (socket) => {
        const deviceToken = socket.handshake.auth?.deviceToken;
        const account = authService.getAccountByDeviceToken(deviceToken);

        if (!account || !account.is_active) {
            socket.disconnect();
            return;
        }

        socket.account = account;

        socket.on("join-dialog", (dialogId) => {
            socket.join(`dialog:${dialogId}`);
        });

        socket.on("leave-dialog", (dialogId) => {
            socket.leave(`dialog:${dialogId}`);
        });
    });

    return io;
}

module.exports = {
    initSocket
};