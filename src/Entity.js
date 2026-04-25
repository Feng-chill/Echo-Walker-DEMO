class Entity {
  constructor({ x, y, width, height, maxHealth = 100 }) {
    this.x = x;
    this.y = y;
    this.prevY = y;
    this.width = width;
    this.height = height;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.isAlive = true;
    this.isGrounded = false;
  }

  getHitbox() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  takeDamage(amount) {
    if (!this.isAlive) return;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.isAlive = false;
      this.state = "dead";
    }
  }
}
