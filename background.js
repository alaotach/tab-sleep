let sleepTime = 10;
let sleepingTabs = {};
let alarmMin = Math.max(1, Math.min(5, Math.floor(sleepTime / 2)));
const pageUrl = browser.runtime.getURL("sleep.html");

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
    const data = await browser.storage.local.get("sleepTime");
    if (typeof data.sleepTime === "number") {
        sleepTime = data.sleepTime;
        alarmMin = Math.max(1, Math.min(5, Math.floor(sleepTime / 2)));
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
    const reconciled = {};
    for (const tab of all) {
        const p = parseUrl(tab.url);
        if (!p) continue;
        const item = storedTabs[tab.id] || p;
        reconciled[tab.id] = {
            url: item.url,
            webName: item.webName,
            sleptAt: item.sleptAt || Date.now()
        };
    }
    sleepingTabs = reconciled;
    await browser.storage.local.set({ sleepingTabs });
    for (const tab of all) {
        if (sleepingTabs[tab.id]) {
            try {
                await wakeTab(tab.id);
            } catch (err) {
                console.error(`failed to update ${tab.id}:`, err);
            }
        }
    }
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
    if (!data?.url) return false;
    delete sleepingTabs[tabId];
    try {
        await browser.tabs.update(tabId, { url: data.url });
    } catch (error) {
        sleepingTabs[tabId] = data;
        throw error;
    }
    await browser.storage.local.set({ sleepingTabs });
    return true;
}

async function sleep(tabId) {
    const tab = await browser.tabs.get(tabId);
    if (!tab || tab.active || tab.pinned) return;
    if (tab.mutedInfo?.muted === false && tab.audible) return;
    if (sleepingTabs[tabId]) return;
    sleepingTabs[tabId] = {
        url: tab.url,
        webName: getName(tab.url, tab.title),
        pgTitle: tab.title || "sus!",
        sleptAt: Date.now()
    };
    await browser.storage.local.set({ sleepingTabs });
    await browser.tabs.update(tabId, {
        url: makeUrl(sleepingTabs[tabId])
    });
}

function makeUrl(data) {
    const param = new URLSearchParams();
    param.set("url", data.url);
    param.set("webName", data.webName);
    param.set("pgTitle", data.pgTitle);
    param.set("sleptAt", data.sleptAt);
    return `${pageUrl}?${param.toString()}`;
}

function parseUrl(url) {
    if (!url || !url.startsWith(pageUrl)) return null;
    try {
        const parsedUrl = new URL(url);
        const urll = parsedUrl.searchParams.get("url");
        const webName = parsedUrl.searchParams.get("webName");
        const sleptAt = Number(parsedUrl.searchParams.get("sleptAt"));
        const sleptAtt = Number.isFinite(sleptAt) ? sleptAt : Date.now();
        if (!urll) return null;
        return { url: urll, webName, sleptAt: sleptAtt };
    } catch (err) {
        console.error(`failed ${url}:`, err);
        return null;
    }
}

browser.runtime.onMessage.addListener(async (msg, sender) => {
    if (!sender.tab?.id) return;
    if (msg.type === "WAKE_TAB") {
        await wakeTab(sender.tab.id);
        return;
    }
    if (msg.type === "GET_TITLE") {
        const data = sleepingTabs[sender.tab.id];
        if (data) {
            return { 
                webName: data.webName || getName(data.url, ""),
                url: data.url
            };
        }
        const p = parseUrl(sender.tab.url);
        if (p) {
            return { webName: p.webName || getName(p.url, ""), url: p.url };
        }
        return { webName: "sus!", url: sender.tab.url };

    }
});

browser.tabs.onActivated.addListener(async ({ tabId }) => {
    await wakeTab(tabId);
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id) return;
    await sleep(tab.id);
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
            await sleep(tab.id);
        }
    }
}

async function forceSleep() {
    const allTabs = await browser.tabs.query({});
    for (const tab of allTabs) {
        if (tab.active || tab.pinned) continue;
        if (sleepingTabs[tab.id]) continue;
        await sleep(tab.id);
        //debug log
        //console.log(`forced sleep ${tab.id}: (${tab.url})`);
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
});

browser.runtime.onMessage.addListener(async (msg) => {
    if (msg.action === "forceSleep") {
        await forceSleep();
    }
});

async function wakeAllTabs() {
    const allTabs = await browser.tabs.query({});
    for (const tab of allTabs) {
        if (sleepingTabs[tab.id]) {
            try {
                await wakeTab(tab.id);
            } catch (err) {
                console.error(`failed to wake ${tab.id}:`, err);
            }
        }
    }
}


browser.runtime.onMessage.addListener(async (msg) => {
    if (msg.action === "WAKE_ALL_TABS") {
        await wakeAllTabs();
    }
});