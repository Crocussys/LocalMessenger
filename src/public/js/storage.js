export function getDeviceToken() {
    return localStorage.getItem("device_token");
}

export function getCurrentAccountId() {
    return Number(localStorage.getItem("account_id"));
}

export function saveAccount(account) {
    localStorage.setItem("account_id", account.id);
    localStorage.setItem("display_name", account.display_name);
}

export function clearSession() {
    localStorage.removeItem("device_token");
    localStorage.removeItem("account_id");
    localStorage.removeItem("display_name");
}