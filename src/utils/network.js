const os = require("os");

function getLocalIp() {
    const interfaces = os.networkInterfaces();

    for (const interfaceName of Object.keys(interfaces)) {
        for (const iface of interfaces[interfaceName]) {
            if (
                iface.family === "IPv4" &&
                !iface.internal
            ) {
                return iface.address;
            }
        }
    }

    return "localhost";
}

module.exports = {
    getLocalIp
};