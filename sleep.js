document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        browser.runtime.sendMessage({ type: "WAKE_TAB" }).catch(() => {
        });
    }
});
