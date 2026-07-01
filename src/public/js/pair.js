const statusElement = document.getElementById("status");
const homeLink = document.getElementById("homeLink");

const params = new URLSearchParams(window.location.search);
const token = params.get("token");

async function pairDevice() {
    if (!token) {
        statusElement.textContent = "Ошибка: токен привязки не найден";
        return;
    }

    const response = await fetch("/api/accounts/pair", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            token
        })
    });

    const result = await response.json();

    if (!response.ok) {
        statusElement.textContent = result.error || "Ошибка привязки устройства";
        return;
    }

    localStorage.setItem("device_token", result.device_token);
    localStorage.setItem("account_id", result.account_id);
    localStorage.setItem("display_name", result.display_name);

    statusElement.innerHTML = `
        <p>Устройство привязано к аккаунту <b>${result.display_name}</b>.</p>

        <hr>

        <h3>Голосовые сообщения</h3>

        <p class="muted">
            Для работы микрофона нужно установить локальный сертификат и открыть HTTPS-версию приложения.
        </p>

        <p>
            <a class="button" href="${result.cert_url}">Скачать сертификат</a>
        </p>

        <p class="muted">
            После установки сертификата откройте защищённую версию:
        </p>

        <p>
            <a href="${result.certify_url}">${result.certify_url}</a>
        </p>

        <hr>

        <p>
            <a href="/">Продолжить без голосовых</a>
        </p>
    `;

    homeLink.style.display = "none";
}

pairDevice();