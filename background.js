let sleepTime = 10;
let sleepingTabs = {};
let alarmMin = Math.max(1, Math.min(5, Math.floor(sleepTime / 2)));
let rec = false;
let whitelist = [];

function upTitle() {
    browser.contextMenus.update("sleep-tab", {
        title: `Sleep Tab for ${sleepTime} minutes`,
    }).catch(() => {
    });
}

async function refrsChk() {
    await browser.alarms.clear("check-inactive-tabs");
    await browser.alarms.create("check-inactive-tabs", {
        periodInMinutes: alarmMin,
    });
}

(async function loadSettings() {
    const data = await browser.storage.local.get(["sleepTime", "whitelist"]);
    if (typeof data.sleepTime === "number") {
        sleepTime = data.sleepTime;
        alarmMin = Math.max(1, Math.min(5, Math.floor(sleepTime / 2)));
    }
    if (data.whitelist) {
        whitelist = data.whitelist;
    }
    upTitle();
    await refrsChk();
})();
(async function reconciling() {
    const [stored, all] = await Promise.all([
        browser.storage.local.get("sleepingTabs"),
        browser.tabs.query({})
    ]);
    const storedTabs = stored.sleepingTabs || {};
    const res = {};
    for (const tab of all) {
        if (storedTabs[tab.id] && storedTabs[tab.id].url === tab.url) {
            res[tab.id] = storedTabs[tab.id];
        }
    }
    sleepingTabs = res;
    await browser.storage.local.set({ sleepingTabs });
    rec = true;
})();

browser.contextMenus.create({
    id: "sleep-tab",
    title: `Sleep Tab for ${sleepTime} minutes`,
    contexts: ["tab"],
});

function getName(url, title) {
    try {
        const a = new URL(url).hostname.replace(/^www\./, "");
        if (a) return a;
    } catch (err) {
        console.error(`${url}: `, err);
    }
    return title || "sus!";
}

async function wakeTab(tabId) {
    const data = sleepingTabs[tabId];
    if (!data) return false;
    delete sleepingTabs[tabId];
    try {
        await browser.tabs.reload(tabId);
    } catch (error) {
        sleepingTabs[tabId] = data;
        throw error;
    }
    await browser.storage.local.set({ sleepingTabs });
    return true;
}

async function sleep(tabId, isManual = false) {
    const tab = await browser.tabs.get(tabId);
    if (!tab || tab.pinned) return;
    if (tab.url.startsWith("chrome://") || tab.url.startsWith("about:") || tab.url.startsWith("moz-extension://")) return;
    try {
        const url = new URL(tab.url);
        const isWhite = whitelist.some((w) => {
            const cln = w.startsWith('*.') ? w.substring(2) : w;
            if (cln.includes('/')) {
                return tab.url.includes(cln);
            }
            return url.hostname === cln || url.hostname.endsWith('.' + cln);
        });
        if (isWhite) return;
    } catch (err) {
        console.error(err);
    }
    if (!isManual && tab.active) return;
    if (tab.audible) return;
    if (sleepingTabs[tabId]) return;
    
    sleepingTabs[tabId] = {
        url: tab.url,
        webName: getName(tab.url, tab.title),
        pgTitle: tab.title || "sus!",
        sleptAt: Date.now()
    };
    await browser.storage.local.set({ sleepingTabs });
    
    const iconUri = `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(tab.url)}&sz=32`;

    const code = `
        (() => {
            const iconUri = ${JSON.stringify(iconUri)};
            const tabTitle = ${JSON.stringify(sleepingTabs[tabId].pgTitle)};
            const webName = ${JSON.stringify(sleepingTabs[tabId].webName)};
            function esc(str) { 
                return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            }
            try {
                document.documentElement.innerHTML = "<head><meta charset='UTF-8'><link rel='icon' href='" + iconUri + "'><title>Zzz... " + esc(tabTitle) + "</title><style>body { background: #0f0f0f; color: #ccc; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; margin: 0; cursor: pointer; } .box { padding: 40px; border: 1px solid #333; border-radius: 10px; background: #1a1a1a; text-align: center; pointer-events: none; } img { width: 48px; height: 48px; margin-bottom: 20px; border-radius: 8px; } h2 { margin: 0 0 10px 0; font-weight: normal; } p { color: #888; margin: 0; } body:hover .box { border-color: #555; }</style></head><body><div class='box'><img src='" + iconUri + "' alt='icon'><h2>This tab is sleeping: <strong>" + esc(webName) + "</strong></h2><p>Click anywhere (or switch to this tab) to wake it up.</p></div></body>";
            } catch(e) {
                document.body.innerHTML = "<div style='background:#0f0f0f;color:#ccc;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;margin:0;position:fixed;top:0;left:0;width:100%;z-index:999999999;cursor:pointer;'><div style='padding:40px;border:1px solid #333;border-radius:10px;background:#1a1a1a;text-align:center;pointer-events:none;'><img src='" + iconUri + "' style='width:48px;height:48px;margin-bottom:20px;border-radius:8px;'><h2>This tab is sleeping: <strong>" + esc(webName) + "</strong></h2><p style='color:#888;margin:0;'>Click anywhere (or switch to this tab) to wake it up.</p></div></div>";
            }
            document.documentElement.addEventListener('click', () => {
                const api = typeof browser !== 'undefined' ? browser : chrome;
                api.runtime.sendMessage({type: "WAKE_TAB"});
            });
        })();
    `;

    try {
        await browser.tabs.executeScript(tabId, { code: code });
    } catch (err) {
        delete sleepingTabs[tabId];
        await browser.storage.local.set({ sleepingTabs });
        console.error("Could not inject sleep page", err);
    }
}

browser.runtime.onMessage.addListener(async (msg, sender) => {
    if (!sender.tab?.id) return;
    if (msg.type === "WAKE_TAB") {
        await wakeTab(sender.tab.id);
        return;
    }
});

browser.tabs.onActivated.addListener(async ({ tabId }) => {
    if (!rec) return;
    await wakeTab(tabId);
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id) return;
    await sleep(tab.id, true);
});

async function autoSleep() {
    const inactiveTabs = await browser.tabs.query({ active: false });
    const now = Date.now();
    for (const tab of inactiveTabs) {
        if (!tab.lastAccessed) continue;
        if (tab.active || tab.pinned) continue;
        if (sleepingTabs[tab.id]) continue;
        const inactiveTime = (now - tab.lastAccessed) / 60000;
        if (inactiveTime > sleepTime) {
            await sleep(tab.id, false);
        }
    }
}

async function forceSleep() {
    const allTabs = await browser.tabs.query({});
    for (const tab of allTabs) {
        if (tab.active || tab.pinned) continue;
        if (sleepingTabs[tab.id]) continue;
        await sleep(tab.id, true);
    }
}

browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "check-inactive-tabs") {
        await autoSleep();
    }
});

browser.tabs.onRemoved.addListener(async (tabId) => {
    if (sleepingTabs[tabId]) {
        delete sleepingTabs[tabId];
        await browser.storage.local.set({ sleepingTabs });
    }
});

browser.storage.onChanged.addListener(async (changes, area) => {
    if (area === "local" && changes.sleepTime) {
        sleepTime = changes.sleepTime.newValue;
        alarmMin = Math.max(1, Math.min(5, Math.floor(sleepTime / 2)));
        upTitle();
        await refrsChk();
    }
    if (changes.whitelist) {
        whitelist = changes.whitelist.newValue || [];
    }
});

browser.runtime.onMessage.addListener(async (msg) => {
    if (msg.action === "forceSleep") {
        await forceSleep();
    }
});

async function wakeAllTabs() {
    const allTabs = await browser.tabs.query({});
    for (const tab of allTabs) {
        if (!sleepingTabs[tab.id]) continue;
        try {
            await wakeTab(tab.id);
        } catch (err) {
            console.error(`failed to wake ${tab.id}:`, err);
        }
    }
}


browser.runtime.onMessage.addListener(async (msg) => {
    if (msg.action === "WAKE_ALL_TABS") {
        await wakeAllTabs();
    }
});