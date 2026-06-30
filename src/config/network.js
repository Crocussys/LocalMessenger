const os = require("os");
const { execSync } = require("child_process");

function getDefaultGatewayInterfaceIp() {
    const output = execSync("route print -4", {
        encoding: "utf8"
    });

    const lines = output.split(/\r?\n/);

    for (const line of lines) {
        const normalized = line.trim().replace(/\s+/g, " ");

        if (!normalized.startsWith("0.0.0.0 ")) {
            continue;
        }

        const parts = normalized.split(" ");

        // route print:
        // 0.0.0.0  0.0.0.0  gateway  interface_ip  metric
        const interfaceIp = parts[3];

        if (interfaceIp) {
            return interfaceIp;
        }
    }

    return null;
}

function getLocalIp() {
    const interfaceIp = getDefaultGatewayInterfaceIp();

    if (interfaceIp) {
        return interfaceIp;
    }

    throw new Error("Не удалось определить локальный IP компьютера");
}

module.exports = {
    getLocalIp
};