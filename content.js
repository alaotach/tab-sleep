let scroll;

window.addEventListener("scroll", () => {
    if (document.title.startsWith("Zzz...")) return;
    clearTimeout(scroll);
    scroll = setTimeout(() => {
        browser.storage.local.set({
            [location.href]: window.scrollY,
        });
    }, 300);
});

window.addEventListener("load", async () => {
    if (document.title.startsWith("Zzz...")) return;
    const data = await browser.storage.local.get(location.href);
    if (data[location.href]) {
        window.scrollTo(0, data[location.href]);
    }
});