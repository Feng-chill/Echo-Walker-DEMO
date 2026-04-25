class EffectSystem {
  constructor() {
    this.particles = [];
    this.rings = [];
    this.messages = [];
    this.shakeTimer = 0;
    this.shakePower = 0;
    this.hitStop = 0;
  }

  reset() {
    this.particles = [];
    this.rings = [];
    this.messages = [];
    this.shakeTimer = 0;
    this.shakePower = 0;
    this.hitStop = 0;
  }

  update(dt) {
    if (this.hitStop > 0) this.hitStop = Math.max(0, this.hitStop - dt);
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);

    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 280 * dt;
      particle.life -= dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);

    for (const ring of this.rings) {
      ring.radius += ring.speed * dt;
      ring.life -= dt;
    }
    this.rings = this.rings.filter((ring) => ring.life > 0);

    for (const message of this.messages) {
      message.y -= 18 * dt;
      message.life -= dt;
    }
    this.messages = this.messages.filter((message) => message.life > 0);
  }

  addHit(x, y, color = CONFIG.palette.echo, count = 10) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 170;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        color,
        life: 0.28 + Math.random() * 0.22
      });
    }
  }

  addRing(x, y, color = CONFIG.palette.echo, strong = false) {
    this.rings.push({
      x,
      y,
      radius: strong ? 8 : 5,
      speed: strong ? 360 : 230,
      color,
      life: strong ? 0.38 : 0.26,
      maxLife: strong ? 0.38 : 0.26,
      width: strong ? 5 : 3
    });
  }

  addMessage(text, color = CONFIG.palette.echo, duration = 0.9) {
    this.messages.unshift({
      text,
      color,
      life: duration,
      maxLife: duration,
      y: 0
    });
    this.messages = this.messages.slice(0, 3);
  }

  shake(power = 6, duration = 0.16) {
    this.shakePower = power;
    this.shakeTimer = duration;
  }

  stop(duration = 0.06) {
    this.hitStop = Math.max(this.hitStop, duration);
  }

  getShakeOffset() {
    if (this.shakeTimer <= 0) return { x: 0, y: 0 };
    const scale = this.shakeTimer * this.shakePower;
    return {
      x: (Math.random() - 0.5) * scale * 2,
      y: (Math.random() - 0.5) * scale * 2
    };
  }

  renderWorld(ctx) {
    for (const ring of this.rings) {
      const alpha = Math.max(0, ring.life / ring.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.width;
      ctx.shadowBlur = 18;
      ctx.shadowColor = ring.color;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const particle of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, particle.life * 2.5);
      ctx.fillStyle = particle.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = particle.color;
      ctx.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size);
      ctx.restore();
    }
  }

  renderScreen(ctx, width) {
    const baseY = 92;
    this.messages.forEach((message, index) => {
      const alpha = Math.min(1, message.life / 0.22, message.life / message.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = message.color;
      ctx.shadowBlur = 22;
      ctx.shadowColor = message.color;
      ctx.font = index === 0 ? "700 30px Lucida Console, monospace" : "700 16px Lucida Console, monospace";
      ctx.textAlign = "center";
      ctx.fillText(message.text, width / 2, baseY + message.y + index * 28);
      ctx.restore();
    });
  }
}
