const statusElement = document.getElementById("status");
const homeLink = document.getElementById("homeLink");

const params = new URLSearchParams(window.location.search);
const token = params.get("token");

async function certify() {
    if (!window.isSecureContext) {
        statusElement.textContent = "Страница открыта не через доверенный HTTPS.";
        return;
    }

    if (!token) {
        statusElement.textContent = "Токен HTTPS-подтверждения не найден.";
        return;
    }

    const response = await fetch("/api/certification/confirm", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ token })
    });

    const result = await response.json();

    if (!response.ok) {
        statusElement.textContent = result.error || "Не удалось подтвердить HTTPS.";
        return;
    }

    localStorage.setItem("device_token", result.device_token);
    localStorage.setItem("account_id", result.account_id);
    localStorage.setItem("display_name", result.display_name);

    statusElement.textContent = "HTTPS подтверждён. Голосовые сообщения доступны.";
    homeLink.style.display = "inline";
}

certify();