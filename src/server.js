const http = require("http");
const app = require("./app");
const config = require("./config");
const { initSocket } = require("./sockets/socket");

const server = http.createServer(app);

const io = initSocket(server);
app.set("io", io);

server.listen(config.PORT, "0.0.0.0", () => {
    console.log("Server started");
    console.log(`Admin: ${config.getServerUrl()}/admin`);
});