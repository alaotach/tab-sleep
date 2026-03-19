const input = document.getElementById("sleepTime");
browser.storage.local.get("sleepTime").then((data) => {
  input.value = data.sleepTime ?? 30;
});
input.addEventListener("change", () => {
  const value = Number(input.value);
  if (value >= 1) {
    browser.storage.local.set({ sleepTime: value });
  }
});

const forceSleepButton = document.getElementById("forceSleep");
forceSleepButton.addEventListener("click", () => {
  browser.runtime.sendMessage({ action: "forceSleep" });
});

const wakeAllButton = document.getElementById("wakeButton");
wakeAllButton.addEventListener("click", () => {
  browser.runtime.sendMessage({ action: "WAKE_ALL_TABS" });
});

document.addEventListener("DOMContentLoaded", async () => {
  const inputEl = document.getElementById("input");
  const addBtn = document.getElementById("add-white");
  const listEl = document.getElementById("whitelistt");
  const data = await browser.storage.local.get("whitelist");
  const white = data.whitelist || [];
  function rdrList(){
    listEl.innerHTML = "";
    white.forEach((i, j) => {
      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.marginBottom = "5px";
      li.textContent = i;
      const rmBtn = document.createElement("button");
      rmBtn.textContent = "x";
      rmBtn.onclick = async () => {
        white.splice(j, 1);
        await browser.storage.local.set({ whitelist: white });
        rdrList();
      };
      li.appendChild(rmBtn);
      listEl.appendChild(li);
    });
  }
  addBtn.addEventListener("click", async () => {
    const val = inputEl.value.trim().toLowerCase();
    if (val && !white.includes(val)) {
      white.push(val);
      await browser.storage.local.set({ whitelist: white });
      inputEl.value = "";
      rdrList();
    }
  });
  rdrList();
});