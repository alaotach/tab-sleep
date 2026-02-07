(async function restoreState() {
  const data = await browser.storage.local.get("sleepingTabs");
  sleepingTabs = data.sleepingTabs || {};
})();
const sleepTime = 10;
let sleepingTabs = {};

browser.contextMenus.create({
    id: "sleep-tab",
    title: `Sleep Tab for ${sleepTime} minutes`,
    contexts: ["tab"],
});



async function sleep(tabId) {
    const tab = await browser.tabs.get(tabId);
    if (!tab || tab.active || tab.pinned) return;
    if (tab.mutedInfo?.muted === false && tab.audible) return;
    if (sleepingTabs[tabId]) return;
    sleepingTabs[tabId] = {
        url: tab.url,
        sleptAt: Date.now()
    };
    await browser.storage.local.set({ sleepingTabs });
    await browser.tabs.update(tabId, {
        url: browser.runtime.getURL("sleep.html"),
    });
}

browser.runtime.onMessage.addListener(async (msg, sender) => {
    if (msg.type !== "WAKE_TAB") return;
    const tabId = sender.tab.id;
    const data = sleepingTabs[tabId];
    if (!data) return;
    delete sleepingTabs[tabId];
    browser.tabs.update(tabId, {
        url: data.url,
        sleptAt: data.sleptAt,
    });
    await browser.storage.local.set({ sleepingTabs });
});

browser.tabs.onActivated.addListener(async ({ tabId }) => {
    const data = sleepingTabs[tabId];
    if (!data) return;
    delete sleepingTabs[tabId];
    await browser.tabs.update(tabId, {
        url: data.url,
        sleptAt: data.sleptAt,
    });
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

browser.alarms.create("check-inactive-tabs", {
    periodInMinutes: 5,
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