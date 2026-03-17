document.addEventListener("DOMContentLoaded", () => {
    const versionEl = document.querySelector(".popup-version");
    const themeBtns = document.querySelectorAll(".theme-btn");
    const slackInput = document.getElementById("slackUrl");
    const saveSlackBtn = document.getElementById("saveSlackBtn");
    const slackStatus = document.getElementById("slackStatus");
    const changelogBtn = document.getElementById("showChangelogBtn");
    const contextWarning = document.getElementById("contextWarning");

    const MASKED_URL = "*************";
    let hasExistingUrl = false;

    const manifest = chrome.runtime.getManifest();
    versionEl.textContent = `v${manifest.version}`;

    // Check if content script context is valid on active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
            chrome.tabs
                .sendMessage(tabs[0].id, { action: "ping" })
                .then(() => {
                    // Context is valid, hide warning and clear badge
                    contextWarning.style.display = "none";
                    chrome.action.setBadgeText({ tabId: tabs[0].id, text: "" });
                })
                .catch(() => {
                    // Context invalid or no content script - show warning if it's a supported page
                    const url = tabs[0].url || "";
                    if (url.includes("idealo.de") || url.includes("mydealz.de") || url.includes("amazon.")) {
                        contextWarning.style.display = "flex";
                        // Show warning badge on extension icon
                        chrome.action.setBadgeText({ tabId: tabs[0].id, text: "!" });
                        chrome.action.setBadgeBackgroundColor({ tabId: tabs[0].id, color: "#f59e0b" });
                    }
                });
        }
    });

    chrome.storage.local.get(["selectedTheme", "slackWebhookUrl"], (result) => {
        const currentTheme = result.selectedTheme || "light";

        if (currentTheme === "dark") {
            document.body.classList.add("dark");
        }

        themeBtns.forEach((btn) => {
            if (btn.dataset.theme === currentTheme) {
                btn.classList.add("active");
            }
        });

        if (result.slackWebhookUrl) {
            slackInput.value = MASKED_URL;
            hasExistingUrl = true;
        }
    });

    slackInput.addEventListener("focus", () => {
        if (slackInput.value === MASKED_URL) {
            slackInput.value = "";
        }
    });

    slackInput.addEventListener("blur", () => {
        if (slackInput.value === "" && hasExistingUrl) {
            slackInput.value = MASKED_URL;
        }
    });

    themeBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            const theme = btn.dataset.theme;

            document.body.classList.remove("dark");
            if (theme === "dark") {
                document.body.classList.add("dark");
            }

            themeBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");

            chrome.storage.local.set({ selectedTheme: theme });

            chrome.tabs.query({}, (tabs) => {
                tabs.forEach((tab) => {
                    chrome.tabs.sendMessage(tab.id, { action: "applyTheme", theme: theme }).catch(() => {});
                });
            });
        });
    });

    saveSlackBtn.addEventListener("click", () => {
        const url = slackInput.value.trim();

        if (!url || url === MASKED_URL) {
            if (!url) {
                chrome.storage.local.remove("slackWebhookUrl");
                hasExistingUrl = false;
                slackStatus.textContent = "URL entfernt";
                slackStatus.className = "popup-hint success";
                setTimeout(() => {
                    slackStatus.textContent = "";
                }, 2000);
            }
            return;
        }

        if (!url.startsWith("https://hooks.slack.com/")) {
            slackStatus.textContent = "Ungültige Slack Webhook URL";
            slackStatus.className = "popup-hint error";
            return;
        }

        chrome.storage.local.set({ slackWebhookUrl: url }, () => {
            slackInput.value = MASKED_URL;
            hasExistingUrl = true;
            slackStatus.textContent = "Gespeichert";
            slackStatus.className = "popup-hint success";
            setTimeout(() => {
                slackStatus.textContent = "";
            }, 2000);
        });
    });

    changelogBtn.addEventListener("click", async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            try {
                await chrome.tabs.sendMessage(tab.id, { action: "showChangelog" });
                window.close();
            } catch {
                slackStatus.textContent = "Öffne eine unterstützte Seite";
                slackStatus.className = "popup-hint";
                setTimeout(() => {
                    slackStatus.textContent = "";
                }, 2000);
            }
        }
    });
});
