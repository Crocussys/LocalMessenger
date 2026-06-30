function getMe(req, res) {
    res.json(req.account);
}

module.exports = {
    getMe
};