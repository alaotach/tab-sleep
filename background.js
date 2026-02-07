const sleepTime = 10;
const sleepingTabs = {};

browser.contextMenus.create({
    id: "sleep-tab",
    title: `Sleep Tab for ${sleepTime} minutes`,
    contexts: ["tab"],
});

async function sleep(tabId) {
    const tab = await browser.tabs.get(tabId);
    if (!tab || tab.active || tab.pinned) return;
    if (sleepingTabs[tabId]) return;
    sleepingTabs[tabId] = {
        url: tab.url,
    };
    await browser.tabs.update(tabId, {
        url: browser.runtime.getURL("sleep.html"),
    });
}

browser.runtime.onMessage.addListener((msg, sender) => {
    if (msg.type !== "WAKE_TAB") return;
    const tabId = sender.tab.id;
    const data = sleepingTabs[tabId];
    if (!data) return;
    delete sleepingTabs[tabId];
    browser.tabs.update(tabId, {
        url: data.url,
    });
});

browser.tabs.onActivated.addListener(async ({ tabId }) => {
    const data = sleepingTabs[tabId];
    if (!data) return;
    delete sleepingTabs[tabId];
    await browser.tabs.update(tabId, {
        url: data.url,
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