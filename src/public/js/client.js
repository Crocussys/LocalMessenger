import {
    getMe,
    getAvailableAccounts,
    getDialogs,
    openPrivateDialog,
    getMessages,
    sendTextMessage,
    sendVoiceMessage
} from "./api.js";

import {
    getDeviceToken,
    getCurrentAccountId,
    saveAccount,
    clearSession
} from "./storage.js";

import {
    connectSocket,
    joinDialog
} from "./socket.js";

const app = document.getElementById("app");

let currentDialogId = null;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

async function init() {
    if (!getDeviceToken()) {
        renderNotPaired();
        return;
    }

    const { response, data } = await getMe();

    if (!response.ok) {
        clearSession();
        renderNotPaired();
        return;
    }

    saveAccount(data);

    connectSocket((message) => {
        if (message.dialog_id === currentDialogId) {
            appendMessage(message);
        }
    });

    renderLayout(data);
    await renderContacts();
}

function renderNotPaired() {
    app.innerHTML = `
        <div class="page">
            <div class="card">
                <h1>Local Messenger</h1>
                <p class="muted">Это устройство ещё не привязано.</p>
                <p>Попросите администратора создать QR-код для вашего аккаунта.</p>
            </div>
        </div>
    `;
}

function renderLayout(account) {
    app.innerHTML = `
        <div class="app-shell">
            <aside class="sidebar">
                <h2>${account.display_name}</h2>
                <p class="muted">Локальный мессенджер</p>

                <div class="tabs">
                    <button id="contactsTab" class="tab active" type="button">Контакты</button>
                    <button id="dialogsTab" class="tab" type="button">Диалоги</button>
                </div>

                <div id="sidebarList">Загрузка...</div>
            </aside>

            <main class="chat">
                <header class="chat-header">
                    <button id="backButton" class="back-button" type="button">←</button>

                    <div>
                        <h2 id="chatTitle">Выберите собеседника</h2>
                        <p id="chatSubtitle" class="muted">Сообщения появятся здесь</p>
                    </div>
                </header>

                <section id="messagesList" class="chat-body"></section>

                <form id="messageForm" class="chat-form" style="display: none;">
                    <button id="voiceButton" class="button secondary voice-button" type="button">🎙</button>

                    <input id="messageInput" type="text" placeholder="Введите сообщение" autocomplete="off">

                    <button class="button send-button" type="submit">Отправить</button>
                </form>
            </main>
        </div>
    `;

    document.getElementById("messageForm").addEventListener("submit", handleSendMessage);

    document.getElementById("backButton").addEventListener("click", () => {
        document.querySelector(".app-shell").classList.remove("chat-open");
    });

    document.getElementById("contactsTab").addEventListener("click", () => {
        setActiveTab("contacts");
        renderContacts();
    });

    document.getElementById("dialogsTab").addEventListener("click", () => {
        setActiveTab("dialogs");
        renderDialogs();
    });

    document.getElementById("voiceButton").addEventListener("click", handleVoiceButtonClick);
}

function setActiveTab(tabName) {
    document.getElementById("contactsTab").classList.toggle("active", tabName === "contacts");
    document.getElementById("dialogsTab").classList.toggle("active", tabName === "dialogs");
}

async function renderContacts() {
    const contacts = await getAvailableAccounts();
    const list = document.getElementById("sidebarList");

    if (!contacts.length) {
        list.innerHTML = `<p class="muted">Других аккаунтов пока нет.</p>`;
        return;
    }

    list.innerHTML = "";

    for (const contact of contacts) {
        const button = document.createElement("button");
        button.className = "account-button";

        button.innerHTML = `
            <div><b>${contact.display_name}</b></div>
            <div class="muted">
                ${contact.has_dialog ? "Есть диалог" : "Новый контакт"}
            </div>
        `;

        button.addEventListener("click", () => openDialog(contact.id));

        list.appendChild(button);
    }
}

async function renderDialogs() {
    const dialogs = await getDialogs();
    const list = document.getElementById("sidebarList");

    if (!dialogs.length) {
        list.innerHTML = `<p class="muted">Диалогов пока нет.</p>`;
        return;
    }

    list.innerHTML = "";

    for (const dialog of dialogs) {
        const button = document.createElement("button");
        button.className = "dialog-button";

        button.innerHTML = `
            <div><b>${dialog.title || "Без названия"}</b></div>
            <div class="muted">
                ${dialog.last_message_text || "Сообщений пока нет"}
            </div>
        `;

        button.addEventListener("click", () => openDialog(dialog.companion_id));

        list.appendChild(button);
    }
}

async function openDialog(accountId) {
    const result = await openPrivateDialog(accountId);

    currentDialogId = result.dialog_id;
    document.querySelector(".app-shell").classList.add("chat-open");

    document.getElementById("chatTitle").textContent = result.companion.display_name;
    document.getElementById("chatSubtitle").textContent = `Диалог #${result.dialog_id}`;
    document.getElementById("messageForm").style.display = "flex";

    joinDialog(currentDialogId);

    await renderMessages();
}

async function renderMessages() {
    const messages = await getMessages(currentDialogId);
    const list = document.getElementById("messagesList");

    list.innerHTML = "";

    if (!messages.length) {
        list.innerHTML = `<p class="muted">Сообщений пока нет.</p>`;
        return;
    }

    for (const message of messages) {
        appendMessage(message);
    }

    list.scrollTop = list.scrollHeight;
}

function appendMessage(message) {
    const list = document.getElementById("messagesList");

    if (!list) {
        return;
    }

    if (list.textContent === "Сообщений пока нет.") {
        list.innerHTML = "";
    }

    const isMine = message.sender_account_id === getCurrentAccountId();

    const element = document.createElement("div");
    element.className = isMine ? "message mine" : "message";

    element.innerHTML = `
        <div class="message-author">${isMine ? "Вы" : message.sender_display_name}</div>
        <div>${renderMessageContent(message)}</div>
    `;

    list.appendChild(element);
    list.scrollTop = list.scrollHeight;
}

async function handleSendMessage(event) {
    event.preventDefault();

    const input = document.getElementById("messageInput");
    const text = input.value.trim();

    if (!text || !currentDialogId) {
        return;
    }

    const { response, data } = await sendTextMessage(currentDialogId, text);

    if (!response.ok) {
        alert(data.error || "Ошибка отправки сообщения");
        return;
    }

    input.value = "";
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

async function handleVoiceButtonClick() {
    if (!currentDialogId) {
        return;
    }

    if (isRecording) {
        stopRecording();
        return;
    }

    await startRecording();
}

async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
    });

    recordedChunks = [];

    mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm"
    });

    mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    });

    mediaRecorder.addEventListener("stop", async () => {
        const audioBlob = new Blob(recordedChunks, {
            type: "audio/webm"
        });

        stream.getTracks().forEach((track) => track.stop());

        const { response, data } = await sendVoiceMessage(currentDialogId, audioBlob);

        if (!response.ok) {
            alert(data.error || "Ошибка отправки голосового сообщения");
        }
    });

    mediaRecorder.start();

    isRecording = true;
    updateVoiceButton();
}

function stopRecording() {
    if (!mediaRecorder) {
        return;
    }

    mediaRecorder.stop();

    isRecording = false;
    updateVoiceButton();
}

function updateVoiceButton() {
    const button = document.getElementById("voiceButton");

    if (!button) {
        return;
    }

    button.textContent = isRecording ? "■" : "🎙";
    button.classList.toggle("danger", isRecording);
}

function renderMessageContent(message) {
    if (message.type === "voice") {
        return `
            <audio controls src="${message.file_path}"></audio>
        `;
    }

    return escapeHtml(message.text || "");
}

init();