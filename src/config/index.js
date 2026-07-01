const { getLocalIp } = require("./network");

const config = {
    PORT: Number(process.env.PORT) || 3000,
    HTTPS_PORT: Number(process.env.HTTPS_PORT) || 3443,
    LOCAL_IP: getLocalIp(),

    getServerUrl() {
        return `http://${this.LOCAL_IP}:${this.PORT}`;
    },

    getHttpsServerUrl() {
        return `https://${this.LOCAL_IP}:${this.HTTPS_PORT}`;
    }
};

module.exports = config;