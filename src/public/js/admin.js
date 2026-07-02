import {
    getAdminAccounts,
    createAccount,
    createPairLink,
    updateAccount,
    unpairAccount,
    resetAccountCertification,
    deleteAccount
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
    const isCertified = Boolean(account.is_certified);

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

            <span class="status ${isCertified ? "ok" : "bad"}">
                ${isCertified ? "HTTPS подтверждён" : "HTTPS не подтверждён"}
            </span>
        </p>

        <div class="form-row">
            <input
                id="nameInput-${account.id}"
                value="${account.display_name}"
                autocomplete="off"
            >

            <button
                class="button secondary save-account-button"
                data-account-id="${account.id}">
                Сохранить
            </button>
        </div>

        <div class="form-row account-actions">
            <button
                class="button secondary toggle-active-button"
                data-account-id="${account.id}"
                data-is-active="${account.is_active ? "1" : "0"}">
                ${account.is_active ? "Отключить" : "Включить"}
            </button>

            ${
                isPaired
                    ? `<button class="button secondary unpair-button" data-account-id="${account.id}">
                        Отвязать
                       </button>`
                    : `<button class="button secondary pair-button" data-account-id="${account.id}">
                        QR для привязки
                       </button>`
            }

            ${
                isCertified
                    ? `<button class="button secondary reset-cert-button" data-account-id="${account.id}">
                        Сбросить HTTPS
                       </button>`
                    : ""
            }

            <button
                class="button danger delete-account-button"
                data-account-id="${account.id}">
                Удалить
            </button>
        </div>

        <div class="pair-result" id="pairResult-${account.id}"></div>
    `;

    card.querySelector(".save-account-button").addEventListener("click", () => {
        handleSaveAccount(account);
    });

    card.querySelector(".toggle-active-button").addEventListener("click", () => {
        handleToggleActive(account);
    });

    const pairButton = card.querySelector(".pair-button");
    if (pairButton) {
        pairButton.addEventListener("click", () => handleCreatePairLink(account.id));
    }

    const unpairButton = card.querySelector(".unpair-button");
    if (unpairButton) {
        unpairButton.addEventListener("click", () => handleUnpairAccount(account.id));
    }

    const resetCertButton = card.querySelector(".reset-cert-button");
    if (resetCertButton) {
        resetCertButton.addEventListener("click", () => handleResetCertification(account.id));
    }

    card.querySelector(".delete-account-button").addEventListener("click", () => {
        handleDeleteAccount(account);
    });

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

async function handleSaveAccount(account) {
    const input = document.getElementById(`nameInput-${account.id}`);
    const displayName = input.value.trim();

    if (!displayName) {
        alert("Имя аккаунта не может быть пустым");
        return;
    }

    const { response, data } = await updateAccount(account.id, {
        display_name: displayName,
        is_active: Boolean(account.is_active)
    });

    if (!response.ok) {
        alert(data.error || "Ошибка сохранения аккаунта");
        return;
    }

    await loadAccounts();
}

async function handleToggleActive(account) {
    const { response, data } = await updateAccount(account.id, {
        display_name: account.display_name,
        is_active: !account.is_active
    });

    if (!response.ok) {
        alert(data.error || "Ошибка изменения статуса аккаунта");
        return;
    }

    await loadAccounts();
}

async function handleUnpairAccount(accountId) {
    const confirmed = confirm("Отвязать устройство от аккаунта? Пользователю придётся привязаться заново.");

    if (!confirmed) {
        return;
    }

    const { response, data } = await unpairAccount(accountId);

    if (!response.ok) {
        alert(data.error || "Ошибка отвязки устройства");
        return;
    }

    await loadAccounts();
}

async function handleResetCertification(accountId) {
    const confirmed = confirm("Сбросить HTTPS-подтверждение для аккаунта?");

    if (!confirmed) {
        return;
    }

    const { response, data } = await resetAccountCertification(accountId);

    if (!response.ok) {
        alert(data.error || "Ошибка сброса HTTPS");
        return;
    }

    await loadAccounts();
}

async function handleDeleteAccount(account) {
    const confirmed = confirm(`Удалить аккаунт "${account.display_name}"? Это также удалит его участие в диалогах и сообщения.`);

    if (!confirmed) {
        return;
    }

    const { response, data } = await deleteAccount(account.id);

    if (!response.ok) {
        alert(data.error || "Ошибка удаления аккаунта");
        return;
    }

    await loadAccounts();
}