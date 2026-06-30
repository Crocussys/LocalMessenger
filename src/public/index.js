const appElement = document.getElementById("app");

async function loadMe() {
    const deviceToken = localStorage.getItem("device_token");

    if (!deviceToken) {
        renderNotPaired();
        return;
    }

    const response = await fetch("/api/auth/me", {
        headers: {
            "X-Device-Token": deviceToken
        }
    });

    const result = await response.json();

    if (!response.ok) {
        localStorage.removeItem("device_token");
        localStorage.removeItem("account_id");
        localStorage.removeItem("display_name");

        renderNotPaired();
        return;
    }

    localStorage.setItem("account_id", result.id);
    localStorage.setItem("display_name", result.display_name);

    renderApp(result);
}

function renderNotPaired() {
    appElement.innerHTML = `
        <p>Это устройство ещё не привязано.</p>
        <p>Попросите администратора создать QR-код для вашего аккаунта.</p>
    `;
}

function renderApp(account) {
    appElement.innerHTML = `
        <h2>${account.display_name}</h2>

        <hr>

        <h3>Диалоги</h3>
        <p>Пока диалогов нет.</p>
    `;
}

loadMe();