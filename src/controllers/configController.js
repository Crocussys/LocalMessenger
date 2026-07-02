const config = require("../config");

function getClientConfig(req, res) {
    res.json({
        http_url: config.getServerUrl(),
        https_url: config.getHttpsServerUrl()
    });
}

module.exports = {
    getClientConfig
};