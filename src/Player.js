class Player extends Entity {
  constructor(audio = null) {
    super({
      x: CONFIG.player.x,
      y: CONFIG.player.y,
      width: CONFIG.player.width,
      height: CONFIG.player.height,
      maxHealth: CONFIG.player.maxHealth
    });
    this.speed = CONFIG.player.speed;
    this.audio = audio;
    this.jumpForce = CONFIG.player.jumpForce;
    this.state = "idle";
    this.canDoubleJump = true;
    this.rage = 0;
    this.maxRage = CONFIG.combat.maxRage;
    this.attackTimer = 0;
    this.parryTimer = 0;
    this.parryHoldTimer = 0;
    this.parryRecoveryTimer = 0;
    this.hurtTimer = 0;
    this.invulnTimer = 0;
    this.isUltimate = false;
    this.ultimateTimer = 0;
    this.weaponIndex = 0;
    this.attackConsumed = false;
    this.lastParryResult = "";
    this.quickParryOnly = false;
    this.trail = [];
    this.aimDir = { x: 1, y: 0 };
  }

  reset() {
    const fresh = new Player();
    Object.assign(this, fresh);
  }

  update(dt, input, platforms, world) {
    this.prevY = this.y;
    this.updateAim(input);
    this.updateTimers(dt, input);
    this.updateActions(input);
    this.updateMovement(dt, input);
    this.vy += CONFIG.world.gravity * dt;
    moveAndCollide(this, platforms, dt, world);
    this.updateStateFromMotion(input);
    this.updateTrail(dt);
  }

  updateAim(input) {
    if (input.axis.x !== 0 || input.axis.y !== 0) {
      const len = Math.hypot(input.axis.x, input.axis.y);
      this.aimDir = { x: input.axis.x / len, y: input.axis.y / len };
      if (Math.abs(input.axis.x) > 0.1) {
        this.facing = Math.sign(input.axis.x);
      }
    } else {
      this.aimDir = { x: this.facing, y: 0 };
    }
  }

  updateTimers(dt, input) {
    if (this.attackTimer > 0) {
      this.attackTimer = Math.max(0, this.attackTimer - dt);
      const weapon = this.getWeapon();
      if (weapon.type === "laser" && this.state === "attack") {
        const activeThreshold = weapon.active + weapon.recovery;
        const activeHoldTimer = weapon.recovery + weapon.active * 0.5;
        if (input.isDown("attack") && this.attackTimer <= activeThreshold && this.attackTimer > weapon.recovery) {
          this.attackTimer = Math.max(this.attackTimer, activeHoldTimer);
        }
      }
      if (this.attackTimer === 0 && this.state === "attack") this.state = "idle";
    }
    if (this.parryTimer > 0) {
      this.parryTimer = Math.max(0, this.parryTimer - dt);
      if (this.state === "parry" && input.isDown("parry") && !this.quickParryOnly) {
        this.parryHoldTimer += dt;
        if (this.parryHoldTimer >= CONFIG.combat.shieldHoldThreshold) {
          this.state = "shield";
          this.parryTimer = 0;
        }
      }
      if (this.parryTimer === 0 && this.state === "parry") {
        this.state = "parry_recovery";
        this.quickParryOnly = false;
        this.parryRecoveryTimer = CONFIG.combat.parryRecovery;
      }
    }
    if (this.state === "shield" && !input.isDown("parry")) {
      this.state = "parry_recovery";
      this.quickParryOnly = false;
      this.parryRecoveryTimer = CONFIG.combat.parryRecovery;
    }
    if (this.parryRecoveryTimer > 0) {
      this.parryRecoveryTimer = Math.max(0, this.parryRecoveryTimer - dt);
      if (this.parryRecoveryTimer === 0 && this.state === "parry_recovery") this.state = "idle";
    }
    if (this.hurtTimer > 0) {
      this.hurtTimer = Math.max(0, this.hurtTimer - dt);
      if (this.hurtTimer === 0 && this.state === "hurt") this.state = "idle";
    }
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.isUltimate) {
      this.ultimateTimer = Math.max(0, this.ultimateTimer - dt);
      if (this.ultimateTimer === 0) this.isUltimate = false;
    }
  }

  updateActions(input) {
    if (!this.isAlive) return;
    if (input.wasPressed("ultimate") && this.rage >= this.maxRage && !this.isUltimate) {
      this.isUltimate = true;
      this.ultimateTimer = CONFIG.combat.ultimateTime;
      this.rage = 0;
      this.heal(this.maxHealth * CONFIG.player.ultimateHealRatio);
    }

    if (this.state === "hurt" && (input.wasPressed("parry") || input.isDown("parry"))) {
      this.startParry(false);
      return;
    }

    if (this.isActionLocked()) return;

    if (input.wasPressed("weapon")) this.switchWeapon();
    if (input.wasPressed("jump")) this.jump();
    if (input.wasPressed("attack")) this.startAttack();
    if (input.wasPressed("parry")) this.startParry(false);
  }

  updateMovement(dt, input) {
    if (!this.isAlive) return;
    const locked = this.state === "hurt" || this.state === "attack" || this.state === "crouch";
    const speedScale = this.isUltimate ? CONFIG.player.ultimateSpeedScale : 1;
    const guardMoveScale = this.state === "shield" ? 0.58 : this.state === "parry" ? 0.78 : this.state === "parry_recovery" ? 0.72 : 1;
    let targetVx = 0;

    if (!locked) {
      if (input.isDown("left")) {
        targetVx -= this.speed * speedScale * guardMoveScale;
        this.facing = -1;
      }
      if (input.isDown("right")) {
        targetVx += this.speed * speedScale * guardMoveScale;
        this.facing = 1;
      }
    }

    const accel = this.isGrounded ? 2800 : 1700;
    this.vx = approach(this.vx, targetVx, accel * dt);
  }

  updateStateFromMotion(input) {
    if (!this.isAlive) {
      this.state = "dead";
      return;
    }
    if (this.state === "attack" || this.state === "parry" || this.state === "shield" || this.state === "parry_recovery" || this.state === "hurt") return;
    if (!this.isGrounded) {
      this.state = this.vy < 0 ? "jump" : "fall";
    } else if (input.isDown("down")) {
      this.state = "crouch";
    } else if (input.isDown("left") || input.isDown("right")) {
      this.state = "run";
    } else {
      this.state = "idle";
    }
  }

  getHitbox() {
    if (this.state === "crouch") {
      return { x: this.x, y: this.y + this.height / 2, width: this.width, height: this.height / 2 };
    }
    return super.getHitbox();
  }

  updateTrail(dt) {
    if (this.isUltimate) {
      this.trail.push({ x: this.x, y: this.y, alpha: 0.34 });
    }
    this.trail.forEach((ghost) => {
      ghost.alpha -= dt * 1.5;
    });
    this.trail = this.trail.filter((ghost) => ghost.alpha > 0);
  }

  isActionLocked() {
    return this.state === "attack" ||
      this.state === "parry" ||
      this.state === "shield" ||
      this.state === "parry_recovery" ||
      this.state === "hurt" ||
      this.state === "dead";
  }

  jump() {
    if (this.isGrounded) {
      this.vy = this.jumpForce;
      this.isGrounded = false;
    } else if (this.canDoubleJump) {
      this.vy = this.jumpForce * 0.88;
      this.canDoubleJump = false;
    }
  }

  startAttack() {
    const weapon = this.getWeapon();
    this.state = "attack";
    this.attackTimer = weapon.startup + weapon.active + weapon.recovery;
    this.attackConsumed = false;
    if (weapon.type === "melee") this.audio?.playSfx("melee");
  }

  startParry(quickOnly = false) {
    this.state = "parry";
    this.parryTimer = CONFIG.combat.parryNormalWindow;
    this.parryHoldTimer = 0;
    this.lastParryResult = "";
    this.quickParryOnly = quickOnly;
    this.vx *= 0.82;
  }

  getParryField(isShield = false) {
    const center = rectCenter(this.getHitbox());
    return {
      x: center.x,
      y: center.y,
      radius: isShield ? CONFIG.combat.shieldRadius : CONFIG.combat.parryRadius
    };
  }

  getAttackBox() {
    const weapon = this.getWeapon();
    if (weapon.type !== "melee") {
      return { x: this.x, y: this.y, width: 0, height: 0, active: false };
    }
    const elapsed = this.getAttackElapsed();
    const activeStart = weapon.startup;
    const activeEnd = activeStart + weapon.active;
    const active = this.state === "attack" && elapsed >= activeStart && elapsed <= activeEnd && !this.attackConsumed;
    const width = weapon.boxWidth;
    const height = weapon.boxHeight;
    return {
      x: this.facing > 0 ? this.x + this.width - 2 : this.x - width + 2,
      y: this.y + 7,
      width,
      height,
      active
    };
  }

  getAttackElapsed() {
    const weapon = this.getWeapon();
    const total = weapon.startup + weapon.active + weapon.recovery;
    return total - this.attackTimer;
  }

  getParryElapsed() {
    return CONFIG.combat.parryNormalWindow - this.parryTimer;
  }

  addRage(amount) {
    if (this.isUltimate && amount > 0) return;
    if (!this.isUltimate && this.rage >= this.maxRage && amount < 0) return;
    this.rage = clamp(this.rage + amount, 0, this.maxRage);
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  switchWeapon() {
    this.weaponIndex = (this.weaponIndex + 1) % CONFIG.weapons.length;
  }

  getWeapon() {
    return CONFIG.weapons[this.weaponIndex];
  }

  isRangedAttackReady() {
    const weapon = this.getWeapon();
    if (weapon.type === "laser") return false;
    if (weapon.type === "melee" || this.state !== "attack" || this.attackConsumed) return false;
    const elapsed = this.getAttackElapsed();
    return elapsed >= weapon.startup && elapsed <= weapon.startup + weapon.active;
  }

  isLaserAttackActive() {
    const weapon = this.getWeapon();
    if (weapon.type !== "laser" || this.state !== "attack") return false;
    return this.getAttackElapsed() >= weapon.startup;
  }

  getMuzzle() {
    const weapon = this.getWeapon();
    const isCrouching = this.state === "crouch";
    const offsetY = isCrouching ? 18 : 0;
    const muzzleOffset = weapon.type === "laser" ? 18 : 6;
    return {
      x: this.facing > 0 ? this.x + this.width + muzzleOffset : this.x - muzzleOffset,
      y: this.y + 24 + offsetY
    };
  }

  takeDamage(amount, direction = -this.facing) {
    if (!this.isAlive || this.invulnTimer > 0) return false;
    super.takeDamage(amount);
    if (!this.isAlive) {
      this.state = "dead";
      return true;
    }
    if (this.isUltimate) {
      this.invulnTimer = CONFIG.player.hurtInvuln * 0.35;
      return true;
    }
    this.state = "hurt";
    this.hurtTimer = 0.28;
    this.invulnTimer = CONFIG.player.hurtInvuln;
    this.vx = direction * 260;
    this.vy = -170;
    this.addRage(CONFIG.combat.hurtRage);
    return true;
  }

  render(ctx) {
    this.renderTrail(ctx);
    const p = CONFIG.palette;
    const blink = this.invulnTimer > 0 && Math.floor(this.invulnTimer * 28) % 2 === 0;
    if (blink) return;

    const isCrouching = this.state === "crouch";
    const offsetY = isCrouching ? 18 : 0;

    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y) + offsetY);
    ctx.shadowBlur = this.isUltimate ? 22 : 13;
    ctx.shadowColor = this.isUltimate ? p.gold : p.echo;

    const bodyColor = this.state === "parry" || this.state === "shield" ? p.white : this.isUltimate ? p.gold : p.player;
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = this.isUltimate ? p.gold : p.echo;
    ctx.lineWidth = 2;

    if (isCrouching) {
      ctx.fillRect(7, 12, 17, 10);
      ctx.strokeRect(7.5, 12.5, 16, 9);
      ctx.fillRect(10, 2, 13, 10);
      ctx.fillRect(4, 23, 8, 5);
      ctx.fillRect(20, 23, 8, 5);
    } else {
      ctx.fillRect(7, 12, 17, 28);
      ctx.strokeRect(7.5, 12.5, 16, 27);
      ctx.fillRect(10, 2, 13, 10);
      ctx.fillRect(4, 41, 8, 5);
      ctx.fillRect(20, 41, 8, 5);
    }

    ctx.fillStyle = this.isUltimate ? "#fff7bf" : p.echo;
    ctx.fillRect(13, 22, 6, 6);

    this.renderWeapon(ctx, p, isCrouching);

    if (this.state === "parry" || this.state === "shield") {
      const radius = this.state === "shield" ? CONFIG.combat.shieldRadius : CONFIG.combat.parryRadius;
      ctx.strokeStyle = this.state === "parry" ? p.white : p.echo;
      ctx.lineWidth = this.state === "shield" ? 6 : 4;
      ctx.globalAlpha = this.state === "shield" ? 0.88 : 0.96;
      ctx.beginPath();
      ctx.arc(15, 24, radius * 0.58, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.arc(15, 24, radius * 0.42, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  renderWeapon(ctx, p, isCrouching = false) {
    const weapon = this.getWeapon();
    const weaponColor = this.isUltimate ? p.gold : p.echo;
    ctx.fillStyle = weaponColor;

    ctx.save();

    if (weapon.type === "melee") {
      this.renderMeleeWeapon(ctx, p);
      ctx.restore();
      return;
    }

    // Rotate ranged weapons if aiming up/down.
    let cx = 15;
    let cy = 20;
    ctx.translate(cx, cy);
    if (this.aimDir.y !== 0 && this.aimDir.x === 0) {
      ctx.rotate(this.aimDir.y * Math.PI / 2 * this.facing);
    } else if (this.aimDir.y !== 0) {
      ctx.rotate(Math.atan2(this.aimDir.y, Math.abs(this.aimDir.x)) * this.facing);
    }
    ctx.translate(-cx, -cy);

    if (weapon.type === "laser") {
      this.renderLaserWeapon(ctx, p);
      ctx.restore();
      return;
    }

    const gunX = this.facing > 0 ? 25 : -20;
    const barrel = weapon.type === "shotgun" ? 23 : 27;
    ctx.fillRect(gunX, 18, barrel, 7);
    ctx.fillStyle = "#10232e";
    ctx.fillRect(gunX + (this.facing > 0 ? 5 : 10), 25, 9, 5);
    if (this.state === "attack") {
      ctx.fillStyle = weapon.type === "shotgun" ? p.gold : p.white;
      const flashX = this.facing > 0 ? gunX + barrel : gunX - 10;
      ctx.fillRect(flashX, 17, 10, 9);
    }
    ctx.restore();
  }

  renderLaserWeapon(ctx, p) {
    const glow = this.isUltimate ? p.gold : (p.laser ?? "#9cff72");
    const gunX = this.facing > 0 ? 24 : -24;
    const barrel = 32;
    ctx.fillStyle = "rgba(18, 32, 24, 0.95)";
    ctx.fillRect(gunX - 2, 17, barrel + 4, 9);
    ctx.fillStyle = glow;
    ctx.fillRect(gunX, 19, barrel, 5);
    ctx.fillStyle = "#eaffdc";
    ctx.fillRect(gunX + (this.facing > 0 ? 22 : 4), 20, 6, 3);
    ctx.fillStyle = "#13291c";
    ctx.fillRect(gunX + (this.facing > 0 ? 7 : 16), 25, 9, 5);

    const emitterX = this.facing > 0 ? gunX + barrel : gunX - 6;
    ctx.fillStyle = glow;
    ctx.shadowBlur = 14;
    ctx.shadowColor = glow;
    ctx.fillRect(emitterX, 17, 6, 9);

    if (this.state === "attack") {
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "#f6ffd9";
      ctx.fillRect(this.facing > 0 ? emitterX + 4 : emitterX - 10, 16, 10, 11);
    }
    ctx.shadowBlur = 0;
  }

  renderMeleeWeapon(ctx, p) {
    const weapon = this.getWeapon();
    const elapsed = this.state === "attack" ? this.getAttackElapsed() : 0;
    const activeStart = weapon.startup;
    const activeEnd = weapon.startup + weapon.active;
    const total = weapon.startup + weapon.active + weapon.recovery;
    const startupProgress = this.state === "attack" && elapsed < activeStart
      ? clamp(elapsed / activeStart, 0, 1)
      : 0;
    const activeProgress = this.state === "attack" && elapsed >= activeStart && elapsed <= activeEnd
      ? clamp((elapsed - activeStart) / weapon.active, 0, 1)
      : 0;
    const recoveryProgress = this.state === "attack" && elapsed > activeEnd
      ? clamp((elapsed - activeEnd) / Math.max(0.001, total - activeEnd), 0, 1)
      : 0;

    let angle = 0.32;
    if (this.state === "attack" && elapsed < activeStart) {
      angle = 0.1 - startupProgress * 1.18;
    } else if (this.state === "attack" && elapsed <= activeEnd) {
      angle = -1.08 + activeProgress * 1.92;
    } else if (this.state === "attack") {
      angle = 0.84 - recoveryProgress * 0.52;
    }

    const shoulder = { x: this.facing > 0 ? 21 : 10, y: 23 };
    const hand = {
      x: shoulder.x + Math.cos(angle) * this.facing * 14,
      y: shoulder.y + Math.sin(angle) * 14
    };
    const bladeLength = this.isUltimate ? 36 : 24;
    const blade = {
      x: hand.x + Math.cos(angle) * this.facing * bladeLength,
      y: hand.y + Math.sin(angle) * bladeLength
    };
    const pommel = {
      x: hand.x - Math.cos(angle) * this.facing * 11,
      y: hand.y - Math.sin(angle) * 11
    };

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(180, 248, 255, 0.9)";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(hand.x, hand.y);
    ctx.stroke();

    ctx.strokeStyle = this.isUltimate ? p.gold : p.echo;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pommel.x, pommel.y);
    ctx.lineTo(hand.x, hand.y);
    ctx.stroke();

    ctx.strokeStyle = this.isUltimate ? "#fff7bf" : "#dfffff";
    ctx.shadowBlur = this.isUltimate ? 18 : 10;
    ctx.shadowColor = this.isUltimate ? p.gold : p.echo;
    ctx.lineWidth = this.isUltimate ? 6 : 4;
    ctx.beginPath();
    ctx.moveTo(hand.x, hand.y);
    ctx.lineTo(blade.x, blade.y);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#f7fdff";
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    if (this.state === "attack" && elapsed >= activeStart && elapsed <= activeEnd) {
      ctx.globalAlpha = this.isUltimate ? 0.34 : 0.22;
      ctx.strokeStyle = this.isUltimate ? p.gold : p.echo;
      ctx.lineWidth = this.isUltimate ? 10 : 7;
      ctx.beginPath();
      ctx.arc(shoulder.x, shoulder.y, bladeLength + 12, -1.02 * this.facing, 0.9 * this.facing, this.facing < 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  renderTrail(ctx) {
    const p = CONFIG.palette;
    for (const ghost of this.trail) {
      ctx.save();
      ctx.globalAlpha = ghost.alpha;
      ctx.fillStyle = p.gold;
      ctx.shadowBlur = 18;
      ctx.shadowColor = p.gold;
      ctx.fillRect(Math.round(ghost.x + 7), Math.round(ghost.y + 12), 17, 28);
      ctx.restore();
    }
  }
}
