import {
    getAdminAccounts,
    createAccount,
    createPairLink
} from "./api.js";

const app = document.getElementById("adminApp");

init();

function init() {
    app.innerHTML = `
        <div class="page">
            <header class="page-header">
                <h1>Админка</h1>
                <p class="muted">Управление аккаунтами и привязкой устройств</p>
            </header>

            <div class="admin-grid">
                <section class="card">
                    <h2>Создать аккаунт</h2>

                    <form id="createAccountForm">
                        <div class="form-row">
                            <input id="displayNameInput" type="text" placeholder="Имя аккаунта" autocomplete="off" required>
                            <button class="button" type="submit">Создать</button>
                        </div>
                    </form>
                </section>

                <section class="card">
                    <h2>Аккаунты</h2>
                    <div id="accountsList">Загрузка...</div>
                </section>
            </div>
        </div>
    `;

    document.getElementById("createAccountForm").addEventListener("submit", handleCreateAccount);

    loadAccounts();
}

async function loadAccounts() {
    const accounts = await getAdminAccounts();
    const list = document.getElementById("accountsList");

    if (!accounts.length) {
        list.innerHTML = `<p class="muted">Аккаунтов пока нет.</p>`;
        return;
    }

    list.innerHTML = "";

    for (const account of accounts) {
        list.appendChild(renderAccountCard(account));
    }
}

function renderAccountCard(account) {
    const card = document.createElement("div");
    card.className = "card account-card";

    const isPaired = Boolean(account.device_token);

    card.innerHTML = `
        <h3>${account.display_name}</h3>

        <p class="muted">ID: ${account.id}</p>

        <p>
            <span class="status ${account.is_active ? "ok" : "bad"}">
                ${account.is_active ? "Активен" : "Отключён"}
            </span>

            <span class="status ${isPaired ? "ok" : "bad"}">
                ${isPaired ? "Устройство привязано" : "Устройство не привязано"}
            </span>
        </p>

        <div class="pair-result" id="pairResult-${account.id}"></div>

        ${
            isPaired
                ? ""
                : `<button class="button secondary pair-button" data-account-id="${account.id}">
                    QR для привязки
                   </button>`
        }
    `;

    const button = card.querySelector(".pair-button");

    if (button) {
        button.addEventListener("click", () => handleCreatePairLink(account.id));
    }

    return card;
}

async function handleCreateAccount(event) {
    event.preventDefault();

    const input = document.getElementById("displayNameInput");
    const displayName = input.value.trim();

    if (!displayName) {
        return;
    }

    const { response, data } = await createAccount(displayName);

    if (!response.ok) {
        alert(data.error || "Ошибка создания аккаунта");
        return;
    }

    input.value = "";
    await loadAccounts();
}

async function handleCreatePairLink(accountId) {
    const { response, data } = await createPairLink(accountId);
    const result = document.getElementById(`pairResult-${accountId}`);

    if (!response.ok) {
        result.innerHTML = `<p class="muted">${data.error || "Ошибка создания QR"}</p>`;
        return;
    }

    result.innerHTML = `
        <p><b>QR-код для привязки</b></p>

        <img class="qr" src="${data.qr_data_url}" alt="QR-код привязки">

        <p class="muted">Ссылка живёт 1 минуту.</p>

        <p>
            <a href="${data.pair_url}" target="_blank">${data.pair_url}</a>
        </p>
    `;
}