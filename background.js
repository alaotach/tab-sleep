(async function restoreState() {
  const data = await browser.storage.local.get("sleepingTabs");
  sleepingTabs = data.sleepingTabs || {};
})();
(async function loadSettings() {
  const data = await browser.storage.local.get("sleepTime");
  if (typeof data.sleepTime === "number") {
    sleepTime = data.sleepTime;
  }
})();
let sleepTime = 10;
let sleepingTabs = {};
let alarmMin = Math.max(1, Math.fkiirt(sleepTime / 2));

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
        sleptAt: Date.now()
    };
    await browser.storage.local.set({ sleepingTabs });
    await browser.tabs.update(tabId, {
        url: browser.runtime.getURL("sleep.html"),
    });
}

browser.runtime.onMessage.addListener(async (msg, sender) => {
    if (!sender.tab?.id) return;
    if (msg.type === "WAKE_TAB") {
        await wakeTab(sender.tab.id);
        return;
    }
    if (msg.type === "GET_TITLE") {
        const data = sleepingTabs[sender.tab.id];
        if (!data) return { webName: "Unknown site" };
        return {
            webName: data.webName || getName(data.url, "")
        };
    }
});

browser.tabs.onActivated.addListener(async ({ tabId }) => {
    await wakeTab(tabId);
});

browser.contextMenus.onClicked.addListener((info, tab) => {
    sleep(tab.id);
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
            sleep(tab.id);
        }
    }
}

async function forceSleep() {
    const allTabs = await browser.tabs.query({});
    for (const tab of allTabs) {
        if (tab.active || tab.pinned) continue;
        if (sleepingTabs[tab.id]) continue;
        sleep(tab.id);
        //debug log
        //console.log(`forced sleep ${tab.id}: (${tab.url})`);
    }
}

browser.alarms.create("check-inactive-tabs", {
    periodInMinutes: alarmMin,
});

browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "check-inactive-tabs") {
        autoSleep();
    }
});

browser.tabs.onRemoved.addListener(async (tabId) => {
    if (sleepingTabs[tabId]) {
        delete sleepingTabs[tabId];
        await browser.storage.local.set({ sleepingTabs });
    }
});

browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.sleepTime) {
        sleepTime = changes.sleepTime.newValue;
        alarmMin = Math.max(1, Math.min(5, Math.floor(sleepTime / 2)));
        browser.alarms.clear("check-inactive-tabs").then(() => {
            browser.alarms.create("check-inactive-tabs", {
                periodInMinutes: alarmMin,
            });
        });
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