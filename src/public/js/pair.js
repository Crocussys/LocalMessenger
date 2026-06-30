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

    statusElement.textContent = `Устройство привязано к аккаунту "${result.display_name}"`;
    homeLink.style.display = "inline";
}

pairDevice();