class HUD {
  constructor() {
    this.isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  }

  render(ctx, game) {
    const { player, enemies, width, height, stats } = game;
    this.renderBars(ctx, player, width, height);
    this.renderEnemyCount(ctx, enemies, width);
    if (!this.isMobile) {
      this.renderControls(ctx, width);
    }
    this.renderStats(ctx, stats, width);
    this.renderWeapon(ctx, player, width);
    if (game.mode === "tutorial") this.renderTutorialTasks(ctx, game, width);
    if (game.mode === "fun") this.renderFunInfo(ctx, game, width);
    if (player.isUltimate) this.renderUltimateFrame(ctx, player, width, height);
    if (DEBUG) this.renderDebug(ctx, game);
  }

  renderFunInfo(ctx, game, width) {
    ctx.save();
    ctx.fillStyle = CONFIG.palette.gold;
    ctx.shadowBlur = 14;
    ctx.shadowColor = CONFIG.palette.gold;
    ctx.font = "700 14px Lucida Console, monospace";
    ctx.textAlign = "center";
    ctx.fillText(`娱乐模式 第 ${game.funWave} 波`, width / 2, 52);
    ctx.restore();
  }

  renderTutorialTasks(ctx, game, width) {
    const tasks = [
      { text: I18N.get("tutorial.task1"), done: game.tutorialTasks.switchWeapon },
      { text: I18N.get("tutorial.task2"), done: game.tutorialTasks.ultimate },
      { text: I18N.get("tutorial.task3"), done: game.tutorialTasks.doubleJump },
      { text: I18N.get("tutorial.task4"), done: game.tutorialTasks.shieldBlock },
      { text: I18N.get("tutorial.task5"), done: game.tutorialTasks.shieldReflect }
    ];

    ctx.save();
    ctx.textAlign = "left";
    ctx.font = "13px " + getComputedStyle(document.documentElement).getPropertyValue('--font-family-system');
    const startY = 110; // Below health bar
    tasks.forEach((task, index) => {
      const y = startY + index * 24;
      ctx.fillStyle = task.done ? CONFIG.palette.gold : "rgba(240, 240, 240, 0.7)";
      const box = task.done ? "【√】" : "【 】";
      ctx.shadowBlur = task.done ? 8 : 0;
      ctx.shadowColor = CONFIG.palette.gold;
      ctx.fillText(`${box} ${task.text}`, 24, y);
    });
    ctx.restore();
  }

  renderBars(ctx, player, width, height) {
    this.bar(ctx, 24, 24, 210, 14, player.health / player.maxHealth, "#ff5578", "生命");
    this.bar(ctx, 24, 48, 210, 12, player.rage / player.maxRage, player.rage >= player.maxRage ? CONFIG.palette.gold : CONFIG.palette.echo, "回响");

    if (player.rage >= player.maxRage && !player.isUltimate) {
      ctx.save();
      ctx.fillStyle = CONFIG.palette.gold;
      ctx.shadowBlur = 20;
      ctx.shadowColor = CONFIG.palette.gold;
      ctx.font = "700 14px " + getComputedStyle(document.documentElement).getPropertyValue('--font-family-system');
      ctx.fillText(I18N.get("controls.ultimateReady"), 24, 84);
      ctx.restore();
    }

    if (player.isUltimate) {
      this.bar(ctx, width - 242, 24, 218, 12, player.ultimateTimer / CONFIG.combat.ultimateTime, CONFIG.palette.gold, "爆发");
    }

    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "rgba(120, 244, 255, 0.12)";
    ctx.fillRect(0, height - 4, width * (player.rage / player.maxRage), 4);
    ctx.restore();
  }

  renderEnemyCount(ctx, enemies, width) {
    const alive = enemies.filter((enemy) => enemy.isAlive).length;
    ctx.save();
    ctx.fillStyle = alive === 0 ? CONFIG.palette.echo : "#ffd6df";
    ctx.font = "700 14px Lucida Console, monospace";
    ctx.textAlign = "right";
    ctx.fillText(`剩余噪声体：${alive}`, width - 24, 58);
    ctx.restore();
  }

  renderControls(ctx, width) {
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = "#bff9ff";
    ctx.font = "12px " + getComputedStyle(document.documentElement).getPropertyValue('--font-family-system');
    ctx.textAlign = "right";
    ctx.fillText(I18N.get("controls.pcHint"), width - 24, 88);
    ctx.restore();
  }

  renderStats(ctx, stats, width) {
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = CONFIG.palette.echo;
    ctx.font = "12px Lucida Console, monospace";
    ctx.textAlign = "center";
    ctx.fillText(`时间 ${stats.time.toFixed(1)}   连击 ${stats.combo}`, width / 2, 28);
    ctx.restore();
  }

  renderWeapon(ctx, player, width) {
    const weapon = player.getWeapon();
    ctx.save();
    ctx.fillStyle = CONFIG.palette.gold;
    ctx.shadowBlur = 14;
    ctx.shadowColor = CONFIG.palette.gold;
    ctx.font = "700 14px Lucida Console, monospace";
    ctx.textAlign = "right";
    ctx.fillText(`当前武器：${weapon.name}`, width - 24, 116);
    ctx.restore();
  }

  renderUltimateFrame(ctx, player, width, height) {
    ctx.save();
    const alpha = 0.18 + Math.sin(performance.now() * 0.014) * 0.06;
    ctx.strokeStyle = `rgba(255, 213, 107, ${alpha})`;
    ctx.lineWidth = 10;
    ctx.shadowBlur = 24;
    ctx.shadowColor = CONFIG.palette.gold;
    ctx.strokeRect(5, 5, width - 10, height - 10);
    ctx.restore();
  }

  renderDebug(ctx, game) {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px Lucida Console, monospace";
    ctx.fillText(`FPS ${game.fps.toFixed(0)}  Player ${game.player.state}`, 24, 112);
    ctx.fillText(`Enemy ${game.enemies.map((enemy) => enemy.state).join(", ")}`, 24, 128);
    ctx.restore();
  }

  bar(ctx, x, y, width, height, ratio, color, label) {
    const p = CONFIG.palette;
    ctx.save();
    ctx.fillStyle = "rgba(2, 5, 12, 0.76)";
    ctx.strokeStyle = "rgba(120, 244, 255, 0.34)";
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    ctx.fillStyle = color;
    ctx.shadowBlur = ratio >= 1 ? 18 : 8;
    ctx.shadowColor = color;
    ctx.fillRect(x + 2, y + 2, Math.max(0, (width - 4) * ratio), height - 4);
    ctx.shadowBlur = 0;
    ctx.fillStyle = p.white;
    ctx.font = "10px Lucida Console, monospace";
    ctx.fillText(label, x + 6, y + height - 4);
    ctx.restore();
  }
}
