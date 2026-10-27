const mainFrame = document.getElementById("mainFrame");
const botWindows = Array.from(document.querySelectorAll(".botWindow"));
const botFrames = botWindows.map((window) => window.querySelector(".botFrame"));
const panel = document.getElementById("panel");
const panelOpen = document.getElementById("panelOpen");
const panelHide = document.getElementById("panelHide");
const syncStatusEl = document.getElementById("syncStatus");
const statusEl = document.getElementById("status");
const botModeSelect = document.getElementById("botMode");
const lobbyCodeInput = document.getElementById("lobbyCode");
const autoAllOn = document.getElementById("autoAllOn");
const autoReady = document.getElementById("autoReady");
const multibotButton = document.getElementById("multibot");
const relayPatternInput = document.getElementById("relayPattern");
const applyRelayButton = document.getElementById("applyRelay");
const verifyNextButton = document.getElementById("verifyNext");

const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
const clientUrl = isLocal
  ? new URL("../goodclient_v2/build/", location.href).href
  : new URL("../goodclient_v2/", location.href).href;

mainFrame.src = clientUrl;

let lastSyncedCode = "";
let multibot = false;
const autoAllOnApplied = botFrames.map(() => false);

relayPatternInput.value = localStorage.getItem("tulipbot_relayPattern") || "";
let lastRelayPattern = relayPatternInput.value.trim();

function relayBaseFor(index) {
  const pattern = relayPatternInput.value.trim();
  if (!pattern) return "";
  return pattern.includes("{n}") ? pattern.replace(/\{n\}/g, String(index + 1)) : pattern;
}

function botUrl(index) {
  const relayBase = relayBaseFor(index);
  return relayBase ? `${clientUrl}?relay=${encodeURIComponent(relayBase)}` : clientUrl;
}

function loadBot(index) {
  botFrames[index].src = botUrl(index);
}

function loadAllBots() {
  botFrames.forEach((_frame, index) => loadBot(index));
}


function getFrameFx(frame) {
  try { return frame.contentWindow.__fx || null; } catch (_error) { return null; }
}

function getMainFx() {
  return getFrameFx(mainFrame);
}

function getBotFx(index) {
  return getFrameFx(botFrames[index]);
}

function getBotAutomation(index) {
  const fx = getBotFx(index);
  return fx && fx.openingAutomation ? fx.openingAutomation : null;
}

function getCustomLobbyState(fx) {
  return fx && fx.customLobby && typeof fx.customLobby.getState === "function" ? fx.customLobby.getState() : null;
}

function getGameLobbyState(fx) {
  return fx && typeof fx.getGameLobbyState === "function" ? fx.getGameLobbyState() : null;
}

function hasTurnstileWidget(index) {
  try {
    const doc = botFrames[index].contentDocument;
    if (!doc) return false;
    const widget = doc.querySelector('iframe[src*="challenges.cloudflare.com"]');
    if (!widget) return false;
    if (typeof widget.checkVisibility === "function" && !widget.checkVisibility()) return false;
    const rect = widget.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  } catch (_error) {
    return false;
  }
}

function updateVerifyStatus(states) {
  states.forEach((state, index) => {
    state.verifying = hasTurnstileWidget(index);
    botWindows[index].classList.toggle("needs-verify", state.verifying);
  });
}

function focusBot(index) {
  const windowElement = botWindows[index];
  if (!windowElement) return;
  const previousZ = windowElement.style.zIndex;
  windowElement.classList.add("attention");
  windowElement.style.zIndex = "45";
  syncStatusEl.textContent = `Bot ${index + 1}: click the Cloudflare checkbox in this view`;
  setTimeout(() => windowElement.classList.remove("attention"), 1600);
  setTimeout(() => {
    windowElement.style.zIndex = previousZ || (multibot ? "15" : "20");
  }, 1700);
}

function readMainLobbyCode() {
  try {
    const state = getCustomLobbyState(getMainFx());
    if (state && state.active && state.code) return String(state.code).trim().toLowerCase();
    const hash = mainFrame.contentWindow.location.hash || "";
    if (hash.startsWith("#lobby=")) {
      const hashCode = hash.slice(7).trim().toLowerCase();
      if (hashCode) return hashCode;
    }
    const doc = mainFrame.contentDocument;
    if (doc) {
      const nodes = doc.querySelectorAll("h1, h2, h3, .window");
      for (const node of nodes) {
        const text = String(node.textContent || "").trim();
        const match = text.match(/(?:^|\n)\s*Custom Lobby\s+([a-z0-9]+)\s*$/i);
        if (match) return match[1].toLowerCase();
      }
    }
  } catch (_error) {}
  return "";
}

function joinBotLobby(code) {
  const normalized = String(code || "").trim().toLowerCase();
  if (!normalized) return;
  botFrames.forEach((frame, index) => {
    try {
      const win = frame.contentWindow;
      if (win && win.__fx && win.document.readyState === "complete") {
        win.location.hash = "lobby=" + normalized;
      } else {
        frame.src = botUrl(index) + "#lobby=" + normalized;
      }
    } catch (_error) {}
  });
  lastSyncedCode = normalized;
  lobbyCodeInput.value = normalized;
  syncStatusEl.textContent = `Lobby: bots joined ${normalized}`;
}

function updateSyncStatus() {
  const mainFx = getMainFx();
  const mainLobby = getCustomLobbyState(mainFx);
  const mainGame = getGameLobbyState(mainFx);
  if (mainLobby && mainLobby.active) {
    const bits = [`main ${mainLobby.code || "connecting…"}${mainLobby.isHost ? " (host)" : ""}`];
    if (mainGame && mainGame.inLobby) bits.push(mainGame.ready ? "ready" : "not ready");
    syncStatusEl.textContent = "Lobby: " + bits.join(" · ");
    return;
  }
  if (mainGame && mainGame.inLobby) {
    syncStatusEl.textContent = `Lobby: main in multiplayer lobby · ${mainGame.ready ? "ready" : "not ready"}`;
    return;
  }
  syncStatusEl.textContent = "Lobby: main not in a lobby";
}

function syncFromMain(force = false) {
  const code = readMainLobbyCode();
  if (!code) {
    updateSyncStatus();
    if (force) syncStatusEl.textContent += " · no custom lobby code";
    return;
  }
  if (!force && code === lastSyncedCode) {
    updateSyncStatus();
    return;
  }
  joinBotLobby(code);
}

function setPanelVisible(visible) {
  panel.classList.toggle("hidden", !visible);
  panelOpen.classList.toggle("hidden", visible);
}

function setButtonsEnabled(enabled) {
  document.querySelectorAll("#panel button, #panel select, #panel input").forEach((element) => {
    if (["reload", "panelHide", "joinLobby", "syncLobby", "lobbyCode", "autoAllOn", "autoReady", "multibot", "relayPattern", "applyRelay", "verifyNext"].includes(element.id)) return;
    element.disabled = !enabled;
  });
}

function setMultibot(enabled) {
  multibot = Boolean(enabled);
  if (multibot) {
    botWindows.forEach((windowElement) => {
      windowElement.classList.remove("minimized");
      windowElement.querySelector(".botMinimize").textContent = "–";
    });
  }
  document.body.classList.toggle("multibot", multibot);
  multibotButton.classList.toggle("active", multibot);
}

function maybeAutoReady(fx, game) {
  if (!autoReady || !autoReady.checked) return;
  const custom = getCustomLobbyState(fx);
  if (custom && custom.active && !custom.windowHidden) return;
  if (!game || !game.inLobby || game.ready) return;
  if (typeof fx.setGameLobbyReady !== "function") return;
  try { fx.setGameLobbyReady(true); } catch (_error) {}
}

function renderBotStatus() {
  const states = botFrames.map((frame, index) => {
    const fx = getBotFx(index);
    const automation = getBotAutomation(index);
    const game = getGameLobbyState(fx);
    return { fx, automation, game };
  });
  updateVerifyStatus(states);
  const loaded = states.filter((state) => state.fx && state.automation);
  if (!loaded.length) {
    statusEl.textContent = "Bots: loading…";
    setButtonsEnabled(false);
    return;
  }

  const lobbyCount = states.filter((state) => state.game && state.game.inLobby).length;
  const readyCount = states.filter((state) => state.game && state.game.inLobby && state.game.ready).length;
  const verifyingCount = states.filter((state) => state.verifying).length;
  const inGameCount = states.filter((state) => state.automation && Number(state.automation.lastTick ?? -1) >= 0).length;
  const openingCount = states.filter((state) => state.fx && state.fx.settings && state.fx.settings.openingAutomationEnabled).length;
  const attackCount = states.reduce((total, state) => (
    total + (state.automation && Array.isArray(state.automation.attacks) ? state.automation.attacks.length : 0)
  ), 0);

  statusEl.textContent = `Bots ${states.length} · lobby ${lobbyCount} · ready ${readyCount} · verify ${verifyingCount} · in game ${inGameCount} · opening ${openingCount} · attacks ${attackCount}`;

  const first = loaded[0];
  const mode = first.automation.getAutoAttackMode();
  botModeSelect.value = mode;

  const anyOpening = states.some((state) => state.fx && state.fx.settings && state.fx.settings.openingAutomationEnabled);
  const anyInfinite = states.some((state) => state.fx && state.fx.settings && state.fx.settings.infiniteExpansionEnabled);
  document.getElementById("allOn").classList.toggle("active", Boolean(anyOpening && anyInfinite && mode !== "off"));
  document.getElementById("opening").classList.toggle("active", anyOpening);
  document.getElementById("infinite").classList.toggle("active", anyInfinite);
  setButtonsEnabled(true);

  states.forEach((state, index) => {
    if (!state.automation) return;
    const tick = Number(state.automation.lastTick ?? -1);
    if (tick < 0) autoAllOnApplied[index] = false;
    else if (autoAllOn.checked && !autoAllOnApplied[index]) {
      autoAllOnApplied[index] = true;
      state.automation.setAllAutomationEnabled(true);
    }
    maybeAutoReady(state.fx, state.game);
  });
}

function callAutomation(action) {
  let any = false;
  botFrames.forEach((_frame, index) => {
    const automation = getBotAutomation(index);
    if (!automation) return;
    action(automation);
    any = true;
  });
  if (any) renderBotStatus();
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
document.getElementById("joinLobby").addEventListener("click", () => joinBotLobby(lobbyCodeInput.value));
document.getElementById("syncLobby").addEventListener("click", () => syncFromMain(true));
document.getElementById("reload").addEventListener("click", () => {
  lastSyncedCode = "";
  loadAllBots();
});
applyRelayButton.addEventListener("click", () => {
  const pattern = relayPatternInput.value.trim();
  localStorage.setItem("tulipbot_relayPattern", pattern);
  if (pattern === lastRelayPattern) {
    syncStatusEl.textContent = "Relay unchanged; bots keep their current session";
    return;
  }
  lastRelayPattern = pattern;
  lastSyncedCode = "";
  loadAllBots();
});
verifyNextButton.addEventListener("click", () => {
  const index = botFrames.findIndex((_frame, botIndex) => hasTurnstileWidget(botIndex));
  if (index < 0) {
    syncStatusEl.textContent = "No bot is showing a Cloudflare verification widget";
    return;
  }
  focusBot(index);
});
multibotButton.addEventListener("click", () => setMultibot(!multibot));
panelHide.addEventListener("click", () => setPanelVisible(false));
panelOpen.addEventListener("click", () => setPanelVisible(true));

function placeDefaultWindows() {
  const gap = 12;
  const width = Math.min(window.innerWidth * 0.34, 420);
  const height = Math.min(window.innerHeight * 0.34, 320);
  const positions = [
    { left: window.innerWidth - width - gap, top: window.innerHeight - height - gap },
    { left: gap, top: window.innerHeight - height - gap },
    { left: window.innerWidth - width - gap, top: gap },
  ];
  botWindows.forEach((windowElement, index) => {
    const position = positions[index] || positions[0];
    windowElement.style.left = `${Math.max(gap, position.left)}px`;
    windowElement.style.top = `${Math.max(gap, position.top)}px`;
    windowElement.style.right = "auto";
    windowElement.style.bottom = "auto";
    windowElement.style.width = `${width}px`;
    windowElement.style.height = `${height}px`;
  });
}

botWindows.forEach((windowElement, index) => {
  const header = windowElement.querySelector(".botHeader");
  const minimize = windowElement.querySelector(".botMinimize");
  const reload = windowElement.querySelector(".botReload");
  let drag = null;

  header.addEventListener("pointerdown", (event) => {
    if (multibot || event.target.closest("button")) return;
    const rect = windowElement.getBoundingClientRect();
    drag = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    header.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  header.addEventListener("pointermove", (event) => {
    if (multibot || !drag || drag.pointerId !== event.pointerId) return;
    const left = Math.min(Math.max(0, event.clientX - drag.offsetX), window.innerWidth - windowElement.offsetWidth);
    const top = Math.min(Math.max(0, event.clientY - drag.offsetY), window.innerHeight - windowElement.offsetHeight);
    windowElement.style.left = `${left}px`;
    windowElement.style.top = `${top}px`;
    windowElement.style.right = "auto";
    windowElement.style.bottom = "auto";
  });
  const stopDrag = (event) => {
    if (drag && drag.pointerId === event.pointerId) drag = null;
  };
  header.addEventListener("pointerup", stopDrag);
  header.addEventListener("pointercancel", stopDrag);

  if (reload) {
    reload.addEventListener("click", (event) => {
      event.stopPropagation();
      loadBot(index);
    });
  }

  minimize.addEventListener("click", () => {
    windowElement.classList.toggle("minimized");
    minimize.textContent = windowElement.classList.contains("minimized") ? "+" : "–";
  });
});

mainFrame.addEventListener("load", () => {
  syncStatusEl.textContent = "Lobby: main client loaded";
});

botFrames.forEach((frame) => {
  frame.addEventListener("load", () => {
    statusEl.textContent = "Bots: client loaded";
    renderBotStatus();
  });
});

setInterval(() => {
  syncFromMain(false);
  renderBotStatus();
}, 800);

placeDefaultWindows();
loadAllBots();
updateSyncStatus();
renderBotStatus();
