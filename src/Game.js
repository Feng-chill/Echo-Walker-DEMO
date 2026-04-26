class Game {
  constructor(canvas, input, audio = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.input = input;
    this.audio = audio;
    this.width = 960;
    this.height = 540;
    this.state = "menu";
    this.camera = { x: 0, y: 0 };
    this.player = new Player(this.audio);
    this.effects = new EffectSystem();
    this.hud = new HUD();
    this.stats = this.createStats();
    this.projectiles = [];
    this.combat = new CombatSystem(this.stats, this.effects, this.projectiles, this.audio);
    this.platforms = CONFIG.level.platforms;
    this.enemies = [];
    this.mode = "classic";
    this.classicLevelId = "silent-corridor";
    this.funModeId = "mode-one";
    this.funWave = 0;
    this.funWaveSize = 10;
    this.fps = 60;
    this.result = null;
    this.menuPulse = 0;
    this.basePlatforms = [];
    this.stageBlocks = [];
    this.enemyOnlyPlatforms = [];
    this.enemyPlatforms = [];
    this.roomStates = new Map();
    this.activeRoomId = null;
    this.barrierMessageTimer = 0;
    this.resetRun();
  }

  createStats() {
    return {
      time: 0,
      damageTaken: 0,
      perfectParry: 0,
      normalParry: 0,
      combo: 0,
      maxCombo: 0,
      bursts: 0,
      shieldBlock: 0,
      shieldReflect: 0
    };
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  getMainMenuButtons() {
    const buttonWidth = Math.min(360, this.width - 64);
    const buttonHeight = 52;
    const x = (this.width - buttonWidth) / 2;
    const startY = Math.max(190, this.height * 0.42);
    const gap = 16;
    return [
      { id: "tutorial", label: "新手教程", hint: "文字提示教学，先理解回响和武器", x, y: startY, width: buttonWidth, height: buttonHeight },
      { id: "classic", label: "经典模式", hint: "进入当前横版回响关卡", x, y: startY + (buttonHeight + gap), width: buttonWidth, height: buttonHeight },
      { id: "fun", label: "娱乐模式", hint: "待定，后续可放无尽或训练玩法", x, y: startY + (buttonHeight + gap) * 2, width: buttonWidth, height: buttonHeight },
      { id: "exit", label: "退出游戏", hint: "显示退出提示", x, y: startY + (buttonHeight + gap) * 3, width: buttonWidth, height: buttonHeight }
    ];
  }

  getBackButtons(extra = []) {
    const buttonWidth = Math.min(260, this.width - 64);
    const y = Math.min(this.height - 88, 455);
    const total = extra.length + 1;
    const gap = 18;
    const allWidth = total * buttonWidth + (total - 1) * gap;
    const startX = (this.width - allWidth) / 2;
    const buttons = extra.map((button, index) => ({
      ...button,
      x: startX + index * (buttonWidth + gap),
      y,
      width: buttonWidth,
      height: 50
    }));
    buttons.push({
      id: "back",
      label: "返回菜单",
      x: startX + extra.length * (buttonWidth + gap),
      y,
      width: buttonWidth,
      height: 50
    });
    return buttons;
  }

  getResultButtons() {
    if (!(this.mode === "tutorial" && !this.result?.defeated)) return [];
    const buttonWidth = Math.min(240, this.width - 64);
    return [{
      id: "home",
      label: "回到主页",
      x: (this.width - buttonWidth) / 2,
      y: Math.min(this.height - 82, Math.max(388, this.height * 0.72)),
      width: buttonWidth,
      height: 50
    }];
  }

  getClickedButton(buttons) {
    if (!this.input.pointer.pressed) return null;
    const { x, y } = this.input.pointer;
    return buttons.find((button) => x >= button.x &&
      x <= button.x + button.width &&
      y >= button.y &&
      y <= button.y + button.height) ?? null;
  }

  resetRun() {
    this.player = new Player(this.audio);
    this.effects.reset();
    this.projectiles = [];
    this.stats = this.createStats();
    this.combat = new CombatSystem(this.stats, this.effects, this.projectiles, this.audio);
    const levelData = this.getCurrentLevel();
    if (levelData.playerStart) {
      this.player.x = levelData.playerStart.x;
      this.player.y = levelData.playerStart.y;
      this.player.prevY = this.player.y;
    }
    this.basePlatforms = (levelData.platforms ?? []).map((platform) => ({ ...platform }));
    this.enemyOnlyPlatforms = (levelData.enemyGuards ?? []).map((guard, index) => ({
      id: guard.id ?? `enemy-guard-${index}`,
      x: guard.x,
      y: guard.y,
      width: guard.width,
      height: guard.height,
      type: "enemy_guard",
      tilt: guard.tilt ?? 0
    }));
    this.stageBlocks = (levelData.blocks ?? []).map((block) => ({ ...block, destroyed: false }));
    this.roomStates = new Map((levelData.rooms ?? []).map((room) => [room.id, { status: "inactive", spawned: false }]));
    this.activeRoomId = null;
    this.barrierMessageTimer = 0;
    this.exitBlockedMessageShown = false;
    this.platforms = [...this.basePlatforms];
    this.enemies = [];

    if (this.mode === "classic" && (levelData.rooms?.length ?? 0) > 0) {
      this.activateRoom(levelData.rooms[0].id, true);
    } else {
      this.enemies = (levelData.enemies ?? []).map((enemy) => this.spawnConfiguredEnemy(enemy));
      this.buildStagePlatforms();
    }

    if (this.mode === "tutorial") {
      this.player.maxHealth = 280;
      this.player.health = this.player.maxHealth;
      this.enemies.forEach((enemy) => {
        if (enemy.tutorialId === "master") {
          enemy.maxHealth = 9999;
          enemy.health = 9999;
        }
      });
    }
    if (this.mode === "classic") {
      this.setupClassicModeRun();
    }
    this.camera.x = 0;
    this.camera.y = 0;
    this.result = null;

    if (this.mode === "fun") {
      this.setupFunModeRun();
    }
  }

  setupClassicModeRun() {
    this.player.parryWindowOverride = 0.22;
    this.player.parryPerfectWindowOverride = 0.11;
    this.player.shieldHoldThresholdOverride = 0.22;
  }

  spawnConfiguredEnemy(enemyConfig, roomId = null) {
    const enemy = new Enemy(enemyConfig.x, enemyConfig.y, enemyConfig.type, enemyConfig.tutorialId);
    enemy.roomId = roomId ?? enemyConfig.roomId ?? null;
    enemy.allowCloseRangeShot = this.mode === "classic";
    if (typeof enemyConfig.patrolDir === "number") enemy.patrolDir = enemyConfig.patrolDir;
    return enemy;
  }

  getWorldBounds() {
    if (this.mode !== "fun") return CONFIG.world;
    const width = Math.max(900, Math.round(this.width * 1.5));
    const height = Math.max(540, this.height);
    return {
      ...CONFIG.world,
      width,
      height,
      floorDeathY: height + 360
    };
  }

  getFunFloorY() {
    return Math.max(280, this.height - 74);
  }

  getFunLevel() {
    const world = this.getWorldBounds();
    const floorY = this.getFunFloorY();
    return {
      id: "fun-mode-one",
      title: "模式一",
      subtitle: "娱乐模式",
      intro: "无后摇爽打模式：清完 10 个近战噪声体会立刻刷新下一波。",
      playerStart: { x: 90, y: floorY - CONFIG.player.height },
      platforms: [
        { x: 0, y: floorY, width: world.width, height: 58, type: "standard", label: "FUN MODE" }
      ],
      enemies: [],
      blocks: [],
      rooms: [],
      enemyGuards: [],
      exit: null,
      fissures: [],
      farStructures: [],
      ruleSigns: [
        {
          x: 72,
          y: Math.max(130, floorY - 150),
          width: 520,
          height: 98,
          title: "娱乐模式 / 模式一",
          lines: [
            "近战武器范围扩大，攻击无后摇。",
            "弹反结束无后摇。击破一波 10 个近战噪声体后立刻刷新。"
          ],
          accent: "gold"
        }
      ]
    };
  }

  setupFunModeRun() {
    this.funWave = 0;
    this.player.weaponIndex = 0;
    this.player.weaponOverride = {
      ...CONFIG.weapons[0],
      id: "fun-cleaver",
      name: "爽快回响刃",
      shortName: "爽刃",
      damage: 52,
      startup: 0.025,
      active: 0.14,
      recovery: 0,
      boxWidth: 132,
      boxHeight: 58
    };
    this.player.parryRecoveryOverride = 0;
    this.player.parryWindowOverride = 0.18;
    this.player.parryPerfectWindowOverride = 0.18;
    this.player.disableShield = true;
    this.player.forcePerfectParry = true;
    this.player.maxHealth = 320;
    this.player.health = this.player.maxHealth;
    this.spawnNextFunWave();
  }

  spawnNextFunWave() {
    if (this.mode !== "fun") return;

    this.funWave += 1;
    const world = this.getWorldBounds();
    const floorY = this.getFunFloorY();
    const usableStart = 260;
    const usableEnd = Math.max(usableStart + 120, world.width - 90);
    const gap = (usableEnd - usableStart) / Math.max(1, this.funWaveSize - 1);
    this.enemies = [];

    for (let i = 0; i < this.funWaveSize; i += 1) {
      const enemy = this.spawnConfiguredEnemy({
        x: usableStart + gap * i,
        y: floorY - 50,
        type: "striker",
        patrolDir: i % 2 === 0 ? -1 : 1
      });
      enemy.maxHealth = 90 + Math.min(60, (this.funWave - 1) * 5);
      enemy.health = enemy.maxHealth;
      enemy.speed = CONFIG.enemy.speed * 1.05;
      this.enemies.push(enemy);
    }

    this.effects.addMessage(`娱乐模式：第 ${this.funWave} 波`, CONFIG.palette.gold, 1.2);
  }

  updateFunMode() {
    if (this.mode !== "fun") return;
    if (this.enemies.some((enemy) => enemy.isAlive)) return;
    this.stats.combo = Math.max(this.stats.combo, 0);
    this.spawnNextFunWave();
  }

  getRoomState(roomId) {
    return this.roomStates.get(roomId) ?? { status: "cleared", spawned: true };
  }

  getRoom(roomId) {
    return (this.getCurrentLevel().rooms ?? []).find((room) => room.id === roomId) ?? null;
  }

  getRoomEntryTriggerX(room) {
    if (!room) return Infinity;
    if (room.barrierLeft) {
      return room.barrierLeft.x + room.barrierLeft.width + this.player.width + 6;
    }
    return room.bounds.x;
  }

  buildStagePlatforms() {
    const activeBlocks = this.stageBlocks.filter((block) => !block.destroyed);
    this.platforms = [...this.basePlatforms, ...activeBlocks, ...this.getActiveBarriers()];
    this.enemyPlatforms = [...this.platforms, ...this.enemyOnlyPlatforms];
  }

  getActiveBarriers() {
    if (!this.activeRoomId) return [];
    const room = this.getRoom(this.activeRoomId);
    if (!room) return [];
    const barriers = [];
    if (room.barrierLeft) barriers.push({ ...room.barrierLeft, type: "barrier", roomId: room.id });
    if (room.barrierRight) barriers.push({ ...room.barrierRight, type: "barrier", roomId: room.id });
    return barriers;
  }

  activateRoom(roomId, silent = false) {
    const room = this.getRoom(roomId);
    if (!room) return;

    const state = this.getRoomState(roomId);
    if (state.status === "cleared") return;

    state.status = "active";
    if (!state.spawned) {
      room.enemies.forEach((enemy) => this.enemies.push(this.spawnConfiguredEnemy(enemy, room.id)));
      state.spawned = true;
    }
    this.roomStates.set(roomId, state);
    this.activeRoomId = roomId;
    this.buildStagePlatforms();

    if (!silent) {
      this.effects.addMessage(this.getCurrentLevel().messages?.roomEnter ?? "紫色结界已启动。", CONFIG.palette.barrier, 1.1);
      this.effects.shake(5, 0.08);
    }
  }

  isRoomCleared(room) {
    const aliveInRoom = this.enemies.some((enemy) => enemy.isAlive && enemy.roomId === room.id);
    if (aliveInRoom) return false;

    const pendingTrigger = this.stageBlocks.some((block) => block.roomId === room.id && block.required && !block.destroyed);
    return !pendingTrigger;
  }

  updateRoomProgress() {
    if (this.mode !== "classic") return;
    const rooms = this.getCurrentLevel().rooms ?? [];
    if (rooms.length === 0) return;

    if (this.activeRoomId) {
      const room = this.getRoom(this.activeRoomId);
      if (room && this.isRoomCleared(room)) {
        const state = this.getRoomState(room.id);
        state.status = "cleared";
        this.roomStates.set(room.id, state);
        this.activeRoomId = null;
        this.buildStagePlatforms();
        this.effects.addMessage(this.getCurrentLevel().messages?.roomClear ?? "区域结界已解除。", CONFIG.palette.echo, 1.0);
        this.effects.shake(4, 0.08);
      }
      return;
    }

    const playerCenter = this.player.x + this.player.width / 2;
    const playerLeft = this.player.getHitbox().x;
    const nextRoom = rooms.find((room) => {
      const state = this.getRoomState(room.id);
      if (state.status !== "inactive") return false;
      if (playerCenter < room.bounds.x || playerCenter > room.bounds.x + room.bounds.width) return false;
      return playerLeft >= this.getRoomEntryTriggerX(room);
    });
    if (nextRoom) this.activateRoom(nextRoom.id);
  }

  getRespawnPoint() {
    const levelData = this.getCurrentLevel();
    if (this.mode !== "classic" || !(levelData.rooms?.length)) {
      return levelData.playerStart ?? { x: 120, y: 474 };
    }

    if (this.activeRoomId) {
      return this.getRoom(this.activeRoomId)?.respawn ?? levelData.playerStart;
    }

    const playerCenter = this.player.x + this.player.width / 2;
    const roomAtPlayer = (levelData.rooms ?? []).find((room) => playerCenter >= room.bounds.x && playerCenter <= room.bounds.x + room.bounds.width);
    if (roomAtPlayer?.respawn) return roomAtPlayer.respawn;

    const clearedRoom = [...(levelData.rooms ?? [])]
      .reverse()
      .find((room) => this.getRoomState(room.id).status === "cleared");
    return clearedRoom?.respawn ?? levelData.playerStart ?? { x: 120, y: 474 };
  }

  updateBarrierHint(dt) {
    if (this.barrierMessageTimer > 0) this.barrierMessageTimer = Math.max(0, this.barrierMessageTimer - dt);
    if (!this.activeRoomId || this.mode !== "classic") return;

    const playerBox = this.player.getHitbox();
    const probe = {
      x: playerBox.x - 8,
      y: playerBox.y,
      width: playerBox.width + 16,
      height: playerBox.height
    };
    const touchingBarrier = this.getActiveBarriers().some((barrier) => intersects(probe, barrier));
    if (touchingBarrier && this.barrierMessageTimer === 0) {
      this.effects.addMessage(this.getCurrentLevel().messages?.barrierBlocked ?? "还有怪物在本区域游荡，先清理干净。", CONFIG.palette.barrier, 1.1);
      this.barrierMessageTimer = 1.0;
    }
  }

  hitStageBlock(block) {
    if (!block || block.destroyed) return false;
    block.destroyed = true;
    this.buildStagePlatforms();

    const hit = rectCenter(block);
    const isSpawner = block.type === "spawn";
    const color = isSpawner ? CONFIG.palette.spawnBlock : CONFIG.palette.breakable;

    this.effects.addHit(hit.x, hit.y, color, isSpawner ? 18 : 10);
    this.effects.addRing(hit.x, hit.y, color, false);
    this.effects.shake(isSpawner ? 8 : 5, isSpawner ? 0.14 : 0.08);
    this.effects.addMessage(
      isSpawner
        ? this.getCurrentLevel().messages?.spawnBlock ?? "召怪方块破裂，敌人出现了。"
        : this.getCurrentLevel().messages?.blockBreak ?? "蓝色方块已破坏。",
      color,
      0.9
    );

    if (isSpawner) {
      (block.spawnEnemies ?? []).forEach((enemy) => {
        this.enemies.push(this.spawnConfiguredEnemy(enemy, block.roomId));
      });
    }
    return true;
  }

  handleProjectilePlatformHit(projectile, platform) {
    if (projectile.owner !== "player") return false;
    if (platform.type !== "breakable" && platform.type !== "spawn") return false;
    return this.hitStageBlock(platform);
  }

  handlePlayerAttackHit(player, box) {
    for (const block of this.stageBlocks) {
      if (block.destroyed || !intersects(box, block)) continue;
      return this.hitStageBlock(block);
    }
    return false;
  }

  isStageCleared() {
    if (this.mode === "fun") return false;
    if (this.mode === "tutorial") return !this.enemies.some((enemy) => enemy.isAlive);
    const rooms = this.getCurrentLevel().rooms ?? [];
    if (rooms.length === 0) return !this.enemies.some((enemy) => enemy.isAlive);
    return rooms.every((room) => this.getRoomState(room.id).status === "cleared") &&
      !this.enemies.some((enemy) => enemy.isAlive);
  }

  getCurrentLevel() {
    if (this.mode === "tutorial") return CONFIG.tutorialLevel;
    if (this.mode === "fun") return this.getFunLevel();
    return CONFIG.classicLevels?.[this.classicLevelId] ?? CONFIG.level;
  }

  startPlaying(mode = "classic", levelId = "silent-corridor") {
    this.mode = mode;
    if (mode === "classic") this.classicLevelId = levelId;
    if (mode === "fun") this.funModeId = levelId;
    this.resetRun();
    this.state = "playing";
    if (mode === "tutorial") {
      this.tutorialStep = 0;
      this.lastParryCount = 0;
      this.tutorialTasks = {
        switchWeapon: false,
        ultimate: false,
        doubleJump: false,
        shieldBlock: false,
        shieldReflect: false
      };
      this.effects.addMessage("【教程】完成 3 次完美回响以通过", CONFIG.palette.gold, 4.0);
    } else {
      this.effects.addMessage(this.getCurrentLevel().intro ?? "观察红光，听见节奏", CONFIG.palette.echo, 1.8);
    }
  }

  update(dt) {
    this.fps = 1 / Math.max(dt, 0.001);
    this.menuPulse += dt;
    this.effects.update(dt);

    if (this.state === "menu") {
      this.updateMenu();
      return;
    }

    if (this.state === "tutorial") {
      this.state = "menu"; // Skip subpage since we have HTML buttons
      return;
    }

    if (this.state === "fun") {
      this.state = "menu";
      return;
    }

    if (this.state === "exit") {
      this.state = "menu";
      return;
    }

    if (this.state === "result") {
      const clicked = this.getClickedButton(this.getResultButtons());
      if (clicked?.id === "home") {
        this.state = "menu";
        this.mode = "classic";
        return;
      }
    }

    if (this.state === "result" && (this.input.wasPressed("start") || this.input.wasPressed("restart"))) {
      if (this.mode === "tutorial" && !this.result?.defeated) {
        this.state = "menu";
        this.mode = "classic";
      } else {
        this.startPlaying(this.mode, this.mode === "fun" ? this.funModeId : this.classicLevelId);
      }
    }

    if (this.state !== "playing") return;

    if (this.mode === "tutorial") {
      this.updateTutorialLogic(dt);
    }

    this.updateBarrierHint(dt);

    if (this.effects.hitStop > 0) return;

    const burstWasActive = this.player.isUltimate;
    const previousWeaponIndex = this.player.weaponIndex;
    this.stats.time += dt;
    if (this.mode === "fun" && this.input.wasPressed("parry")) {
      const center = rectCenter(this.player.getHitbox());
      this.effects.addRing(center.x, center.y, CONFIG.palette.white, true);
      this.effects.addRing(center.x, center.y, CONFIG.palette.echo, false);
    }
    const world = this.getWorldBounds();
    this.player.update(dt, this.input, this.platforms, world);
    this.rescuePlayerFromVoid();
    if (false && previousWeaponIndex !== this.player.weaponIndex) {
      this.effects.addMessage(`切换武器：${this.player.getWeapon().name}`, CONFIG.palette.gold, 0.75);
    }
    if (false && !burstWasActive && this.player.isUltimate) {
      this.stats.bursts += 1;
      this.effects.addMessage("共鸣爆发：回复生命", CONFIG.palette.gold, 1.0);
      this.effects.shake(8, 0.14);
    }

    if (previousWeaponIndex !== this.player.weaponIndex) {
      this.effects.addMessage(`切换武器：${this.player.getWeapon().name}`, CONFIG.palette.gold, 0.75);
    }
    if (!burstWasActive && this.player.isUltimate) {
      this.stats.bursts += 1;
      this.effects.addMessage("无双开启：免疫僵直。", CONFIG.palette.gold, 1.0);
      this.effects.shake(8, 0.14);
    }

    this.enemies.forEach((enemy) => {
      enemy.update(dt, this.player, this.enemyPlatforms, world);
      const shot = enemy.consumeShot();
      if (shot) {
        this.projectiles.push(shot);
        this.effects.addHit(shot.x, shot.y, CONFIG.palette.noise, 5);
      }
    });
    this.combat.update(this.player, this.enemies, dt, this.platforms, this);
    this.updateRoomProgress();
    this.updateFunMode();
    this.updateCamera(dt);
    if (this.mode !== "fun") this.checkExit();
    this.checkPlayerDefeat();
  }

  rescuePlayerFromVoid() {
    if (this.player.y < this.getWorldBounds().floorDeathY) return;
    const respawn = this.getRespawnPoint();
    const damaged = this.player.takeDamage(18, -this.player.facing);
    this.player.x = respawn.x;
    this.player.y = respawn.y;
    this.player.prevY = this.player.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.isGrounded = false;
    if (damaged) {
      this.stats.damageTaken += 1;
      this.stats.combo = 0;
      this.effects.addMessage("跌入噪声裂隙", CONFIG.palette.noise, 0.8);
      this.effects.shake(7, 0.12);
    }
  }

  updateMenu() {
    // Menu is now handled via HTML UI overlay in main.js
    if (this.input.wasPressed("start")) this.startPlaying("classic");
  }

  updateSubPage(buttons) {
    const clicked = this.getClickedButton(buttons);
    if (!clicked) return;
    if (clicked.id === "classic") this.startPlaying("classic");
    if (clicked.id === "start_tutorial") this.startPlaying("tutorial");
    if (clicked.id === "back") this.state = "menu";
  }

  updateCamera() {
    const targetX = clamp(
      this.player.x + this.player.width / 2 - this.width * 0.45,
      0,
      Math.max(0, this.getWorldBounds().width - this.width)
    );
    this.camera.x += (targetX - this.camera.x) * CONFIG.camera.lerp;

    const targetY = clamp(
      this.player.y + this.player.height / 2 - this.height * 0.6,
      -100,
      Math.max(0, this.getWorldBounds().height - this.height)
    );
    this.camera.y += (targetY - this.camera.y) * CONFIG.camera.lerp;
  }

  updateTutorialLogic(dt) {
    if (this.tutorialStep === 0 && this.player.x > 100) {
      this.tutorialStep = 1;
      this.effects.addMessage("【教程】单次跳跃翻过墙壁，尝试攻击敌人", CONFIG.palette.gold, 3.0);
    }
    
    const dummy = this.enemies.find(e => e.tutorialId === "dummy");
    // dummy is removed in new config, we only have 1 regular striker and 1 master striker.
    // Let's check for any dead enemy instead.
    const deadEnemy = this.enemies.some(e => !e.isAlive);
    if (this.tutorialStep === 1 && deadEnemy) {
      this.tutorialStep = 2;
      this.effects.addMessage("【教程】尝试切换武器并二段跳上平台", CONFIG.palette.gold, 3.0);
    }

    if (this.tutorialStep === 2 && this.player.y < 350) {
      this.tutorialStep = 3;
      this.effects.addMessage("【教程】看准红光完美回响", CONFIG.palette.gold, 4.0);
    }

    const allTasksDone = Object.values(this.tutorialTasks).every(v => v === true);

    const masters = this.enemies.filter(e => e.tutorialId === "master");
    masters.forEach(m => {
      if (m.isAlive && (m.perfectParryCount || 0) >= 3 && allTasksDone) {
        m.health = 0;
        m.isAlive = false;
        this.effects.addMessage("【教程】已击破试炼目标！", CONFIG.palette.gold, 3.0);
      }
    });

    if (!this.tutorialTasks.doubleJump && !this.player.isGrounded && !this.player.canDoubleJump) {
      this.tutorialTasks.doubleJump = true;
    }
    if (!this.tutorialTasks.switchWeapon && this.player.weaponIndex !== 0) {
      this.tutorialTasks.switchWeapon = true;
    }
    if (!this.tutorialTasks.ultimate && this.player.isUltimate) {
      this.tutorialTasks.ultimate = true;
    }
    if (!this.tutorialTasks.shieldBlock && this.stats.shieldBlock > 0) {
      this.tutorialTasks.shieldBlock = true;
    }
    if (!this.tutorialTasks.shieldReflect && this.stats.shieldReflect > 0) {
      this.tutorialTasks.shieldReflect = true;
    }
  }

  checkExit() {
    if (!this.getCurrentLevel().exit) return;
    const exitHit = intersects(this.player.getHitbox(), this.getCurrentLevel().exit);
    if (!exitHit) {
      this.exitBlockedMessageShown = false;
      return;
    }
    if (this.mode !== "tutorial" && !this.isStageCleared()) {
      if (!this.exitBlockedMessageShown) {
        this.effects.addMessage(this.getCurrentLevel().messages?.exitBlocked ?? "出口仍处于封锁状态。", CONFIG.palette.barrier, 1.3);
        this.exitBlockedMessageShown = true;
      }
      return;
    }
    const alive = this.enemies.some((enemy) => enemy.isAlive);
    if (alive) return;
    const exit = this.getCurrentLevel().exit;
    if (intersects(this.player.getHitbox(), exit)) {
      if (this.mode === "tutorial") {
        const allDone = Object.values(this.tutorialTasks).every(v => v === true);
        if (!allDone) {
          if (!this.exitBlockedMessageShown) {
            this.effects.addMessage("未完成所有任务", CONFIG.palette.noise, 2.0);
            this.exitBlockedMessageShown = true;
          }
          return;
        }
      }
      this.completeRun();
    } else {
      this.exitBlockedMessageShown = false;
    }
  }

  checkPlayerDefeat() {
    if (this.player.isAlive) return;
    this.effects.addMessage("节奏破碎", CONFIG.palette.noise, 1.0);
    this.completeRun(true);
  }

  completeRun(defeated = false) {
    this.state = "result";
    this.result = this.buildResult(defeated);
    if (!defeated && window.ScoreStorage) {
      this.result = window.ScoreStorage.recordRun(this.result);
    }
    if (this.mode === "tutorial" && !defeated) {
      this.effects.addMessage("善于利用回响会有意想不到的收获", CONFIG.palette.gold, 2.6);
    } else {
      this.effects.addMessage(defeated ? "再试一次" : "回响已稳定", defeated ? CONFIG.palette.noise : CONFIG.palette.echo, 1.2);
    }
  }

  calculateScore(defeated, rank) {
    if (defeated) return 0;

    const rankBonus = { S: 600, A: 360, B: 180, C: 80 }[rank] ?? 0;
    const timeBonus = Math.max(0, 900 - Math.floor(this.stats.time * 6));
    const parryBonus = this.stats.perfectParry * 120 + this.stats.normalParry * 35;
    const comboBonus = this.stats.maxCombo * 45;
    const burstBonus = this.stats.bursts * 80;
    const damagePenalty = this.stats.damageTaken * 180;

    return Math.max(100, 1000 + rankBonus + timeBonus + parryBonus + comboBonus + burstBonus - damagePenalty);
  }

  buildResult(defeated) {
    let rank = "C";
    let title = "幸存者";
    if (!defeated && this.stats.damageTaken === 0 && this.stats.perfectParry >= 3) {
      rank = "S";
      title = "回响大师";
    } else if (!defeated && this.stats.perfectParry >= 2) {
      rank = "A";
      title = "回响猎手";
    } else if (!defeated && this.stats.maxCombo >= 4) {
      rank = "B";
      title = "怒气行者";
    }

    const levelData = this.getCurrentLevel();
    const levelId = this.mode === "tutorial" ? "tutorial" : this.mode === "fun" ? this.funModeId : this.classicLevelId;
    const levelTitle = levelData.subtitle
      ? `${levelData.subtitle}：${levelData.title ?? "未命名关卡"}`
      : levelData.title ?? "新手教程";

    return {
      defeated,
      rank,
      title,
      mode: this.mode,
      levelId,
      levelTitle,
      score: this.calculateScore(defeated, rank),
      time: this.stats.time,
      damageTaken: this.stats.damageTaken,
      perfectParry: this.stats.perfectParry,
      normalParry: this.stats.normalParry,
      maxCombo: this.stats.maxCombo,
      bursts: this.stats.bursts
    };
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    this.renderBackground(ctx);

    const shake = this.effects.getShakeOffset();
    ctx.save();
    ctx.translate(Math.round(-this.camera.x + shake.x), Math.round(-this.camera.y + shake.y));
    this.renderWorld(ctx);
    ctx.restore();

    this.effects.renderScreen(ctx, this.width);
    if (this.state === "playing") this.hud.render(ctx, this);
    if (this.state === "result") this.renderResult(ctx);
  }

  renderBackground(ctx) {
    const p = CONFIG.palette;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#07152a");
    gradient.addColorStop(0.58, "#050711");
    gradient.addColorStop(1, "#02030a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(-this.camera.x * 0.18, -this.camera.y * 0.1);
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    const spacing = 48;
    const startX = Math.floor((this.camera.x * 0.18) / spacing) * spacing;
    const startY = Math.floor((this.camera.y * 0.1) / spacing) * spacing - 100;
    for (let x = startX; x < startX + this.width + spacing; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x + 80, startY + this.height + 200);
      ctx.stroke();
    }
    for (let y = startY; y < startY + this.height + 200; y += 54) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + this.width + spacing, y + Math.sin(y) * 10);
      ctx.stroke();
    }
    ctx.restore();

    this.renderFarStructures(ctx);
  }

  renderFarStructures(ctx) {
    ctx.save();
    ctx.translate(-this.camera.x * 0.34, -this.camera.y * 0.18);
    const structures = this.getCurrentLevel().farStructures;
    const fallback = Array.from({ length: 16 }, (_, i) => ({
      x: i * 250 + 90,
      y: 95 + (i % 3) * 52,
      width: 70 + (i % 2) * 40,
      height: 44,
      accent: i % 3 === 1 ? "noise" : "echo"
    }));
    (structures ?? fallback).forEach((structure, i) => {
      const stroke = structure.accent === "noise" ? "rgba(255, 61, 102, 0.2)" : "rgba(120, 244, 255, 0.14)";
      ctx.strokeStyle = stroke;
      ctx.fillStyle = structure.accent === "noise" ? "rgba(255, 61, 102, 0.035)" : "rgba(120, 244, 255, 0.05)";
      ctx.fillRect(structure.x, structure.y, structure.width, structure.height);
      ctx.strokeRect(structure.x, structure.y, structure.width, structure.height);
      if (i % 3 === 1) {
        ctx.beginPath();
        ctx.moveTo(structure.x + 18, structure.y - 20);
        ctx.lineTo(structure.x + structure.width - 10, structure.y + structure.height + 24);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  renderWorld(ctx) {
    this.renderNoiseFissures(ctx);
    this.renderEnemyGuards(ctx);
    this.renderPlatforms(ctx);
    this.renderBarriers(ctx);
    this.renderRuleSigns(ctx);
    this.renderExit(ctx);
    this.enemies.forEach((enemy) => {
      enemy.render(ctx);
      if (this.mode === "tutorial" && enemy.tutorialId === "master" && enemy.isAlive) {
        ctx.save();
        ctx.fillStyle = CONFIG.palette.gold;
        ctx.font = "700 14px " + getComputedStyle(document.documentElement).getPropertyValue('--font-family-system');
        ctx.textAlign = "center";
        ctx.shadowBlur = 4;
        ctx.shadowColor = "#000";
        ctx.fillText(`完美回响 (${Math.min(3, enemy.perfectParryCount || 0)}/3)`, enemy.x + enemy.width / 2, enemy.y - 15);
        ctx.restore();
      }
    });
    this.renderProjectiles(ctx);
    this.player.render(ctx);
    this.renderAttackBoxes(ctx);
    this.effects.renderWorld(ctx);
  }

  renderProjectiles(ctx) {
    for (const projectile of this.projectiles) {
      if (projectile.kind === "laser") {
        this.renderLaserProjectile(ctx, projectile);
        continue;
      }
      ctx.save();
      ctx.fillStyle = projectile.color;
      ctx.shadowBlur = 16;
      ctx.shadowColor = projectile.color;
      ctx.fillRect(Math.round(projectile.x), Math.round(projectile.y), projectile.width, projectile.height);
      ctx.globalAlpha = 0.28;
      ctx.fillRect(
        Math.round(projectile.x - Math.sign(projectile.vx) * 28),
        Math.round(projectile.y),
        28,
        projectile.height
      );
      ctx.restore();
    }
  }

  renderLaserProjectile(ctx, projectile) {
    const lifeRatio = projectile.maxDuration > 0 ? projectile.durationLeft / projectile.maxDuration : 0;
    for (const segment of projectile.segments) {
      ctx.save();
      ctx.globalAlpha = 0.35 + lifeRatio * 0.45;
      ctx.strokeStyle = projectile.color;
      ctx.lineWidth = projectile.width;
      ctx.lineCap = "round";
      ctx.shadowBlur = 24;
      ctx.shadowColor = projectile.color;
      ctx.beginPath();
      ctx.moveTo(segment.x1, segment.y1);
      ctx.lineTo(segment.x2, segment.y2);
      ctx.stroke();

      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = "#f4ffd8";
      ctx.lineWidth = Math.max(2, projectile.width * 0.34);
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(segment.x1, segment.y1);
      ctx.lineTo(segment.x2, segment.y2);
      ctx.stroke();
      ctx.restore();
    }

    const lastSegment = projectile.segments[projectile.segments.length - 1];
    if (!lastSegment) return;
    ctx.save();
    ctx.fillStyle = "#f4ffd8";
    ctx.globalAlpha = 0.6 + lifeRatio * 0.3;
    ctx.shadowBlur = 18;
    ctx.shadowColor = projectile.color;
    ctx.beginPath();
    ctx.arc(lastSegment.x2, lastSegment.y2, 4 + projectile.width * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderPlatforms(ctx) {
    for (const platform of this.platforms) {
      if (platform.type === "barrier") continue;
      const colors = this.getPlatformColors(platform.type);
      ctx.save();
      ctx.fillStyle = colors.body;
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 12;
      ctx.shadowColor = colors.line;
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.strokeRect(platform.x + 0.5, platform.y + 0.5, platform.width - 1, platform.height - 1);
      ctx.fillStyle = colors.line;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(platform.x, platform.y, platform.width, 3);
      ctx.globalAlpha = 0.22;
      ctx.fillRect(platform.x, platform.y + platform.height - 4, platform.width, 4);

      ctx.globalAlpha = 0.32;
      for (let x = platform.x + 12; x < platform.x + platform.width; x += 22) {
        ctx.fillStyle = colors.line;
        ctx.fillRect(x, platform.y + 7, 10, 2);
      }
      if (platform.type === "noise") {
        ctx.globalAlpha = 0.48;
        ctx.strokeStyle = CONFIG.palette.noise;
        ctx.lineWidth = 1;
        for (let x = platform.x + 28; x < platform.x + platform.width; x += 86) {
          ctx.beginPath();
          ctx.moveTo(x, platform.y + 9);
          ctx.lineTo(x + 18, platform.y + platform.height - 8);
          ctx.lineTo(x + 38, platform.y + 18);
          ctx.stroke();
        }
      }
      if (platform.type === "echo") {
        const pulse = 0.28 + Math.sin(performance.now() * 0.006 + platform.x) * 0.08;
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = CONFIG.palette.echo;
        ctx.strokeRect(platform.x + 6, platform.y + 6, platform.width - 12, platform.height - 12);
      }
      if (platform.type === "breakable" || platform.type === "spawn") {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = colors.line;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(platform.x + 8, platform.y + 8);
        ctx.lineTo(platform.x + platform.width - 8, platform.y + platform.height - 8);
        ctx.moveTo(platform.x + platform.width - 8, platform.y + 8);
        ctx.lineTo(platform.x + 8, platform.y + platform.height - 8);
        ctx.stroke();
      }
      if (platform.label) {
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = colors.line;
        ctx.font = "10px Lucida Console, monospace";
        ctx.fillText(platform.label, platform.x + 12, platform.y + platform.height - 10);
      }
      ctx.restore();
    }
  }

  getPlatformColors(type) {
    if (type === "noise") return { body: "rgba(80, 13, 36, 0.84)", line: CONFIG.palette.noise };
    if (type === "echo") return { body: "rgba(10, 44, 58, 0.86)", line: CONFIG.palette.echo };
    if (type === "breakable") return { body: "rgba(18, 32, 120, 0.9)", line: CONFIG.palette.breakable };
    if (type === "spawn") return { body: "rgba(6, 74, 24, 0.9)", line: CONFIG.palette.spawnBlock };
    return { body: "rgba(18, 30, 48, 0.86)", line: "rgba(190, 246, 255, 0.62)" };
  }

  renderBarriers(ctx) {
    const barriers = this.getActiveBarriers();
    if (barriers.length === 0) return;
    const pulse = 0.5 + Math.sin(performance.now() * 0.01) * 0.2;

    for (const barrier of barriers) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = `rgba(255, 0, 255, ${0.12 + pulse * 0.08})`;
      ctx.strokeStyle = CONFIG.palette.barrier;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 22;
      ctx.shadowColor = CONFIG.palette.barrier;
      ctx.fillRect(barrier.x, barrier.y, barrier.width, barrier.height);
      ctx.strokeRect(barrier.x + 0.5, barrier.y + 0.5, barrier.width - 1, barrier.height - 1);

      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(barrier.x + barrier.width / 2, barrier.y);
      ctx.lineTo(barrier.x + barrier.width / 2, barrier.y + barrier.height);
      ctx.stroke();
      ctx.restore();
    }
  }

  renderEnemyGuards(ctx) {
    if (this.mode !== "classic" || this.enemyOnlyPlatforms.length === 0) return;
    const pulse = 0.45 + Math.sin(performance.now() * 0.012) * 0.22;
    for (const guard of this.enemyOnlyPlatforms) {
      const cx = guard.x + guard.width / 2;
      const cy = guard.y + guard.height / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(guard.tilt ?? 0);
      ctx.fillStyle = `rgba(255, 61, 102, ${0.14 + pulse * 0.12})`;
      ctx.strokeStyle = `rgba(255, 61, 102, ${0.52 + pulse * 0.28})`;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 18;
      ctx.shadowColor = CONFIG.palette.noise;
      ctx.beginPath();
      ctx.moveTo(-guard.width * 0.46, -guard.height * 0.5);
      ctx.lineTo(guard.width * 0.42, -guard.height * 0.38);
      ctx.lineTo(guard.width * 0.34, guard.height * 0.5);
      ctx.lineTo(-guard.width * 0.38, guard.height * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  renderRuleSigns(ctx) {
    const signs = this.getCurrentLevel().ruleSigns ?? [];
    for (const sign of signs) {
      const accent = sign.accent === "gold" ? CONFIG.palette.gold : CONFIG.palette.echo;
      ctx.save();
      ctx.fillStyle = "rgba(2, 7, 14, 0.72)";
      ctx.strokeStyle = sign.accent === "noise" ? CONFIG.palette.noise : "rgba(120, 244, 255, 0.42)";
      ctx.shadowBlur = 12;
      ctx.shadowColor = accent;
      ctx.fillRect(sign.x, sign.y, sign.width, sign.height);
      ctx.strokeRect(sign.x + 0.5, sign.y + 0.5, sign.width - 1, sign.height - 1);
      ctx.fillStyle = accent;
      ctx.font = "700 12px " + getComputedStyle(document.documentElement).getPropertyValue('--font-family-system');
      ctx.fillText(sign.title, sign.x + 17, sign.y + 22);
      ctx.fillStyle = "#d9fbff";
      ctx.font = "11px " + getComputedStyle(document.documentElement).getPropertyValue('--font-family-system');
      sign.lines.forEach((line, index) => {
        ctx.fillText(line, sign.x + 17, sign.y + 44 + index * 18);
      });

      if (sign.sideLines?.length) {
        const dividerX = sign.x + Math.round(sign.width * 0.64);
        ctx.globalAlpha = 0.32;
        ctx.strokeStyle = accent;
        ctx.beginPath();
        ctx.moveTo(dividerX, sign.y + 18);
        ctx.lineTo(dividerX, sign.y + sign.height - 18);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.fillStyle = accent;
        ctx.font = "700 12px " + getComputedStyle(document.documentElement).getPropertyValue('--font-family-system');
        ctx.fillText(sign.sideTitle ?? "提示", dividerX + 18, sign.y + 22);
        ctx.fillStyle = "#d9fbff";
        ctx.font = "11px " + getComputedStyle(document.documentElement).getPropertyValue('--font-family-system');
        sign.sideLines.forEach((line, index) => {
          ctx.fillText(line, dividerX + 18, sign.y + 48 + index * 34);
        });
      }
      ctx.restore();
    }

    if (this.mode === "tutorial") {
      ctx.save();
      ctx.fillStyle = "rgba(217, 251, 255, 0.8)";
      ctx.font = "700 13px " + getComputedStyle(document.documentElement).getPropertyValue('--font-family-system');
      ctx.shadowBlur = 8;
      ctx.shadowColor = CONFIG.palette.echo;
      ctx.fillText("(按两次跳跃试试)", 880, 440);
      ctx.restore();
    }
  }

  renderNoiseFissures(ctx) {
    const fissures = this.getCurrentLevel().fissures ?? [];
    const pulse = 0.55 + Math.sin(performance.now() * 0.008) * 0.2;
    for (const fissure of fissures) {
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = "rgba(255, 61, 102, 0.12)";
      ctx.shadowBlur = 22;
      ctx.shadowColor = CONFIG.palette.noise;
      ctx.beginPath();
      ctx.moveTo(fissure.x + fissure.width * 0.2, fissure.y);
      ctx.lineTo(fissure.x + fissure.width * 0.8, fissure.y + 10);
      ctx.lineTo(fissure.x + fissure.width * 0.58, fissure.y + fissure.height);
      ctx.lineTo(fissure.x + fissure.width * 0.1, fissure.y + fissure.height - 12);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = CONFIG.palette.noise;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 0.4;
      for (let i = 0; i < 3; i += 1) {
        ctx.fillRect(fissure.x + 6 + i * 11, fissure.y + 12 + i * 15, 8, 3);
      }
      ctx.restore();
    }
  }

  renderExit(ctx) {
    const exit = this.getCurrentLevel().exit;
    if (!exit) return;
    const clear = this.isStageCleared();
    ctx.save();
    ctx.translate(exit.x, exit.y);
    ctx.strokeStyle = clear ? CONFIG.palette.echo : "rgba(120, 244, 255, 0.18)";
    ctx.fillStyle = clear ? "rgba(120, 244, 255, 0.12)" : "rgba(6, 12, 22, 0.48)";
    ctx.lineWidth = 4;
    ctx.shadowBlur = clear ? 26 : 8;
    ctx.shadowColor = clear ? CONFIG.palette.echo : "rgba(120, 244, 255, 0.3)";
    ctx.fillRect(0, 0, exit.width, exit.height);
    ctx.strokeRect(0, 0, exit.width, exit.height);
    ctx.beginPath();
    ctx.moveTo(exit.width / 2, 12);
    ctx.lineTo(exit.width - 14, exit.height - 16);
    ctx.lineTo(14, exit.height - 16);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  renderAttackBoxes(ctx) {
    const playerBox = this.player.getAttackBox();
    if (this.player.state === "attack") {
      ctx.save();
      ctx.globalAlpha = playerBox.active ? 0.42 : 0.16;
      ctx.fillStyle = this.player.isUltimate ? CONFIG.palette.gold : CONFIG.palette.echo;
      ctx.shadowBlur = 18;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fillRect(playerBox.x, playerBox.y, playerBox.width, playerBox.height);
      ctx.restore();
    }

    for (const enemy of this.enemies) {
      const enemyBox = enemy.getAttackBox();
      if (enemy.state !== "attack_active") continue;
      ctx.save();
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = CONFIG.palette.noise;
      ctx.shadowBlur = 18;
      ctx.shadowColor = CONFIG.palette.noise;
      ctx.fillRect(enemyBox.x, enemyBox.y, enemyBox.width, enemyBox.height);
      ctx.restore();
    }
  }

  renderMenu(ctx) {
    this.renderOverlay(ctx, 0.64);
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = CONFIG.palette.echo;
    ctx.shadowBlur = 24;
    ctx.shadowColor = CONFIG.palette.echo;
    ctx.font = "700 54px Lucida Console, monospace";
    ctx.fillText("回响行者", this.width / 2, Math.max(92, this.height * 0.18));
    ctx.shadowBlur = 12;
    ctx.font = "16px Lucida Console, monospace";
    ctx.fillText("噪声本无形，直到你回应它。", this.width / 2, Math.max(130, this.height * 0.25));
    ctx.font = "13px Lucida Console, monospace";
    ctx.fillStyle = "rgba(217, 251, 255, 0.72)";
    ctx.fillText("点击按钮选择模式，或按 Enter 直接进入经典模式。", this.width / 2, Math.max(160, this.height * 0.31));
    ctx.restore();

    this.getMainMenuButtons().forEach((button) => this.renderButton(ctx, button));
  }

  renderTutorial(ctx) {
    this.renderOverlay(ctx, 0.72);
    this.renderPanelTitle(ctx, "新手教程", "先读懂节奏，再把攻击变成回响。");
    const lines = [
      "1. 移动：A / D 控制左右，W 或空格跳跃，可以二段跳。",
      "2. 武器：J 攻击，P 在回响刀、突击步枪、霰弹枪、实验级激光之间切换。",
      "3. 点按 L：短时间进入完美回响，近战命中会破防，远程弹会强力反射。",
      "4. 按住 L：持续举盾。近战只减伤不反弹，远程弹可以被反射。",
      "5. 能量：攻击命中、受伤、举盾减伤、反射远程都会增加回响值。",
      "6. 爆发：回响值满后按 I，共鸣爆发并回复 50% 最大生命。"
    ];
    this.renderTextBlock(ctx, lines, Math.max(86, this.height * 0.24));
    this.getBackButtons([{ id: "start_tutorial", label: "进入实战" }]).forEach((button) => this.renderButton(ctx, button));
  }

  renderPendingMode(ctx) {
    this.renderOverlay(ctx, 0.72);
    this.renderPanelTitle(ctx, "娱乐模式", "待定");
    const lines = [
      "这个入口已经预留好了。",
      "后续可以做：无尽刷怪、靶场训练、只用远程武器、弹幕反射挑战，",
      "或者一个纯爽快的高能量模式。",
      "现在先保留为待定，不影响经典模式提交。"
    ];
    this.renderTextBlock(ctx, lines, Math.max(120, this.height * 0.32));
    this.getBackButtons().forEach((button) => this.renderButton(ctx, button));
  }

  renderExitNotice(ctx) {
    this.renderOverlay(ctx, 0.76);
    this.renderPanelTitle(ctx, "退出游戏", "浏览器通常不允许网页主动关闭自身。");
    const lines = [
      "如果你是在浏览器中打开，请直接关闭当前标签页或窗口。",
      "如果你是在比赛平台或本地预览器中打开，请使用平台自带的返回/关闭按钮。",
      "你也可以返回菜单继续游戏。"
    ];
    this.renderTextBlock(ctx, lines, Math.max(135, this.height * 0.34));
    this.getBackButtons().forEach((button) => this.renderButton(ctx, button));
  }

  renderPanelTitle(ctx, title, subtitle) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = CONFIG.palette.echo;
    ctx.shadowBlur = 22;
    ctx.shadowColor = CONFIG.palette.echo;
    ctx.font = "700 38px Lucida Console, monospace";
    ctx.fillText(title, this.width / 2, Math.max(70, this.height * 0.14));
    ctx.shadowBlur = 8;
    ctx.fillStyle = "rgba(217, 251, 255, 0.78)";
    ctx.font = "14px Lucida Console, monospace";
    ctx.fillText(subtitle, this.width / 2, Math.max(104, this.height * 0.2));
    ctx.restore();
  }

  renderTextBlock(ctx, lines, startY) {
    const panelWidth = Math.min(760, this.width - 56);
    const x = (this.width - panelWidth) / 2;
    const y = startY - 34;
    ctx.save();
    ctx.fillStyle = "rgba(3, 9, 18, 0.72)";
    ctx.strokeStyle = "rgba(120, 244, 255, 0.3)";
    ctx.shadowBlur = 18;
    ctx.shadowColor = "rgba(120, 244, 255, 0.25)";
    ctx.fillRect(x, y, panelWidth, lines.length * 28 + 48);
    ctx.strokeRect(x + 0.5, y + 0.5, panelWidth - 1, lines.length * 28 + 47);
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";
    ctx.font = "14px Lucida Console, monospace";
    ctx.fillStyle = "rgba(240, 254, 255, 0.92)";
    lines.forEach((line, index) => {
      ctx.fillText(line, x + 28, startY + index * 28);
    });
    ctx.restore();
  }

  renderButton(ctx, button) {
    const { x, y, width, height } = button;
    const hover = this.input.pointer.x >= x &&
      this.input.pointer.x <= x + width &&
      this.input.pointer.y >= y &&
      this.input.pointer.y <= y + height;
    const pulse = 0.5 + Math.sin(this.menuPulse * 3) * 0.5;
    ctx.save();
    ctx.fillStyle = hover ? "rgba(16, 45, 60, 0.92)" : "rgba(5, 13, 26, 0.86)";
    ctx.strokeStyle = hover ? CONFIG.palette.gold : CONFIG.palette.echo;
    ctx.lineWidth = hover ? 3 : 2;
    ctx.shadowBlur = hover ? 26 : 12 + pulse * 4;
    ctx.shadowColor = hover ? CONFIG.palette.gold : CONFIG.palette.echo;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    ctx.textAlign = "center";
    ctx.fillStyle = hover ? CONFIG.palette.gold : CONFIG.palette.white;
    ctx.font = "700 20px Lucida Console, monospace";
    ctx.fillText(button.label, x + width / 2, y + 30);
    if (button.hint) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(217, 251, 255, 0.58)";
      ctx.font = "11px Lucida Console, monospace";
      ctx.fillText(button.hint, x + width / 2, y + 46);
    }
    ctx.restore();
  }

  renderResult(ctx) {
    this.renderOverlay(ctx, 0.72);
    const result = this.result ?? this.buildResult(false);
    const cardW = Math.min(520, this.width - 48);
    const cardH = 400;
    const x = (this.width - cardW) / 2;
    const y = Math.max(46, this.height * 0.14);

    ctx.save();
    ctx.fillStyle = "rgba(3, 9, 18, 0.88)";
    ctx.strokeStyle = result.defeated ? CONFIG.palette.noise : CONFIG.palette.echo;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 30;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.fillRect(x, y, cardW, cardH);
    ctx.strokeRect(x + 0.5, y + 0.5, cardW - 1, cardH - 1);

    ctx.textAlign = "center";
    ctx.fillStyle = result.defeated ? CONFIG.palette.noise : CONFIG.palette.echo;
    ctx.font = "700 24px Lucida Console, monospace";
    const mainTitle = this.mode === "tutorial" && !result.defeated ? "教程完成" : (result.defeated ? "节奏破碎" : "回响已稳定");
    ctx.fillText(mainTitle, this.width / 2, y + 48);

    ctx.fillStyle = CONFIG.palette.white;
    ctx.font = "700 76px Lucida Console, monospace";
    ctx.fillText(result.rank, this.width / 2, y + 130);
    ctx.font = "700 20px Lucida Console, monospace";
    ctx.fillText(result.title, this.width / 2, y + 166);
    ctx.fillStyle = result.defeated ? "rgba(217, 251, 255, 0.62)" : CONFIG.palette.gold;
    ctx.font = "700 16px Lucida Console, monospace";
    const scoreText = result.defeated ? "本局未记录积分" : `本局积分 ${result.score}`;
    ctx.fillText(scoreText, this.width / 2, y + 194);
    if (!result.defeated && result.bestScore) {
      ctx.fillStyle = result.isNewBest ? CONFIG.palette.gold : "rgba(217, 251, 255, 0.72)";
      ctx.font = "12px Lucida Console, monospace";
      ctx.fillText(result.isNewBest ? "新的个人最佳" : `个人最佳 ${result.bestScore}`, this.width / 2, y + 214);
    }

    const rows = [
      ["通关时间", `${result.time.toFixed(1)}秒`],
      ["完美回响", result.perfectParry],
      ["举盾/反射", result.normalParry],
      ["受击次数", result.damageTaken],
      ["最大连击", result.maxCombo],
      ["爆发次数", result.bursts]
    ];
    ctx.font = "14px Lucida Console, monospace";
    rows.forEach((row, index) => {
      const rowY = y + 244 + index * 22;
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(217, 251, 255, 0.78)";
      ctx.fillText(row[0], x + 84, rowY);
      ctx.textAlign = "right";
      ctx.fillStyle = CONFIG.palette.white;
      ctx.fillText(String(row[1]), x + cardW - 84, rowY);
    });

    ctx.textAlign = "center";
    ctx.fillStyle = CONFIG.palette.gold;
    ctx.font = "13px Lucida Console, monospace";
    const hintText = this.mode === "tutorial" && !result.defeated ? "点击下方按钮或按 Enter 返回菜单" : "按 Enter 或点击屏幕重新开始";
    ctx.fillText(hintText, this.width / 2, y + 374);
    if (this.mode === "tutorial" && !result.defeated) {
      ctx.fillStyle = "rgba(240, 254, 255, 0.82)";
      ctx.font = "13px Lucida Console, monospace";
      ctx.fillText("善于利用回响会有意想不到的收获", this.width / 2, y + 394);
    }
    ctx.restore();

    this.getResultButtons().forEach((button) => this.renderButton(ctx, button));
  }

  renderOverlay(ctx, alpha) {
    ctx.save();
    ctx.fillStyle = `rgba(2, 4, 10, ${alpha})`;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }
}
