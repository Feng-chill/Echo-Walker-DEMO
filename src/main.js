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
const tutorialIntroOverlay = document.getElementById("tutorialIntroOverlay");
const dialogueSpeaker = document.getElementById("dialogueSpeaker");
const dialogueText = document.getElementById("dialogueText");
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
      startTutorialIntro();
    } else if (mode === "fun") {
      modeSelectionMenu.classList.add("hidden");
      alert("娱乐模式正在开发中...");
      modeSelectionMenu.classList.remove("hidden");
    }
  });
});

const tutorialDialogues = [
  { speaker: "神秘人", text: "你终于醒了。\n别急着站起来，先听。\n这个世界里，最危险的东西不是沉默，而是 Noise。", color: "#FF00FF" },
  { speaker: "玩家", text: "Noise？那些红色的东西？", color: "#00FFFF" },
  { speaker: "神秘人", text: "不只是它们。\n催促、怀疑、失败后的回声……都会在这里长出形状。", color: "#FF00FF" },
  { speaker: "神秘人", text: "如果只用攻击回应攻击，你很快会被吞没。\n你要做的，是在它抵达前听见它。\n接住它，反射它，让噪声变成回响。", color: "#FF00FF" },
  { speaker: "玩家", text: "那我该往哪里走？", color: "#00FFFF" },
  { speaker: "神秘人", text: "向前。\n第一段回廊会教你如何活下来。\n走吧，回响行者。", color: "#FF00FF" }
];

let currentDialogueIndex = 0;
let lastDialogueClickTime = 0;

function startTutorialIntro() {
  currentDialogueIndex = 0;
  if (tutorialIntroOverlay) {
    tutorialIntroOverlay.classList.remove("hidden");
  }
  showDialogueLine();
}

function showDialogueLine() {
  if (currentDialogueIndex >= tutorialDialogues.length) {
    finishTutorialIntro();
    return;
  }
  
  const line = tutorialDialogues[currentDialogueIndex];
  if (dialogueSpeaker) {
    dialogueSpeaker.textContent = line.speaker;
    dialogueSpeaker.style.color = line.color;
  }
  if (dialogueText) {
    dialogueText.textContent = line.text;
    dialogueText.style.color = line.color;
    
    dialogueText.classList.remove("fade-in");
    void dialogueText.offsetWidth; // trigger reflow
    dialogueText.classList.add("fade-in");
  }
}

function advanceDialogue() {
  const now = performance.now();
  if (now - lastDialogueClickTime < 150) return; // 150ms cooldown
  lastDialogueClickTime = now;
  
  currentDialogueIndex++;
  showDialogueLine();
}

function finishTutorialIntro() {
  if (tutorialIntroOverlay) {
    tutorialIntroOverlay.classList.add("hidden");
  }
  game.startPlaying("tutorial");
}

if (tutorialIntroOverlay) {
  tutorialIntroOverlay.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    advanceDialogue();
  });
}

window.addEventListener("keydown", (e) => {
  if (!tutorialIntroOverlay || tutorialIntroOverlay.classList.contains("hidden")) return;
  
  if (e.code === "Space" || e.code === "Enter") {
    e.preventDefault();
    advanceDialogue();
  } else if (e.code === "Escape") {
    e.preventDefault();
    currentDialogueIndex = tutorialDialogues.length;
    finishTutorialIntro();
  }
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
