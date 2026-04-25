class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.actions = new Set();
    this.pressed = new Set();
    this.pointerStart = false;
    this.pointer = { x: 0, y: 0, pressed: false };
    this.axis = { x: 0, y: 0 };
    this.touchAxis = { x: 0, y: 0 };

    this.keyMap = new Map([
      ["KeyA", "left"],
      ["ArrowLeft", "left"],
      ["KeyD", "right"],
      ["ArrowRight", "right"],
      ["KeyW", "up"],
      ["ArrowUp", "up"],
      ["KeyS", "down"],
      ["ArrowDown", "down"],
      ["Space", "jump"],
      ["KeyJ", "attack"],
      ["KeyL", "parry"],
      ["KeyI", "ultimate"],
      ["KeyP", "weapon"],
      ["Enter", "start"],
      ["KeyR", "restart"]
    ]);

    this.bindKeyboard();
    this.bindTouchControls();
    this.bindJoystick();
    this.bindCanvasStart();
  }

  isPseudoLandscape() {
    const viewport = document.getElementById("gameViewport");
    if (!viewport) return false;
    return Boolean(window.innerWidth < window.innerHeight &&
      window.matchMedia?.("(pointer: coarse)").matches);
  }

  isMobileTouchLayout() {
    return Boolean(window.matchMedia?.("(pointer: coarse)").matches);
  }

  screenToCanvasPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    if (!this.isPseudoLandscape()) {
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }

    const visualX = event.clientX - rect.left;
    const visualY = event.clientY - rect.top;
    const scaleX = this.canvas.clientWidth / Math.max(1, rect.height);
    const scaleY = this.canvas.clientHeight / Math.max(1, rect.width);
    return {
      x: visualY * scaleX,
      y: (rect.width - visualX) * scaleY
    };
  }

  bindKeyboard() {
    window.addEventListener("keydown", (event) => {
      const action = this.keyMap.get(event.code);
      if (!action) return;
      if (!this.actions.has(action)) this.pressed.add(action);
      this.actions.add(action);
      this.keys.add(event.code);
      this.updateCombinedAxis();
    });

    window.addEventListener("keyup", (event) => {
      const action = this.keyMap.get(event.code);
      if (!action) return;
      this.keys.delete(event.code);
      const stillHeld = [...this.keys].some((code) => this.keyMap.get(code) === action);
      if (!stillHeld) this.actions.delete(action);
      this.updateCombinedAxis();
    });
  }

  bindTouchControls() {
    const buttons = document.querySelectorAll("[data-action]");
    buttons.forEach((button) => {
      const action = button.dataset.action;
      const press = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!this.actions.has(action)) this.pressed.add(action);
        this.actions.add(action);
      };
      const release = (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.actions.delete(action);
      };

      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("pointerleave", release);
      button.addEventListener("selectstart", (event) => event.preventDefault());
      button.addEventListener("contextmenu", (event) => event.preventDefault());
    });
  }

  bindJoystick() {
    const zone = document.getElementById("joystickZone");
    const base = document.getElementById("joystickBase");
    const knob = document.getElementById("joystickKnob");
    if (!zone || !base || !knob) return;

    let activeTouchId = null;
    let baseCenter = { x: 0, y: 0 };
    const maxRadius = 60; // 120px / 2

    const updateKnob = (x, y) => {
      knob.style.transform = `translate(${x}px, ${y}px)`;
    };

    const handleStart = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (activeTouchId !== null) return;
      const touch = e.changedTouches ? e.changedTouches[0] : e;
      activeTouchId = touch.identifier ?? "mouse";
      const rect = base.getBoundingClientRect();
      baseCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      handleMove(e);
    };

    const handleMove = (e) => {
      if (activeTouchId === null) return;
      e.preventDefault();
      e.stopPropagation();
      let touch = null;
      if (e.changedTouches) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === activeTouchId) {
            touch = e.changedTouches[i];
            break;
          }
        }
      } else {
        touch = e;
      }
      if (!touch) return;

      const screenDx = touch.clientX - baseCenter.x;
      const screenDy = touch.clientY - baseCenter.y;
      const dx = this.isPseudoLandscape() ? screenDy : screenDx;
      const dy = this.isPseudoLandscape() ? -screenDx : screenDy;
      const horizontalOnly = this.isMobileTouchLayout();
      const distance = horizontalOnly ? Math.abs(dx) : Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      let knobX = 0;
      let knobY = 0;
      if (horizontalOnly) {
        const deadZone = 10;
        if (distance > deadZone) {
          knobX = dx < 0 ? -maxRadius * 0.78 : maxRadius * 0.78;
        }
      } else {
        const radius = Math.min(distance, maxRadius);
        knobX = Math.cos(angle) * radius;
        knobY = Math.sin(angle) * radius;
      }

      updateKnob(knobX, knobY);
      this.touchAxis.x = horizontalOnly ? Math.sign(knobX) : knobX / maxRadius;
      this.touchAxis.y = horizontalOnly ? 0 : knobY / maxRadius;
      this.updateCombinedAxis();
    };

    const handleEnd = (e) => {
      if (activeTouchId === null) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.changedTouches) {
        let found = false;
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === activeTouchId) found = true;
        }
        if (!found) return;
      }
      activeTouchId = null;
      updateKnob(0, 0);
      this.touchAxis.x = 0;
      this.touchAxis.y = 0;
      this.updateCombinedAxis();
    };

    zone.addEventListener("touchstart", handleStart, { passive: false });
    zone.addEventListener("touchmove", handleMove, { passive: false });
    zone.addEventListener("touchend", handleEnd, { passive: false });
    zone.addEventListener("touchcancel", handleEnd, { passive: false });

    // For mouse testing
    zone.addEventListener("mousedown", handleStart);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
  }

  updateCombinedAxis() {
    let kx = 0;
    let ky = 0;
    if (this.actions.has("left")) kx -= 1;
    if (this.actions.has("right")) kx += 1;
    if (this.actions.has("up")) ky -= 1;
    if (this.actions.has("down")) ky += 1;

    this.axis.x = Math.abs(this.touchAxis.x) > 0.1 ? this.touchAxis.x : kx;
    this.axis.y = this.isMobileTouchLayout() ? ky : (Math.abs(this.touchAxis.y) > 0.1 ? this.touchAxis.y : ky);
  }

  bindCanvasStart() {
    this.canvas.addEventListener("pointerdown", (event) => {
      const point = this.screenToCanvasPoint(event);
      this.pointer.x = point.x;
      this.pointer.y = point.y;
      this.pointer.pressed = true;
      this.pointerStart = true;
      this.pressed.add("start");
    });
  }

  isDown(action) {
    if (action === "left") return this.axis.x < -0.3;
    if (action === "right") return this.axis.x > 0.3;
    if (action === "down") return this.axis.y > 0.5;
    if (action === "up") return this.axis.y < -0.5;
    return this.actions.has(action);
  }

  wasPressed(action) {
    return this.pressed.has(action);
  }

  endFrame() {
    this.pressed.clear();
    this.pointerStart = false;
    this.pointer.pressed = false;
  }
}
