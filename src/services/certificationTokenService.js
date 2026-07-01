const crypto = require("crypto");

const tokens = new Map();

const TTL_MS = 10 * 60 * 1000;

function createCertificationToken(accountId) {
    const token = crypto.randomBytes(32).toString("hex");

    tokens.set(token, {
        accountId,
        expiresAt: Date.now() + TTL_MS
    });

    return token;
}

function consumeCertificationToken(token) {
    const data = tokens.get(token);

    if (!data) {
        return null;
    }

    tokens.delete(token);

    if (data.expiresAt < Date.now()) {
        return null;
    }

    return data;
}

module.exports = {
    createCertificationToken,
    consumeCertificationToken
};