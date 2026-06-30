const { getLocalIp } = require("./network");

const config = {
    PORT: Number(process.env.PORT) || 3000,
    LOCAL_IP: getLocalIp(),

    getServerUrl() {
        return `http://${this.LOCAL_IP}:${this.PORT}`;
    }
};

module.exports = config;