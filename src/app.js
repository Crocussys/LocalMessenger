const express = require("express");
const path = require("path");

const accountsRouter = require("./routes/accounts");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/accounts", accountsRouter);

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/pair", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "pair.html"));
});

module.exports = app;