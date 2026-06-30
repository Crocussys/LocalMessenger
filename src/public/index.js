const appElement = document.getElementById("app");

let currentDialogId = null;
let socket = null;

function getDeviceToken() {
    return localStorage.getItem("device_token");
}

function getCurrentAccountId() {
    return Number(localStorage.getItem("account_id"));
}

async function loadMe() {
    const deviceToken = getDeviceToken();

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

    connectSocket();

    await renderApp(result);
}

function renderNotPaired() {
    appElement.innerHTML = `
        <p>Это устройство ещё не привязано.</p>
        <p>Попросите администратора создать QR-код для вашего аккаунта.</p>
    `;
}

async function renderApp(account) {
    appElement.innerHTML = `
        <h2>${account.display_name}</h2>

        <hr>

        <h3>Аккаунты в сети</h3>
        <div id="accountsList">Загрузка...</div>

        <hr>

        <h3>Текущий диалог</h3>
        <div id="dialogArea">Выберите аккаунт, чтобы открыть диалог.</div>
    `;

    await loadAvailableAccounts();
}

async function loadAvailableAccounts() {
    const response = await fetch("/api/accounts/available", {
        headers: {
            "X-Device-Token": getDeviceToken()
        }
    });

    const accounts = await response.json();
    const accountsList = document.getElementById("accountsList");

    if (!response.ok) {
        accountsList.textContent = accounts.error || "Ошибка загрузки аккаунтов";
        return;
    }

    if (accounts.length === 0) {
        accountsList.textContent = "Других аккаунтов пока нет.";
        return;
    }

    accountsList.innerHTML = "";

    for (const account of accounts) {
        const button = document.createElement("button");
        button.textContent = account.display_name;

        button.addEventListener("click", () => {
            openPrivateDialog(account.id);
        });

        const wrapper = document.createElement("div");
        wrapper.appendChild(button);

        accountsList.appendChild(wrapper);
    }
}

async function openPrivateDialog(targetAccountId) {
    const response = await fetch("/api/dialogs/private", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Device-Token": getDeviceToken()
        },
        body: JSON.stringify({
            target_account_id: targetAccountId
        })
    });

    const result = await response.json();
    const dialogArea = document.getElementById("dialogArea");

    if (!response.ok) {
        dialogArea.textContent = result.error || "Ошибка открытия диалога";
        return;
    }

    currentDialogId = result.dialog_id;

    if (socket) {
        socket.emit("join-dialog", currentDialogId);
    }

    dialogArea.innerHTML = `
        <h4>Диалог с ${result.companion.display_name}</h4>

        <div id="messagesList">Загрузка сообщений...</div>

        <form id="messageForm">
            <input
                id="messageInput"
                type="text"
                placeholder="Введите сообщение"
                autocomplete="off"
                required
            >
            <button type="submit">Отправить</button>
        </form>
    `;

    document.getElementById("messageForm").addEventListener("submit", sendMessage);

    await loadMessages();
}

async function loadMessages() {
    if (!currentDialogId) {
        return;
    }

    const response = await fetch(`/api/dialogs/${currentDialogId}/messages`, {
        headers: {
            "X-Device-Token": getDeviceToken()
        }
    });

    const messages = await response.json();
    const messagesList = document.getElementById("messagesList");

    if (!response.ok) {
        messagesList.textContent = messages.error || "Ошибка загрузки сообщений";
        return;
    }

    if (messages.length === 0) {
        messagesList.textContent = "Сообщений пока нет.";
        return;
    }

    messagesList.innerHTML = "";

    for (const message of messages) {
        appendMessage(message);
    }
}

async function sendMessage(event) {
    event.preventDefault();

    const messageInput = document.getElementById("messageInput");
    const text = messageInput.value.trim();

    if (!text || !currentDialogId) {
        return;
    }

    const response = await fetch(`/api/dialogs/${currentDialogId}/messages`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Device-Token": getDeviceToken()
        },
        body: JSON.stringify({
            text
        })
    });

    const result = await response.json();

    if (!response.ok) {
        alert(result.error || "Ошибка отправки сообщения");
        return;
    }

    messageInput.value = "";
}

function connectSocket() {
    if (socket) {
        return;
    }

    socket = io({
        auth: {
            deviceToken: getDeviceToken()
        }
    });

    socket.on("new-message", (message) => {
        if (message.dialog_id !== currentDialogId) {
            return;
        }

        appendMessage(message);
    });
}

function appendMessage(message) {
    const messagesList = document.getElementById("messagesList");

    if (!messagesList) {
        return;
    }

    if (messagesList.textContent === "Сообщений пока нет.") {
        messagesList.innerHTML = "";
    }

    const currentAccountId = getCurrentAccountId();
    const isMine = message.sender_account_id === currentAccountId;

    const messageElement = document.createElement("div");

    messageElement.innerHTML = `
        <p>
            <b>${isMine ? "Вы" : message.sender_display_name}:</b>
            ${message.text}
        </p>
    `;

    messagesList.appendChild(messageElement);
}

loadMe();