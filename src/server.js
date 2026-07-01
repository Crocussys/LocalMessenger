const http = require("http");
const https = require("https");
const fs = require("fs");

const app = require("./app");
const config = require("./config");
const { initSocket } = require("./sockets/socket");
const { ensureCertificates, paths } = require("./services/certificateService");

ensureCertificates();

const httpServer = http.createServer(app);

const httpsServer = https.createServer({
    cert: fs.readFileSync(paths.serverCertPath),
    key: fs.readFileSync(paths.serverKeyPath)
}, app);

const io = initSocket(httpServer);
io.attach(httpsServer);

app.set("io", io);

httpServer.listen(config.PORT, "0.0.0.0", () => {
    console.log(`HTTP:  ${config.getServerUrl()}`);
    console.log(`Admin: ${config.getServerUrl()}/admin`);
});

httpsServer.listen(config.HTTPS_PORT, "0.0.0.0", () => {
    console.log(`HTTPS: ${config.getHttpsServerUrl()}`);
});