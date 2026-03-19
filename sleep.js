function setIcon(url) {
    if (!url) return;
    const icon = document.querySelector('link[rel="icon"]');
    if (!icon) return;
    icon.href = "http://www.google.com/s2/favicons?domain=" + encodeURIComponent(url) + "&sz=64";
}

async function loadInfo() {
    try {
        const info = await browser.runtime.sendMessage({ type: "GET_TITLE" });
        const el = document.getElementById("webName");
        const name = info?.pgTitle || info?.webName || "sus!";
        if (el) el.textContent = name;
        document.title = `${name} - Sleeping`;
        setIcon(info?.url);
    } catch (error) {
        const el = document.getElementById("webName");
        if (el) el.textContent = "sus!";
        document.title = "sus - Sleeping";
    }
}

loadInfo();

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        browser.runtime.sendMessage({ type: "WAKE_TAB" }).catch(() => {
        });
    }
});
