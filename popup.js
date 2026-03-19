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

const sleepLeftBtn = document.getElementById("sleepLeft");
if (sleepLeftBtn) {
  sleepLeftBtn.addEventListener("click", () => {
    browser.runtime.sendMessage({ action: "SLEEP_LEFT" });
  });
}

const sleepRightBtn = document.getElementById("sleepRight");
if (sleepRightBtn) {
  sleepRightBtn.addEventListener("click", () => {
    browser.runtime.sendMessage({ action: "SLEEP_RIGHT" });
  });
}

const wakeLBtn = document.getElementById("wakeLeft");
if (wakeLBtn) {
  wakeLBtn.addEventListener("click", () => {
    browser.runtime.sendMessage({ action: "WAKE_LEFT" });
  });
}

const wakeRBtn = document.getElementById("wakeRight");
if (wakeRBtn) {
  wakeRBtn.addEventListener("click", () => {
    browser.runtime.sendMessage({ action: "WAKE_RIGHT" });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const tabsData = await browser.storage.local.get(["tabsSlept"]);
  const count = tabsData.tabsSlept || 0;
  const countEl = document.getElementById("statCount");
  if (countEl) {
    countEl.textContent = count;
  }
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.tabsSlept) {
      if (countEl) {
        countEl.textContent = changes.tabsSlept.newValue || 0;
      }
    }
  });

  const inputEl = document.getElementById("input");
  const addBtn = document.getElementById("add-white");
  const listEl = document.getElementById("whitelistt");
  const data = await browser.storage.local.get(["whitelist"]);
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

