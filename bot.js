const frame = document.getElementById("botFrame");
const statusEl = document.getElementById("status");
const botModeSelect = document.getElementById("botMode");

const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
const clientUrl = isLocal
  ? new URL("../goodclient_v2/build/", location.href).href
  : new URL("../goodclient_v2/", location.href).href;

frame.src = clientUrl;

function getFx() {
  try {
    return frame.contentWindow.__fx || null;
  } catch (_error) {
    return null;
  }
}

function getAutomation() {
  const fx = getFx();
  return fx && fx.openingAutomation ? fx.openingAutomation : null;
}

function setButtonsEnabled(enabled) {
  document.querySelectorAll("#panel button, #panel select").forEach((element) => {
    if (element.id === "reload") return;
    element.disabled = !enabled;
  });
}

function renderStatus() {
  const fx = getFx();
  const automation = getAutomation();
  if (!fx || !automation) {
    statusEl.textContent = "Client not ready. Join the bot client, then return here.";
    setButtonsEnabled(false);
    return;
  }
  const settings = fx.settings || {};
  const mode = automation.getAutoAttackMode();
  const tick = Number(automation.lastTick ?? -1);
  const attacks = Array.isArray(automation.attacks) ? automation.attacks.length : 0;
  statusEl.textContent = `tick ${tick} · opening ${settings.openingAutomationEnabled ? "on" : "off"} · infinite ${settings.infiniteExpansionEnabled ? "on" : "off"} · bot ${mode} · opening attacks ${attacks}`;
  botModeSelect.value = mode;
  document.getElementById("allOn").classList.toggle(
    "active",
    Boolean(settings.openingAutomationEnabled && settings.infiniteExpansionEnabled && mode !== "off")
  );
  document.getElementById("opening").classList.toggle("active", Boolean(settings.openingAutomationEnabled));
  document.getElementById("infinite").classList.toggle("active", Boolean(settings.infiniteExpansionEnabled));
  setButtonsEnabled(true);
}

function callAutomation(action) {
  const automation = getAutomation();
  if (!automation) return;
  action(automation);
  renderStatus();
}

document.getElementById("allOn").addEventListener("click", () => {
  callAutomation((automation) => automation.setAllAutomationEnabled(true));
});

document.getElementById("allOff").addEventListener("click", () => {
  callAutomation((automation) => automation.setAllAutomationEnabled(false));
});

document.getElementById("opening").addEventListener("click", () => {
  callAutomation((automation) => automation.toggleOpeningAutomationEnabled());
});

document.getElementById("infinite").addEventListener("click", () => {
  callAutomation((automation) => automation.toggleInfiniteExpansion());
});

botModeSelect.addEventListener("change", () => {
  callAutomation((automation) => automation.setAutoAttackMode(botModeSelect.value));
});

document.getElementById("reload").addEventListener("click", () => {
  frame.src = clientUrl;
});

frame.addEventListener("load", () => {
  statusEl.textContent = "Client loaded. Join the same lobby, then use the controls.";
  renderStatus();
});

setInterval(renderStatus, 500);
renderStatus();
