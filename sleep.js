async function loadInfo() {
    try {
        const info = await browser.runtime.sendMessage({ type: "GET_TITLE" });
        const el = document.getElementById("webName");
        if (el && info?.webName) {
            el.textContent = info.webName;
        }
    } catch (error) {
        const el = document.getElementById("webName");
        if (el) el.textContent = "Unknown site";
    }
}

loadInfo();

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        browser.runtime.sendMessage({ type: "WAKE_TAB" }).catch(() => {
        });
    }
});