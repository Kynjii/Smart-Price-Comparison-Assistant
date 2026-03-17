const SUPPORTED_PATTERNS = [/idealo\.de/, /mydealz\.de/, /amazon\.(de|com|co\.uk|ca|fr|it|es|nl)/, /breuninger\.com/];

function isSupportedUrl(url) {
    if (!url) return false;
    return SUPPORTED_PATTERNS.some((pattern) => pattern.test(url));
}

async function checkTabContext(tabId, url) {
    if (!isSupportedUrl(url)) {
        chrome.action.setBadgeText({ tabId, text: "" });
        return;
    }

    try {
        await chrome.tabs.sendMessage(tabId, { action: "ping" });
        chrome.action.setBadgeText({ tabId, text: "" });
    } catch {
        chrome.action.setBadgeText({ tabId, text: "!" });
        chrome.action.setBadgeBackgroundColor({ tabId, color: "#f59e0b" });
    }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        setTimeout(() => checkTabContext(tabId, tab.url), 500);
    }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url) {
            checkTabContext(activeInfo.tabId, tab.url);
        }
    } catch {
        // Tab may not exist
    }
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            if (tab.id && tab.url) {
                checkTabContext(tab.id, tab.url);
            }
        });
    });
});
