const app = require("./app");
const config = require("./config");

app.listen(config.PORT, "0.0.0.0", () => {
    console.log("Server started");
    console.log(`Admin: ${config.getServerUrl()}/admin`);
});