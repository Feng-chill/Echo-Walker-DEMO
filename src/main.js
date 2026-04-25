const canvas = document.getElementById("gameCanvas");
const errorPanel = document.getElementById("errorPanel");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const backToMenuBtn = document.getElementById("backToMenuBtn");
const startupOverlay = document.getElementById("startupOverlay");
const startFullscreenBtn = document.getElementById("startFullscreenBtn");
const btnEnterGame = document.getElementById("btnEnterGame");
const gameViewport = document.getElementById("gameViewport");
const modeSelectionMenu = document.getElementById("modeSelectionMenu");
const levelSelectionMenu = document.getElementById("levelSelectionMenu");
const btnBackToModes = document.getElementById("btnBackToModes");
const orientationHint = document.getElementById("orientationHint");
const ctx = canvas.getContext("2d", { alpha: false });
const input = new Input(canvas);
const audio = new AudioManager();
const game = new Game(canvas, input, audio);

let lastTime = performance.now();
let running = true;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const viewportRect = gameViewport?.getBoundingClientRect();
  const rotated = isPseudoLandscape();
  const viewportWidth = rotated ? gameViewport.clientWidth : viewportRect?.width;
  const viewportHeight = rotated ? gameViewport.clientHeight : viewportRect?.height;
  const width = Math.max(320, Math.round(viewportWidth || window.innerWidth));
  const height = Math.max(240, Math.round(viewportHeight || window.innerHeight));
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  game.resize(width, height);
}

function isPseudoLandscape() {
  if (!gameViewport) return false;
  const isPortrait = window.innerWidth < window.innerHeight;
  const isCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches;
  return Boolean(isPortrait && isCoarsePointer);
}

function frame(now) {
  if (!running) return;
  try {
    const dt = Math.min(0.033, (now - lastTime) / 1000 || 0.016);
    lastTime = now;
    game.update(dt);
    game.render();
    input.endFrame();
    syncMenuState();
    syncAudioState();
    requestAnimationFrame(frame);
  } catch (error) {
    running = false;
    console.error(error);
    errorPanel.hidden = false;
  }
}

function checkOrientation() {
  if (!orientationHint) return;
  if (isPseudoLandscape()) {
    orientationHint.textContent = "进入后横拿手机游玩";
    orientationHint.style.display = "block";
  } else if (window.innerWidth > window.innerHeight) {
    orientationHint.style.display = "none";
  } else {
    orientationHint.textContent = "为了获得最佳体验，请反转到横屏";
    orientationHint.style.display = "block";
  }
}
window.addEventListener("resize", () => {
  resize();
  checkOrientation();
});
window.addEventListener("orientationchange", checkOrientation);
checkOrientation();
resize();
requestAnimationFrame(frame);

function updateFullscreenButton() {
  if (!fullscreenBtn) return;
  const element = document.documentElement;
  const canEnter = Boolean(element.requestFullscreen || element.webkitRequestFullscreen);
  if (!canEnter) {
    fullscreenBtn.hidden = true;
    return;
  }
  fullscreenBtn.hidden = false;
  const isFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  fullscreenBtn.textContent = isFullscreen ? "退出全屏" : "进入全屏";
}

if (fullscreenBtn) {
  fullscreenBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const element = document.documentElement;
    const isFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    if (!isFullscreen) {
      const request = element.requestFullscreen || element.webkitRequestFullscreen;
      if (request) request.call(element);
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
    }
  });
}

if (backToMenuBtn) {
  backToMenuBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    audio.unlock();
    game.state = "menu";
  });
}

if (startFullscreenBtn && startupOverlay) {
  startFullscreenBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    audio.unlock();
    
    const element = document.documentElement;
    const request = element.requestFullscreen || element.webkitRequestFullscreen;
    const enterGame = () => {
      startupOverlay.classList.add("hidden");
      startupOverlay.style.opacity = 0;
      setTimeout(() => {
        startupOverlay.style.display = "none";
        modeSelectionMenu.classList.remove("hidden");
        resize();
        syncAudioState();
      }, 500);
    };

    if (request) {
      const fullscreenResult = request.call(element);
      if (fullscreenResult?.catch) {
        fullscreenResult.catch(err => console.warn("Fullscreen request failed:", err)).finally(enterGame);
        return;
      }
    }

    enterGame();
  });
}

if (btnEnterGame && startupOverlay && modeSelectionMenu) {
  btnEnterGame.addEventListener("click", () => {
    audio.unlock();
    startupOverlay.classList.add("hidden");
    startupOverlay.style.opacity = 0;
    setTimeout(() => {
      startupOverlay.style.display = "none";
      modeSelectionMenu.classList.remove("hidden");
      syncAudioState();
    }, 500);
  });
}

const modeCards = document.querySelectorAll("#modeSelectionMenu .mode-card");
modeCards.forEach(card => {
  card.addEventListener("click", () => {
    audio.unlock();
    const mode = card.dataset.mode;
    
    if (mode === "classic") {
      modeSelectionMenu.classList.add("hidden");
      levelSelectionMenu.classList.remove("hidden");
    } else if (mode === "tutorial") {
      modeSelectionMenu.classList.add("hidden");
      game.startPlaying(mode);
    } else if (mode === "fun") {
      modeSelectionMenu.classList.add("hidden");
      alert("娱乐模式正在开发中...");
      modeSelectionMenu.classList.remove("hidden");
    }
  });
});

const levelCards = document.querySelectorAll("#levelSelectionMenu .level-card");
levelCards.forEach(card => {
  card.addEventListener("click", () => {
    audio.unlock();
    const level = card.dataset.level;
    if (level === "silent-corridor") {
      levelSelectionMenu.classList.add("hidden");
      game.startPlaying("classic", level);
      return;
    }
    alert("前方正在施工");
  });
});

if (btnBackToModes) {
  btnBackToModes.addEventListener("click", () => {
    audio.unlock();
    levelSelectionMenu.classList.add("hidden");
    modeSelectionMenu.classList.remove("hidden");
  });
}

let previousGameState = null;
function syncMenuState() {
  if (game.state !== previousGameState) {
    if (game.state === "menu") {
      if (backToMenuBtn) backToMenuBtn.hidden = true;
      // Re-show menu when game returns to menu
      if (startupOverlay.style.display === "none") {
        modeSelectionMenu.classList.remove("hidden");
        levelSelectionMenu.classList.add("hidden");
      }
    } else {
      if (backToMenuBtn) backToMenuBtn.hidden = false;
      modeSelectionMenu.classList.add("hidden");
      levelSelectionMenu.classList.add("hidden");
    }
    previousGameState = game.state;
  }
}

function syncAudioState() {
  const startupVisible = startupOverlay && startupOverlay.style.display !== "none" && !startupOverlay.classList.contains("hidden");
  const menuVisible = modeSelectionMenu && !modeSelectionMenu.classList.contains("hidden");
  const levelVisible = levelSelectionMenu && !levelSelectionMenu.classList.contains("hidden");

  if (startupVisible) {
    audio.stopBgm();
    return;
  }

  if (game.state === "playing" && game.mode === "classic") {
    audio.playBgm("scene");
    return;
  }

  if (game.state === "playing" && game.mode === "tutorial") {
    audio.playBgm("scene", 0.12);
    return;
  }

  if (game.state === "menu" && (menuVisible || levelVisible)) {
    audio.playBgm("menu");
    return;
  }

  audio.stopBgm();
}

document.addEventListener("fullscreenchange", () => {
  updateFullscreenButton();
  resize();
});
document.addEventListener("webkitfullscreenchange", () => {
  updateFullscreenButton();
  resize();
});
window.addEventListener("keydown", () => {
  audio.unlock();
  syncAudioState();
}, { once: true });
updateFullscreenButton();
