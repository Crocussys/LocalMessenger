const crypto = require("crypto");

const pairLinks = new Map();

const PAIR_LINK_TTL_MS = 60 * 1000;

function createPairLink(accountId) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + PAIR_LINK_TTL_MS;

    pairLinks.set(token, {
        accountId,
        expiresAt
    });

    return token;
}

function consumePairLink(token) {
    const pairLink = pairLinks.get(token);

    if (!pairLink) {
        return null;
    }

    pairLinks.delete(token);

    if (pairLink.expiresAt < Date.now()) {
        return null;
    }

    return pairLink;
}

function cleanupExpiredPairLinks() {
    const now = Date.now();

    for (const [token, pairLink] of pairLinks.entries()) {
        if (pairLink.expiresAt < now) {
            pairLinks.delete(token);
        }
    }
}

setInterval(cleanupExpiredPairLinks, 30 * 1000);

module.exports = {
    createPairLink,
    consumePairLink
};