class CombatSystem {
  constructor(stats, effects, projectiles, audio = null) {
    this.stats = stats;
    this.effects = effects;
    this.projectiles = projectiles;
    this.audio = audio;
  }

  rectIntersectsCircle(rect, circle) {
    const nearestX = clamp(circle.x, rect.x, rect.x + rect.width);
    const nearestY = clamp(circle.y, rect.y, rect.y + rect.height);
    const dx = circle.x - nearestX;
    const dy = circle.y - nearestY;
    return dx * dx + dy * dy <= circle.radius * circle.radius;
  }

  withinGuardField(player, rect, isShield = false) {
    return this.rectIntersectsCircle(rect, player.getParryField(isShield));
  }

  healOnParry(player, perfect = false) {
    const healAmount = player.maxHealth * (CONFIG.player.parryHealRatio ?? 0);
    if (healAmount <= 0 || player.health >= player.maxHealth) return;
    player.heal(healAmount);
    this.effects.addMessage(perfect ? "完美回响，生命回复。" : "回响成功，生命回复。", CONFIG.palette.gold, perfect ? 0.72 : 0.58);
  }

  vibratePerfectParry() {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    const isTouchDevice = navigator.maxTouchPoints > 0 || typeof window !== "undefined" && "ontouchstart" in window;
    if (!isTouchDevice) return;
    navigator.vibrate([18, 18, 34]);
  }

  update(player, enemies, dt, platforms, stage = null) {
    this.spawnPlayerProjectiles(player, platforms, stage);
    this.updateProjectiles(enemies, dt, player, platforms, stage);
    this.resolvePlayerAttack(player, enemies, stage);
    this.resolveEnemyAttacks(player, enemies);
  }

  spawnPlayerProjectiles(player, platforms, stage = null) {
    const weapon = player.getWeapon();
    if (weapon.type === "laser") {
      this.syncPlayerLaser(player, weapon, platforms, stage);
      return;
    }
    if (!player.isRangedAttackReady()) return;
    const muzzle = player.getMuzzle();
    const damageScale = player.isUltimate ? CONFIG.player.ultimateDamageScale : 1;
    const pellets = weapon.pellets ?? 1;
    const middle = (pellets - 1) / 2;

    this.audio?.playSfx(weapon.type === "shotgun" ? "shotgun" : "rifle");

    for (let i = 0; i < pellets; i += 1) {
      const offset = pellets === 1 ? 0 : (i - middle) * weapon.spread;
      const baseAngle = Math.atan2(player.aimDir.y, player.aimDir.x);
      const angle = baseAngle + offset * player.facing;
      
      this.projectiles.push({
        x: muzzle.x,
        y: muzzle.y,
        vx: Math.cos(angle) * weapon.speed,
        vy: Math.sin(angle) * weapon.speed,
        width: weapon.type === "shotgun" ? 10 : 14,
        height: weapon.type === "shotgun" ? 5 : 4,
        damage: weapon.damage * damageScale,
        rangeLeft: weapon.range,
        color: weapon.type === "shotgun" ? CONFIG.palette.gold : CONFIG.palette.echo,
        owner: "player"
      });
    }

    player.attackConsumed = true;
    this.effects.addHit(muzzle.x, muzzle.y, weapon.type === "shotgun" ? CONFIG.palette.gold : CONFIG.palette.echo, weapon.type === "shotgun" ? 8 : 4);
    this.effects.stop(weapon.type === "shotgun" ? 0.035 : 0.018);
  }

  syncPlayerLaser(player, weapon, platforms, stage = null) {
    const existingBeam = this.projectiles.find((projectile) => projectile.kind === "laser" && projectile.owner === "player" && projectile.sourceId === "player-laser");
    if (!player.isLaserAttackActive()) {
      if (existingBeam) existingBeam.dead = true;
      return;
    }

    const muzzle = player.getMuzzle();
    const damageScale = player.isUltimate ? CONFIG.player.ultimateDamageScale : 1;
    const baseAngle = Math.atan2(player.aimDir.y, player.aimDir.x);
    const direction = { x: Math.cos(baseAngle), y: Math.sin(baseAngle) };
    const trace = this.traceLaserPath(muzzle, direction, weapon, platforms, stage);

    if (existingBeam) {
      existingBeam.color = CONFIG.palette.laser ?? CONFIG.palette.gold;
      existingBeam.width = weapon.beamWidth;
      existingBeam.damage = weapon.tickDamage * damageScale;
      existingBeam.tickInterval = weapon.tickInterval;
      existingBeam.durationLeft = weapon.beamLife;
      existingBeam.maxDuration = weapon.beamLife;
      existingBeam.segments = trace.segments;
      existingBeam.dirX = direction.x;
      existingBeam.dirY = direction.y;
      return;
    }

    this.spawnLaserBeam(player, weapon, muzzle, damageScale, platforms, stage);
    player.attackConsumed = true;
    this.effects.addHit(muzzle.x, muzzle.y, CONFIG.palette.laser ?? CONFIG.palette.gold, 7);
    this.effects.stop(0.024);
    this.audio?.playSfx("rifle");
  }

  spawnLaserBeam(player, weapon, muzzle, damageScale, platforms, stage = null) {
    const baseAngle = Math.atan2(player.aimDir.y, player.aimDir.x);
    const direction = { x: Math.cos(baseAngle), y: Math.sin(baseAngle) };
    const trace = this.traceLaserPath(muzzle, direction, weapon, platforms, stage);
    this.projectiles.push({
      kind: "laser",
      sourceId: "player-laser",
      owner: "player",
      color: CONFIG.palette.laser ?? CONFIG.palette.gold,
      width: weapon.beamWidth,
      damage: weapon.tickDamage * damageScale,
      tickInterval: weapon.tickInterval,
      durationLeft: weapon.beamLife,
      maxDuration: weapon.beamLife,
      segments: trace.segments,
      hitTimers: new Map(),
      dirX: direction.x,
      dirY: direction.y
    });
  }

  updateProjectiles(enemies, dt, player, platforms, stage = null) {
    for (const projectile of this.projectiles) {
      if (projectile.dead) continue;
      if (projectile.kind === "laser") {
        this.updateLaserBeam(projectile, enemies, dt, player);
        continue;
      }
      const stepX = projectile.vx * dt;
      const stepY = projectile.vy * dt;
      projectile.x += stepX;
      projectile.y += stepY;
      projectile.rangeLeft -= Math.abs(stepX) + Math.abs(stepY) * 0.4;

      // Platform collision
      let hitPlatform = false;
      for (const platform of platforms) {
        if (intersects(projectile, platform)) {
          stage?.handleProjectilePlatformHit?.(projectile, platform);
          hitPlatform = true;
          break;
        }
      }
      if (hitPlatform) {
        projectile.dead = true;
        this.effects.addHit(projectile.x, projectile.y, projectile.color, 4);
        continue;
      }

      if (projectile.owner === "player") {
        for (const enemy of enemies) {
          if (!enemy.isAlive || !intersects(projectile, enemy.getHitbox())) continue;
          enemy.takeDamage(projectile.damage, Math.sign(projectile.vx));
          projectile.dead = true;
          player.addRage(CONFIG.combat.attackRage);
          this.stats.combo += 1;
          this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);
          const hit = rectCenter(enemy);
          this.effects.addHit(hit.x, hit.y, projectile.color, 8);
          this.effects.addRing(hit.x, hit.y, projectile.color, false);
          break;
        }
      } else if (
        projectile.owner === "enemy" &&
        (
          intersects(projectile, player.getHitbox()) ||
          (player.state === "parry" && this.withinGuardField(player, projectile, false)) ||
          (player.state === "shield" && this.withinGuardField(player, projectile, true))
        )
      ) {
        this.resolveEnemyProjectile(player, projectile);
      }

      if (projectile.rangeLeft <= 0) projectile.dead = true;
    }

    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      if (this.projectiles[i].dead) this.projectiles.splice(i, 1);
    }
  }

  updateLaserBeam(projectile, enemies, dt, player) {
    projectile.durationLeft = Math.max(0, projectile.durationLeft - dt);
    for (const [enemy, timer] of projectile.hitTimers.entries()) {
      if (!enemy.isAlive || timer <= dt) {
        projectile.hitTimers.delete(enemy);
      } else {
        projectile.hitTimers.set(enemy, timer - dt);
      }
    }

    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;
      if (projectile.hitTimers.has(enemy)) continue;
      if (!this.laserHitsEnemy(projectile, enemy)) continue;
      enemy.takeDamage(projectile.damage, projectile.dirX === 0 ? player.facing : Math.sign(projectile.dirX));
      projectile.hitTimers.set(enemy, projectile.tickInterval);
      player.addRage(2);
      this.stats.combo += 1;
      this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);
      const hit = rectCenter(enemy);
      this.effects.addHit(hit.x, hit.y, projectile.color, 6);
    }

    if (projectile.durationLeft <= 0) projectile.dead = true;
  }

  laserHitsEnemy(projectile, enemy) {
    const padding = projectile.width * 0.5;
    return projectile.segments.some((segment) => this.segmentHitsRect(segment, enemy.getHitbox(), padding));
  }

  segmentHitsRect(segment, rect, padding = 0) {
    const dx = segment.x2 - segment.x1;
    const dy = segment.y2 - segment.y1;
    const length = Math.hypot(dx, dy);
    if (length <= 0.0001) return false;
    const hit = this.raycastRect(
      { x: segment.x1, y: segment.y1 },
      { x: dx / length, y: dy / length },
      length,
      rect,
      padding
    );
    return !!hit && hit.distance <= length;
  }

  traceLaserPath(origin, direction, weapon, platforms, stage = null) {
    const segments = [];
    let start = { x: origin.x, y: origin.y };
    let dir = { x: direction.x, y: direction.y };
    let rangeLeft = weapon.range;
    let reflections = 0;

    while (rangeLeft > 1) {
      const hit = this.findLaserHit(start, dir, rangeLeft, platforms);
      if (!hit) {
        segments.push({
          x1: start.x,
          y1: start.y,
          x2: start.x + dir.x * rangeLeft,
          y2: start.y + dir.y * rangeLeft
        });
        break;
      }

      segments.push({
        x1: start.x,
        y1: start.y,
        x2: hit.x,
        y2: hit.y
      });

      rangeLeft -= hit.distance;
      if (hit.platform.type === "breakable" || hit.platform.type === "spawn") {
        stage?.handleProjectilePlatformHit?.({ owner: "player", kind: "laser" }, hit.platform);
        break;
      }

      if (reflections >= weapon.reflections) break;

      reflections += 1;
      dir = hit.normal.x !== 0
        ? { x: -dir.x, y: dir.y }
        : { x: dir.x, y: -dir.y };
      start = {
        x: hit.x + dir.x * 1.5,
        y: hit.y + dir.y * 1.5
      };
    }

    return { segments };
  }

  findLaserHit(origin, direction, maxDistance, platforms) {
    let nearestHit = null;
    for (const platform of platforms) {
      const hit = this.raycastRect(origin, direction, maxDistance, platform);
      if (!hit) continue;
      if (hit.distance < 0.001) continue;
      if (!nearestHit || hit.distance < nearestHit.distance) {
        nearestHit = { ...hit, platform };
      }
    }
    return nearestHit;
  }

  raycastRect(origin, direction, maxDistance, rect, padding = 0) {
    const minX = rect.x - padding;
    const maxX = rect.x + rect.width + padding;
    const minY = rect.y - padding;
    const maxY = rect.y + rect.height + padding;
    let tMin = 0;
    let tMax = maxDistance;
    let normal = { x: 0, y: 0 };
    const epsilon = 1e-6;

    const axes = [
      { origin: origin.x, dir: direction.x, min: minX, max: maxX, axis: "x" },
      { origin: origin.y, dir: direction.y, min: minY, max: maxY, axis: "y" }
    ];

    for (const axis of axes) {
      if (Math.abs(axis.dir) < epsilon) {
        if (axis.origin < axis.min || axis.origin > axis.max) return null;
        continue;
      }

      let near = (axis.min - axis.origin) / axis.dir;
      let far = (axis.max - axis.origin) / axis.dir;
      let axisNormal;

      if (near > far) {
        const swap = near;
        near = far;
        far = swap;
        axisNormal = axis.axis === "x" ? { x: 1, y: 0 } : { x: 0, y: 1 };
      } else {
        axisNormal = axis.axis === "x" ? { x: -1, y: 0 } : { x: 0, y: -1 };
      }

      if (near > tMin) {
        tMin = near;
        normal = axisNormal;
      }
      tMax = Math.min(tMax, far);
      if (tMin > tMax) return null;
    }

    const distance = Math.max(0, tMin);
    if (distance > maxDistance) return null;
    return {
      distance,
      normal,
      x: origin.x + direction.x * distance,
      y: origin.y + direction.y * distance
    };
  }

  resolveEnemyProjectile(player, projectile) {
    if (player.state === "parry" && this.withinGuardField(player, projectile, false)) {
      this.reflectProjectile(player, projectile, player.getParryElapsed() <= CONFIG.combat.parryPerfectWindow);
      return;
    }
    if (player.state === "shield" && this.withinGuardField(player, projectile, true)) {
      this.reflectProjectile(player, projectile, false);
      return;
    }

    const damaged = player.takeDamage(projectile.damage, Math.sign(projectile.vx));
    projectile.dead = true;
    if (damaged) {
      this.stats.damageTaken += 1;
      this.stats.combo = 0;
      this.effects.addMessage("受击", CONFIG.palette.noise, 0.55);
      this.effects.addHit(player.x + player.width / 2, player.y + player.height / 2, CONFIG.palette.noise, 8);
      this.effects.shake(5, 0.12);
    }
  }

  reflectProjectile(player, projectile, perfect) {
    projectile.owner = "player";
    projectile.vx = -projectile.vx * (perfect ? 1.35 : 1.12);
    projectile.vy *= perfect ? 0.2 : 0.45;
    projectile.x = projectile.vx > 0 ? player.x + player.width + 8 : player.x - projectile.width - 8;
    projectile.y = player.y + player.height / 2;
    projectile.damage = perfect ? 38 : 24;
    projectile.rangeLeft = 720;
    projectile.color = perfect ? CONFIG.palette.white : CONFIG.palette.echo;
    player.addRage(perfect ? CONFIG.combat.perfectParryRage : CONFIG.combat.shieldRangedRage);
    this.healOnParry(player, perfect);
    if (perfect) {
      this.audio?.playSfx("parry");
      this.vibratePerfectParry();
      this.stats.perfectParry += 1;
      if (projectile.sourceEnemy) {
        projectile.sourceEnemy.perfectParryCount = (projectile.sourceEnemy.perfectParryCount || 0) + 1;
      }
      this.effects.addMessage("完美回响：反射弹", CONFIG.palette.white, 0.85);
      this.effects.shake(9, 0.14);
    } else {
      this.audio?.playSfx("parry");
      this.stats.normalParry += 1;
      this.stats.shieldReflect += 1;
      this.effects.addMessage("举盾反射", CONFIG.palette.echo, 0.65);
      this.effects.shake(4, 0.08);
    }
    this.effects.addRing(player.x + player.width / 2, player.y + player.height / 2, projectile.color, perfect);
    this.effects.stop(perfect ? 0.06 : 0.025);
  }

  resolvePlayerAttack(player, enemies, stage = null) {
    const box = player.getAttackBox();
    if (!box.active) return;

    if (stage?.handlePlayerAttackHit?.(player, box)) {
      player.attackConsumed = true;
      this.effects.stop(player.isUltimate ? 0.032 : 0.02);
      return;
    }

    for (const enemy of enemies) {
      if (!enemy.isAlive || !intersects(box, enemy.getHitbox())) continue;
      const weapon = player.getWeapon();
      const damageScale = player.isUltimate ? CONFIG.player.ultimateDamageScale : 1;
      const damage = weapon.damage * damageScale;
      enemy.takeDamage(damage, player.facing);
      player.attackConsumed = true;
      player.addRage(CONFIG.combat.attackRage);
      this.stats.combo += 1;
      this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);

      const hit = rectCenter(enemy);
      this.effects.addHit(hit.x, hit.y, player.isUltimate ? CONFIG.palette.gold : CONFIG.palette.echo, player.isUltimate ? 18 : 10);
      this.effects.addRing(hit.x, hit.y, player.isUltimate ? CONFIG.palette.gold : CONFIG.palette.echo, false);
      this.effects.stop(player.isUltimate ? 0.045 : 0.025);
      return;
    }
  }

  resolveEnemyAttacks(player, enemies) {
    for (const enemy of enemies) {
      const box = enemy.getAttackBox();
      const bodyHit = intersects(box, player.getHitbox());
      const parryCatch = player.state === "parry" && player.parryTimer > 0 && this.withinGuardField(player, box, false);
      const shieldCatch = player.state === "shield" && this.withinGuardField(player, box, true);
      if (!enemy.isAlive || !box.active || (!bodyHit && !parryCatch && !shieldCatch)) continue;

      if (parryCatch) {
        if (player.getParryElapsed() <= CONFIG.combat.parryPerfectWindow) {
          this.perfectParry(player, enemy);
        } else {
          this.normalParry(player, enemy);
        }
      } else if (shieldCatch) {
        this.shieldMelee(player, enemy);
      } else {
        const damaged = player.takeDamage(enemy.getAttackDamage?.() ?? CONFIG.enemy.attackDamage, enemy.facing);
        enemy.attackResolved = true;
        if (damaged) {
          this.stats.damageTaken += 1;
          this.stats.combo = 0;
          this.effects.addMessage("受击", CONFIG.palette.noise, 0.55);
          this.effects.addHit(player.x + player.width / 2, player.y + player.height / 2, CONFIG.palette.noise, 8);
          this.effects.shake(5, 0.12);
        }
      }
    }
  }

  shieldMelee(player, enemy) {
    const reducedDamage = (enemy.getAttackDamage?.() ?? CONFIG.enemy.attackDamage) * CONFIG.combat.shieldMeleeDamageScale;
    const damaged = player.takeDamage(reducedDamage, enemy.facing);
    enemy.attackResolved = true;
    player.state = "shield";
    player.hurtTimer = 0;
    player.invulnTimer = Math.min(player.invulnTimer, 0.18);
    player.addRage(CONFIG.combat.normalParryRage);
    this.stats.normalParry += 1;
    this.stats.shieldBlock += 1;
    if (damaged) this.stats.damageTaken += 1;
    this.audio?.playSfx("parry");
    this.effects.addMessage("举盾减伤", CONFIG.palette.echo, 0.55);
    this.effects.addHit(player.x + player.width / 2, player.y + player.height / 2, CONFIG.palette.echo, 6);
    this.effects.shake(3, 0.08);
  }

  perfectParry(player, enemy) {
    enemy.stun();
    player.parryTimer = 0;
    player.state = "idle";
    player.quickParryOnly = false;
    player.addRage(CONFIG.combat.perfectParryRage);
    this.healOnParry(player, true);
    player.lastParryResult = "perfect";
    this.stats.perfectParry += 1;
    enemy.perfectParryCount = (enemy.perfectParryCount || 0) + 1;
    this.stats.combo += 2;
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);
    this.audio?.playSfx("parry");
    this.vibratePerfectParry();

    const hit = rectCenter(enemy);
    this.effects.addMessage("完美回响", CONFIG.palette.white, 0.92);
    this.effects.addRing(hit.x, hit.y, CONFIG.palette.white, true);
    this.effects.addHit(hit.x, hit.y, CONFIG.palette.white, 24);
    this.effects.shake(14, 0.18);
    this.effects.stop(0.085);
  }

  normalParry(player, enemy) {
    enemy.parried();
    player.parryTimer = 0;
    player.state = "idle";
    player.quickParryOnly = false;
    player.addRage(CONFIG.combat.normalParryRage);
    this.healOnParry(player, false);
    player.lastParryResult = "normal";
    this.stats.normalParry += 1;
    this.stats.combo += 1;
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);
    this.audio?.playSfx("parry");

    const hit = rectCenter(enemy);
    this.effects.addMessage("回响成功", CONFIG.palette.echo, 0.62);
    this.effects.addRing(hit.x, hit.y, CONFIG.palette.echo, false);
    this.effects.addHit(hit.x, hit.y, CONFIG.palette.echo, 12);
    this.effects.shake(6, 0.12);
    this.effects.stop(0.045);
  }
}
