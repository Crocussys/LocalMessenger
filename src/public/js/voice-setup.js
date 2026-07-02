import { createCertificationLink } from "./api.js";

const downloadButton = document.getElementById("downloadCertificateButton");
const checkButton = document.getElementById("checkHttpsButton");

async function init() {
    const { response, data } = await createCertificationLink();

    if (!response.ok) {
        alert(data.error || "Не удалось создать ссылку HTTPS-подтверждения");
        return;
    }

    downloadButton.href = data.cert_url;
    checkButton.href = data.certify_url;
}

init();