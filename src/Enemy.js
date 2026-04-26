class Enemy extends Entity {
  constructor(x, y, type = "striker", tutorialId = null) {
    super({
      x,
      y,
      width: 34,
      height: 50,
      maxHealth: CONFIG.enemy.maxHealth
    });
    this.speed = CONFIG.enemy.speed;
    this.type = type;
    this.tutorialId = tutorialId;
    this.state = "idle";
    this.timer = 0;
    this.hitFlash = 0;
    this.attackResolved = false;
    this.breakAmount = 0;
    this.patrolDir = Math.random() > 0.5 ? 1 : -1;
    this.homePlatform = null;
    this.pendingShot = false;
    this.lastMoveIntent = 0;
    if (this.type === "caster") {
      this.maxHealth = CONFIG.enemy.casterHealth;
      this.health = this.maxHealth;
      this.width = 32;
      this.height = 42;
      this.speed = CONFIG.enemy.speed * 0.82;
    } else if (this.type === "skirmisher") {
      this.maxHealth = 78;
      this.health = this.maxHealth;
      this.width = 30;
      this.height = 46;
      this.speed = CONFIG.enemy.speed * 1.2;
    }
  }

  getTiming() {
    if (this.type === "skirmisher") {
      return {
        startup: 0.42,
        active: 0.12,
        recovery: 0.22,
        activeSpeed: 310,
        range: 82,
        damage: 12
      };
    }

    return {
      startup: CONFIG.enemy.startupTime,
      active: CONFIG.enemy.activeTime,
      recovery: CONFIG.enemy.recoveryTime,
      activeSpeed: 220,
      range: CONFIG.enemy.attackRange,
      damage: CONFIG.enemy.attackDamage
    };
  }

  startAttackStartup(multiplier = 1) {
    const timing = this.getTiming();
    const jitter = this.type === "skirmisher"
      ? 0.88 + Math.random() * 0.24
      : 0.7 + Math.random() * 0.6;
    this.state = "attack_startup";
    this.timer = timing.startup * jitter * multiplier;
    this.attackResolved = false;
    this.vx = 0;
  }

  update(dt, player, platforms, world) {
    if (!this.isAlive) {
      this.state = "dead";
      return;
    }

    this.prevY = this.y;
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.homePlatform = this.findStandingPlatform(platforms) ?? this.homePlatform;
    this.updateState(dt, player, platforms);
    const previousX = this.x;
    this.lastMoveIntent = this.vx;
    this.vy += CONFIG.world.gravity * dt;
    moveAndCollide(this, platforms, dt, world);
    this.resolvePatrolBlock(previousX, platforms);
    this.rescueFromVoid(platforms);
  }

  updateState(dt, player, platforms) {
    const distance = player.x + player.width / 2 - (this.x + this.width / 2);
    const absDistance = Math.abs(distance);
    this.facing = distance >= 0 ? 1 : -1;
    const reachable = this.type === "caster" ? this.canSeePlayer(player) : this.canReachPlayer(player);

    switch (this.state) {
      case "idle":
        if (absDistance <= CONFIG.enemy.detectRange && reachable) {
          if (this.tutorialId === "master" && this.type === "striker") {
            this.state = absDistance <= this.getTiming().range ? "attack_startup" : "idle";
            if (this.state === "attack_startup") {
              this.startAttackStartup();
            }
          } else {
            this.state = "chase";
          }
        } else if (this.tutorialId === "master") {
          this.vx = 0;
        } else {
          this.safePatrol(platforms);
        }
        break;
      case "chase":
        if (this.type === "caster") {
          if (this.tutorialId === "master") {
            this.vx = 0;
            if (absDistance <= CONFIG.enemy.casterRange) {
              this.state = "attack_startup";
              this.timer = CONFIG.enemy.startupTime * (0.7 + Math.random() * 0.6);
              this.attackResolved = false;
            }
          } else {
            this.updateCasterChase(distance, absDistance, platforms);
          }
        } else if (this.tutorialId === "master") {
          this.vx = 0;
          if (absDistance <= this.getTiming().range) {
            this.startAttackStartup();
          }
        } else if (absDistance <= this.getTiming().range) {
          this.startAttackStartup();
        } else if (!reachable) {
          this.safePatrol(platforms);
        } else {
          this.vx = this.getSafeVelocity(Math.sign(distance), platforms);
        }
        break;
      case "attack_startup":
        this.vx = 0;
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = "attack_active";
          const timing = this.getTiming();
          const jitter = this.type === "skirmisher" ? 0.9 + Math.random() * 0.18 : 0.8 + Math.random() * 0.4;
          this.timer = timing.active * jitter;
          this.attackResolved = false;
        }
        break;
      case "attack_active":
        this.vx = this.type === "caster" ? 0 : this.getSafeVelocity(this.facing, platforms, this.getTiming().activeSpeed);
        if (this.type === "caster" && !this.attackResolved) {
          this.pendingShot = true;
          this.attackResolved = true;
        }
        this.timer -= dt;
        if (this.timer <= 0 || this.attackResolved) {
          this.state = "attack_recovery";
          const timing = this.getTiming();
          const jitter = this.type === "skirmisher" ? 0.9 + Math.random() * 0.2 : 0.8 + Math.random() * 0.4;
          this.timer = timing.recovery * jitter;
          this.vx = 0;
        }
        break;
      case "attack_recovery":
        this.vx = 0;
        this.timer -= dt;
        if (this.timer <= 0) this.state = reachable ? "chase" : "idle";
        break;
      case "stunned":
        this.vx = 0;
        this.timer -= dt;
        this.breakAmount = Math.max(0, this.timer / CONFIG.enemy.stunTime);
        if (this.timer <= 0) this.state = "chase";
        break;
      default:
        break;
    }
  }

  updateCasterChase(distance, absDistance, platforms) {
    if (this.allowCloseRangeShot && absDistance <= CONFIG.enemy.casterRange) {
      this.state = "attack_startup";
      this.timer = CONFIG.enemy.startupTime * (0.75 + Math.random() * 0.45);
      this.attackResolved = false;
      this.vx = 0;
      return;
    }

    if (absDistance <= CONFIG.enemy.casterRange && absDistance >= CONFIG.enemy.casterKeepAway) {
      this.state = "attack_startup";
      this.timer = CONFIG.enemy.startupTime * (0.6 + Math.random() * 0.5);
      this.attackResolved = false;
      this.vx = 0;
      return;
    }

    const direction = absDistance < CONFIG.enemy.casterKeepAway ? -Math.sign(distance) : Math.sign(distance);
    this.vx = this.getSafeVelocity(direction, platforms, this.speed);
  }

  canSeePlayer(player) {
    const verticalGap = Math.abs((player.y + player.height / 2) - (this.y + this.height / 2));
    const horizontalGap = Math.abs((player.x + player.width / 2) - (this.x + this.width / 2));
    return verticalGap <= 170 && horizontalGap <= CONFIG.enemy.detectRange + 170;
  }

  canReachPlayer(player) {
    if (!this.homePlatform) return false;
    const playerFeet = player.y + player.height;
    const sameVerticalBand = Math.abs(playerFeet - this.homePlatform.y) <= CONFIG.enemy.maxChaseHeightGap;
    const playerAbovePlatform = player.x + player.width > this.homePlatform.x &&
      player.x < this.homePlatform.x + this.homePlatform.width;
    return sameVerticalBand && playerAbovePlatform;
  }

  safePatrol(platforms) {
    if (!this.homePlatform) {
      this.vx = 0;
      return;
    }
    const nearLeft = this.x <= this.homePlatform.x + 18;
    const nearRight = this.x + this.width >= this.homePlatform.x + this.homePlatform.width - 18;
    if (nearLeft) this.patrolDir = 1;
    if (nearRight) this.patrolDir = -1;
    if (this.hasWallAhead(this.patrolDir, platforms)) this.patrolDir *= -1;
    this.facing = this.patrolDir;
    this.vx = this.getSafeVelocity(this.patrolDir, platforms, this.speed * 0.45);
    if (Math.abs(this.vx) < 1 && this.hasGroundAhead(-this.patrolDir, platforms)) {
      this.patrolDir *= -1;
      this.facing = this.patrolDir;
      this.vx = this.getSafeVelocity(this.patrolDir, platforms, this.speed * 0.45);
    }
  }

  getSafeVelocity(direction, platforms, speed = this.speed) {
    if (!direction || !this.hasGroundAhead(direction, platforms)) return 0;
    return direction * speed;
  }

  hasGroundAhead(direction, platforms) {
    if (!direction) return true;
    const probeX = direction > 0
      ? this.x + this.width + CONFIG.enemy.ledgeProbe
      : this.x - CONFIG.enemy.ledgeProbe;
    const feetY = this.y + this.height + 8;
    return platforms.some((platform) => {
      const withinX = probeX >= platform.x && probeX <= platform.x + platform.width;
      const closeY = feetY >= platform.y && feetY <= platform.y + platform.height + 18;
      return withinX && closeY;
    });
  }

  hasWallAhead(direction, platforms) {
    if (!direction) return false;
    const probeWidth = 12;
    const probe = {
      x: direction > 0 ? this.x + this.width + 3 : this.x - probeWidth - 3,
      y: this.y + 6,
      width: probeWidth,
      height: Math.max(12, this.height - 12)
    };
    return platforms.some((platform) => intersects(probe, platform));
  }

  findStandingPlatform(platforms) {
    const feet = this.y + this.height;
    const centerX = this.x + this.width / 2;
    return platforms.find((platform) => {
      const withinX = centerX >= platform.x && centerX <= platform.x + platform.width;
      const nearTop = feet >= platform.y - 3 && feet <= platform.y + platform.height + 6;
      return withinX && nearTop;
    }) ?? null;
  }

  rescueFromVoid(platforms) {
    if (this.y < CONFIG.world.floorDeathY) return;
    const fallback = this.homePlatform ?? platforms[0];
    this.x = fallback.x + fallback.width / 2 - this.width / 2;
    this.y = fallback.y - this.height;
    this.vx = 0;
    this.vy = 0;
    this.state = "idle";
  }

  resolvePatrolBlock(previousX, platforms) {
    if (this.tutorialId === "master" || this.state !== "idle") return;
    if (Math.abs(this.lastMoveIntent) < 1) return;
    const movedDistance = Math.abs(this.x - previousX);
    if (movedDistance > 1) return;
    this.patrolDir = this.lastMoveIntent > 0 ? -1 : 1;
    this.facing = this.patrolDir;
    this.vx = this.getSafeVelocity(this.patrolDir, platforms, this.speed * 0.45);
  }

  getAttackBox() {
    if (this.type === "caster") {
      return { x: this.x, y: this.y, width: 0, height: 0, active: false };
    }
    const width = this.type === "skirmisher" ? 54 : 62;
    return {
      x: this.facing > 0 ? this.x + this.width - 4 : this.x - width + 4,
      y: this.y + 13,
      width,
      height: this.type === "skirmisher" ? 24 : 28,
      active: this.state === "attack_active" && !this.attackResolved
    };
  }

  getAttackDamage() {
    return this.getTiming().damage;
  }

  consumeShot() {
    if (!this.pendingShot) return null;
    this.pendingShot = false;
    return {
      x: this.facing > 0 ? this.x + this.width + 4 : this.x - 12,
      y: this.y + this.height / 2,
      vx: this.facing * CONFIG.enemy.casterProjectileSpeed,
      vy: 0,
      width: 13,
      height: 7,
      damage: CONFIG.enemy.casterProjectileDamage,
      rangeLeft: 680,
      color: CONFIG.palette.noise,
      owner: "enemy",
      sourceEnemy: this
    };
  }

  stun() {
    this.state = "stunned";
    this.timer = CONFIG.enemy.stunTime;
    this.attackResolved = true;
    this.vx = -this.facing * 110;
    this.hitFlash = 0.18;
    this.breakAmount = 1;
  }

  parried() {
    this.state = "attack_recovery";
    this.timer = this.getTiming().recovery * 0.85;
    this.attackResolved = true;
    this.vx = -this.facing * 180;
    this.hitFlash = 0.10;
  }

  takeDamage(amount, knockDirection = this.facing) {
    super.takeDamage(amount);
    this.hitFlash = 0.12;
    this.vx = knockDirection * 160;
    if (!this.isAlive) this.state = "dead";
  }

  render(ctx) {
    if (!this.isAlive) return;
    const p = CONFIG.palette;
    const center = rectCenter(this);
    const isStartup = this.state === "attack_startup";
    const isActive = this.state === "attack_active";
    const isStunned = this.state === "stunned";
    const flash = this.hitFlash > 0;

    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.shadowBlur = isStartup ? 26 : isStunned ? 24 : 13;
    ctx.shadowColor = isStunned ? p.white : p.noise;
    ctx.fillStyle = flash ? p.white : isStunned ? "#ffd7e1" : p.noise;
    ctx.strokeStyle = isStunned ? p.white : "#ff87a1";
    ctx.lineWidth = 2;

    if (this.type === "caster") {
      ctx.beginPath();
      ctx.moveTo(17, 0);
      ctx.lineTo(32, 34);
      ctx.lineTo(0, 34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isStartup ? p.white : "#210714";
      ctx.fillRect(12, 16, 9, 8);
      if (isStartup) {
        ctx.globalAlpha = 0.16;
        ctx.strokeStyle = p.noise;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.facing > 0 ? 34 : -12, 20);
        ctx.lineTo(this.facing > 0 ? 118 : -96, 18);
        ctx.stroke();
        ctx.globalAlpha = 1;
        this.renderParryLamp(ctx, 16, 12);
      }
      ctx.restore();
      this.renderHealth(ctx, center.x, this.y - 12);
      return;
    }

    ctx.beginPath();
    if (this.type === "skirmisher") {
      ctx.moveTo(12, 2);
      ctx.lineTo(30, 14);
      ctx.lineTo(22, 45);
      ctx.lineTo(3, 36);
    } else {
      ctx.moveTo(8, 4);
      ctx.lineTo(30, 10);
      ctx.lineTo(27, 46);
      ctx.lineTo(4, 40);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isStunned ? p.white : "#210714";
    ctx.fillRect(this.type === "skirmisher" ? 12 : 13, this.type === "skirmisher" ? 18 : 19, 9, 8);

    this.renderMeleeArm(ctx, p, isStartup, isActive);

    if (isStartup) {
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = p.noise;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const warnX = this.facing > 0 ? 52 : -42;
      ctx.moveTo(warnX, 14);
      ctx.lineTo(warnX + this.facing * 44, 26);
      ctx.stroke();
      ctx.globalAlpha = 1;
      this.renderParryLamp(ctx, this.facing > 0 ? 31 : 3, 13);
    }

    if (isStunned) {
      ctx.strokeStyle = p.white;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(8, 8);
      ctx.lineTo(23, 24);
      ctx.moveTo(30, 13);
      ctx.lineTo(13, 38);
      ctx.stroke();
    }

    ctx.restore();

    this.renderHealth(ctx, center.x, this.y - 12);
  }

  renderMeleeArm(ctx, p, isStartup, isActive) {
    const shoulder = { x: this.facing > 0 ? 22 : 10, y: 24 };
    const timing = this.getTiming();
    const startupProgress = isStartup ? clamp(1 - this.timer / timing.startup, 0, 1) : 0;
    const activeProgress = isActive ? clamp(1 - this.timer / timing.active, 0, 1) : 0;
    let angle = 0.28;

    if (isStartup) angle = this.type === "skirmisher" ? 0.18 - startupProgress * 1.36 : 0.08 - startupProgress * 1.12;
    if (isActive) angle = this.type === "skirmisher" ? -1.18 + activeProgress * 2.05 : -1.04 + activeProgress * 1.76;
    if (this.state === "attack_recovery") angle = this.type === "skirmisher" ? 0.58 : 0.72;

    const hand = {
      x: shoulder.x + Math.cos(angle) * this.facing * 15,
      y: shoulder.y + Math.sin(angle) * 15
    };
    const blade = {
      x: hand.x + Math.cos(angle) * this.facing * (this.type === "skirmisher" ? 27 : 22),
      y: hand.y + Math.sin(angle) * (this.type === "skirmisher" ? 27 : 22)
    };
    const pommel = {
      x: hand.x - Math.cos(angle) * this.facing * 10,
      y: hand.y - Math.sin(angle) * 10
    };

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255, 212, 224, 0.9)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(hand.x, hand.y);
    ctx.stroke();

    ctx.strokeStyle = "#ff8da8";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pommel.x, pommel.y);
    ctx.lineTo(hand.x, hand.y);
    ctx.stroke();

    ctx.strokeStyle = isActive ? CONFIG.palette.noise : "#ff9aae";
    ctx.lineWidth = 4;
    ctx.shadowBlur = isActive ? 16 : 8;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(hand.x, hand.y);
    ctx.lineTo(blade.x, blade.y);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff1f4";
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, 2.3, 0, Math.PI * 2);
    ctx.fill();

    if (isActive) {
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(shoulder.x, shoulder.y, 34, -1.0 * this.facing, 0.82 * this.facing, this.facing < 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  renderParryLamp(ctx, x, y) {
    if (this.timer > 0.18) return;
    const flash = 0.35 + Math.sin(performance.now() * 0.06) * 0.65;
    ctx.save();
    ctx.globalAlpha = Math.max(0.25, flash);
    ctx.fillStyle = CONFIG.palette.noise;
    ctx.shadowBlur = 16;
    ctx.shadowColor = CONFIG.palette.noise;
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff4f6";
    ctx.globalAlpha = Math.max(0.35, flash * 0.75);
    ctx.beginPath();
    ctx.arc(x - 1.5, y - 1.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderHealth(ctx, centerX, y) {
    const width = 44;
    const ratio = Math.max(0, this.health / this.maxHealth);
    ctx.save();
    ctx.fillStyle = "rgba(10, 7, 16, 0.72)";
    ctx.fillRect(Math.round(centerX - width / 2), Math.round(y), width, 5);
    ctx.fillStyle = CONFIG.palette.noise;
    ctx.fillRect(Math.round(centerX - width / 2), Math.round(y), Math.round(width * ratio), 5);
    ctx.restore();
  }
}
