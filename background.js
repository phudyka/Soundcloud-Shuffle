'use strict';

let scTabId = null;

async function findSC() {
    // 1. Validate stored ID
    if (scTabId !== null) {
        try {
            const tab = await chrome.tabs.get(scTabId);
            if (tab && tab.url && tab.url.includes('soundcloud.com')) return scTabId;
        } catch {}
        scTabId = null;
    }
    // 2. Query all tabs
    try {
        const tabs = await chrome.tabs.query({});
        for (const t of tabs) {
            if (t.url && t.url.includes('soundcloud.com')) {
                scTabId = t.id;
                return t.id;
            }
        }
    } catch {}
    return null;
}

async function ensureContentScript(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['capture.js'],
        });
    } catch {}
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js'],
        });
    } catch {}
    // Wait for scripts to initialize
    await new Promise(r => setTimeout(r, 400));
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // Content script registration
    if (msg.type === 'scReady') {
        scTabId = sender.tab.id;
        sendResponse({ ok: true });
        return;
    }

    // Popup relay
    if (msg.type === 'relay') {
        findSC().then(async (tabId) => {
            if (!tabId) {
                sendResponse({ ok: false, error: 'noTab' });
                return;
            }

            // Try sending message
            try {
                const res = await chrome.tabs.sendMessage(tabId, { type: msg.command, value: msg.value });
                sendResponse(res || { ok: false });
                return;
            } catch {}

            // Content script not loaded — auto-inject and retry
            await ensureContentScript(tabId);
            try {
                const res = await chrome.tabs.sendMessage(tabId, { type: msg.command, value: msg.value });
                sendResponse(res || { ok: false });
            } catch {
                scTabId = null;
                sendResponse({ ok: false, error: 'noScript' });
            }
        });
        return true; // async
    }
});

chrome.tabs.onRemoved.addListener(id => { if (id === scTabId) scTabId = null; });
