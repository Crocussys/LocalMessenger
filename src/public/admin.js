const createAccountForm = document.getElementById("createAccountForm");
const displayNameInput = document.getElementById("displayNameInput");
const accountsList = document.getElementById("accountsList");

async function loadAccounts() {
    const response = await fetch("/api/accounts");
    const accounts = await response.json();

    accountsList.innerHTML = "";

    if (accounts.length === 0) {
        accountsList.textContent = "Аккаунтов пока нет";
        return;
    }

    for (const account of accounts) {
        const accountElement = document.createElement("div");

        const isPaired = Boolean(account.device_token);

        accountElement.innerHTML = `
            <hr>
            <p><b>ID:</b> ${account.id}</p>
            <p><b>Имя:</b> ${account.display_name}</p>
            <p><b>Активен:</b> ${account.is_active ? "Да" : "Нет"}</p>
            <p><b>Устройство привязано:</b> ${isPaired ? "Да" : "Нет"}</p>

            ${
                isPaired
                    ? ""
                    : `<button data-account-id="${account.id}" class="pairButton">Создать ссылку привязки</button>`
            }

            <div id="pairResult-${account.id}"></div>
        `;

        accountsList.appendChild(accountElement);
    }

    document.querySelectorAll(".pairButton").forEach((button) => {
        button.addEventListener("click", createPairLink);
    });
}

async function createPairLink(event) {
    const accountId = event.target.dataset.accountId;

    const response = await fetch(`/api/accounts/${accountId}/pair-link`, {
        method: "POST"
    });

    const result = await response.json();

    const pairResult = document.getElementById(`pairResult-${accountId}`);

    if (!response.ok) {
        pairResult.textContent = result.error || "Ошибка создания ссылки";
        return;
    }

    const fullUrl = result.pair_url;

    pairResult.innerHTML = `
        <p><b>QR-код для привязки:</b></p>

        <img
            src="${result.qr_data_url}"
            alt="QR-код привязки"
            width="256"
            height="256"
        >

        <p><b>Ссылка:</b></p>
        <p>
            <a href="${result.pair_url}" target="_blank">${result.pair_url}</a>
        </p>

        <p>Ссылка живёт 1 минуту.</p>
    `;
}

createAccountForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const displayName = displayNameInput.value.trim();

    if (!displayName) {
        return;
    }

    await fetch("/api/accounts", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            display_name: displayName
        })
    });

    displayNameInput.value = "";
    await loadAccounts();
});

loadAccounts();