const express = require("express");
const path = require("path");

const accountsRouter = require("./routes/accounts");
const authRouter = require("./routes/auth");
const dialogsRouter = require("./routes/dialogs");
const messagesRouter = require("./routes/messages");
const certificationRouter = require("./routes/certification");
const configRouter = require("./routes/config");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/accounts", accountsRouter);
app.use("/api/auth", authRouter);
app.use("/api/dialogs", dialogsRouter);
app.use("/api/certification", certificationRouter);
app.use("/api", messagesRouter);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/config", configRouter);

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/pair", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "pair.html"));
});

app.get("/cert/rootCA.crt", (req, res) => {
    res.download(path.join(__dirname, "..", "cert", "rootCA.crt"));
});

app.get("/certify", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "certify.html"));
});

app.get("/voice-setup", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "voice-setup.html"));
});

module.exports = app;