import {
    getMe,
    getAvailableAccounts,
    getDialogs,
    openPrivateDialog,
    getMessages,
    sendTextMessage,
    sendVoiceMessage,
    markDialogAsRead
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

let currentAccount = null;
let currentDialogId = null;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let isCancellingRecording = false;
let recordingTimerId = null;
let recordingStartedAt = null;
let activeSidebarTab = "contacts";

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

    currentAccount = data;
    saveAccount(data);

    connectSocket(async (message) => {
        if (message.dialog_id === currentDialogId) {
            appendMessage(message);
            await markDialogAsRead(currentDialogId);
        }

        if (activeSidebarTab === "dialogs") {
            await renderDialogs();
            return;
        }

        if (activeSidebarTab === "contacts") {
            await renderContacts();
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
                    <div id="normalInputRow" class="input-row">
                        <button id="voiceButton" class="button secondary voice-button" type="button">🎙</button>

                        <input id="messageInput" type="text" placeholder="Введите сообщение" autocomplete="off">

                        <button class="button send-button" type="submit">Отправить</button>
                    </div>

                    <div id="recordingStatus" class="recording-status" hidden>
                        <div class="recording-info">
                            <span class="recording-dot"></span>
                            <span id="recordingTimer">00:00</span>
                        </div>

                        <div class="recording-actions">
                            <button id="cancelRecordingButton" class="recording-action cancel" type="button">✖</button>
                            <button id="sendRecordingButton" class="recording-action send" type="button">✔</button>
                        </div>
                    </div>
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

    const voiceButton = document.getElementById("voiceButton");
    if (voiceButton) {
        voiceButton.addEventListener("click", handleVoiceButtonClick);
    }

    document.getElementById("cancelRecordingButton").addEventListener("click", cancelRecording);
    document.getElementById("sendRecordingButton").addEventListener("click", stopRecording);
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
    activeSidebarTab = "dialogs";

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

        if (dialog.id === currentDialogId) {
            button.classList.add("active");
        }

        button.innerHTML = `
            <div class="dialog-row">
                <div>
                    <div><b>${dialog.title || "Без названия"}</b></div>
                    <div class="muted">
                        ${formatDialogPreview(dialog)}
                    </div>
                </div>

                ${
                    dialog.unread_count > 0
                        ? `<span class="unread-badge">${dialog.unread_count}</span>`
                        : ""
                }
            </div>
        `;

        button.addEventListener("click", () => openDialog(dialog.companion_id));

        list.appendChild(button);
    }
}

async function openDialog(accountId) {
    const result = await openPrivateDialog(accountId);

    currentDialogId = result.dialog_id;

    if (activeSidebarTab === "dialogs") {
        await renderDialogs();
    }

    document.querySelector(".app-shell").classList.add("chat-open");

    document.getElementById("chatTitle").textContent = result.companion.display_name;
    document.getElementById("chatSubtitle").textContent = `Диалог #${result.dialog_id}`;
    document.getElementById("messageForm").style.display = "flex";

    joinDialog(currentDialogId);

    await renderMessages();
    await markDialogAsRead(currentDialogId);

    if (activeSidebarTab === "dialogs") {
        await renderDialogs();
    }
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

    if (activeSidebarTab === "dialogs") {
        await renderDialogs();
    }
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

async function handleVoiceButtonClick() {
    if (!currentDialogId) {
        alert("Сначала откройте диалог");
        return;
    }

    if (!currentAccount?.is_certified) {
        window.location.href = "/voice-setup";
        return;
    }

    if (isRecording) {
        return;
    }

    await startRecording();
}

async function startRecording() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Браузер не поддерживает запись с микрофона или нужен HTTPS.");
            return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        recordedChunks = [];
        isCancellingRecording = false;

        const mimeType = getSupportedAudioMimeType();

        mediaRecorder = new MediaRecorder(
            stream,
            mimeType ? { mimeType } : undefined
        );

        mediaRecorder.addEventListener("dataavailable", (event) => {
            if (event.data && event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        });

        mediaRecorder.addEventListener("stop", async () => {
            clearRecordingTimer();
            stream.getTracks().forEach((track) => track.stop());

            if (isCancellingRecording) {
                recordedChunks = [];
                isCancellingRecording = false;
                return;
            }

            const audioBlob = new Blob(recordedChunks, {
                type: mimeType || "audio/webm"
            });

            if (audioBlob.size === 0) {
                alert("Голосовое получилось пустым");
                return;
            }

            const { response, data } = await sendVoiceMessage(currentDialogId, audioBlob);

            if (!response.ok) {
                alert(data.error || "Ошибка отправки голосового сообщения");
            }
        });

        mediaRecorder.start();

        isRecording = true;
        recordingStartedAt = Date.now();

        startRecordingTimer();
        updateRecordingUi();
    } catch (error) {
        console.error(error);
        alert(`Не удалось начать запись: ${error.message}`);
    }
}

function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        return;
    }

    isRecording = false;
    updateRecordingUi();

    mediaRecorder.stop();
}

function cancelRecording() {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        return;
    }

    isCancellingRecording = true;
    isRecording = false;
    updateRecordingUi();

    mediaRecorder.stop();
}

function startRecordingTimer() {
    updateRecordingTimer();
    recordingTimerId = setInterval(updateRecordingTimer, 500);
}

function clearRecordingTimer() {
    clearInterval(recordingTimerId);

    recordingTimerId = null;
    recordingStartedAt = null;

    const timer = document.getElementById("recordingTimer");
    if (timer) {
        timer.textContent = "00:00";
    }
}

function updateRecordingTimer() {
    const timer = document.getElementById("recordingTimer");

    if (!timer || !recordingStartedAt) {
        return;
    }

    const elapsedMs = Date.now() - recordingStartedAt;
    const seconds = Math.floor(elapsedMs / 1000);

    const minutesPart = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secondsPart = String(seconds % 60).padStart(2, "0");

    timer.textContent = `${minutesPart}:${secondsPart}`;
}

function updateRecordingUi() {
    const normalInputRow = document.getElementById("normalInputRow");
    const recordingStatus = document.getElementById("recordingStatus");

    if (normalInputRow) {
        normalInputRow.hidden = isRecording;
    }

    if (recordingStatus) {
        recordingStatus.hidden = !isRecording;
    }
}

function getSupportedAudioMimeType() {
    const types = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus"
    ];

    return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function renderMessageContent(message) {
    if (message.type === "voice") {
        return `
            <audio controls src="${message.file_path}"></audio>
        `;
    }

    return escapeHtml(message.text || "");
}

function showCertificationDialog() {
    const ok = confirm(
`Для записи голосовых сообщений необходимо установить локальный сертификат.

Сейчас открыть инструкцию?`
    );

    if (ok) {
        window.location.href = "/pair";
    }
}

function formatDialogPreview(dialog) {
    if (!dialog.last_message_type) {
        return "Сообщений пока нет";
    }

    if (dialog.last_message_type === "voice") {
        return "🎙 Голосовое сообщение";
    }

    if (dialog.last_message_type === "file") {
        return "📎 Файл";
    }

    return dialog.last_message_text || "";
}

init();