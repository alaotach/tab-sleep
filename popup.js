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