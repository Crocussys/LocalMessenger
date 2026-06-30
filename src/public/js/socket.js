import { getDeviceToken } from "./storage.js";

let socket = null;

export function connectSocket(onNewMessage) {
    if (socket) {
        return socket;
    }

    socket = io({
        auth: {
            deviceToken: getDeviceToken()
        }
    });

    socket.on("new-message", onNewMessage);

    return socket;
}

export function joinDialog(dialogId) {
    if (socket) {
        socket.emit("join-dialog", dialogId);
    }
}