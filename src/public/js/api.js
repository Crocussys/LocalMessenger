import { getDeviceToken } from "./storage.js";

function authHeaders() {
    return {
        "X-Device-Token": getDeviceToken()
    };
}

export async function getMe() {
    const response = await fetch("/api/auth/me", {
        headers: authHeaders()
    });

    const data = await response.json();
    return { response, data };
}

export async function getAvailableAccounts() {
    const response = await fetch("/api/accounts/available", {
        headers: authHeaders()
    });

    return await response.json();
}

export async function openPrivateDialog(targetAccountId) {
    const response = await fetch("/api/dialogs/private", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...authHeaders()
        },
        body: JSON.stringify({
            target_account_id: targetAccountId
        })
    });

    return await response.json();
}

export async function getMessages(dialogId) {
    const response = await fetch(`/api/dialogs/${dialogId}/messages`, {
        headers: authHeaders()
    });

    return await response.json();
}

export async function sendTextMessage(dialogId, text) {
    const response = await fetch(`/api/dialogs/${dialogId}/messages`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...authHeaders()
        },
        body: JSON.stringify({ text })
    });

    return {
        response,
        data: await response.json()
    };
}

export async function getAdminAccounts() {
    const response = await fetch("/api/accounts");
    return await response.json();
}

export async function createAccount(displayName) {
    const response = await fetch("/api/accounts", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            display_name: displayName
        })
    });

    return {
        response,
        data: await response.json()
    };
}

export async function createPairLink(accountId) {
    const response = await fetch(`/api/accounts/${accountId}/pair-link`, {
        method: "POST"
    });

    return {
        response,
        data: await response.json()
    };
}

export async function getDialogs() {
    const response = await fetch("/api/dialogs", {
        headers: authHeaders()
    });

    return await response.json();
}

export async function sendVoiceMessage(dialogId, audioBlob) {
    const formData = new FormData();

    formData.append("voice", audioBlob, "voice.webm");

    const response = await fetch(`/api/dialogs/${dialogId}/voice`, {
        method: "POST",
        headers: authHeaders(),
        body: formData
    });

    return {
        response,
        data: await response.json()
    };
}