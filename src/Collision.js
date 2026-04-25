function intersects(a, b) {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function approach(current, target, step) {
  if (current < target) return Math.min(current + step, target);
  if (current > target) return Math.max(current - step, target);
  return target;
}

function rectCenter(rect) {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2
  };
}

function moveAndCollide(entity, platforms, dt, world) {
  entity.x += entity.vx * dt;
  entity.x = clamp(entity.x, 0, world.width - entity.width);
  resolvePlatformAxis(entity, platforms, "x");

  entity.y += entity.vy * dt;
  entity.isGrounded = false;
  resolvePlatformAxis(entity, platforms, "y");
}

function resolvePlatformAxis(entity, platforms, axis) {
  for (const platform of platforms) {
    const hitbox = entity.getHitbox();
    if (!intersects(hitbox, platform)) continue;

    const offsetX = hitbox.x - entity.x;
    const offsetY = hitbox.y - entity.y;

    if (axis === "x") {
      if (entity.vx > 0) {
        entity.x = platform.x - offsetX - hitbox.width;
      } else if (entity.vx < 0) {
        entity.x = platform.x + platform.width - offsetX;
      }
      entity.vx = 0;
      continue;
    }

    if (entity.vy > 0) {
      entity.y = platform.y - offsetY - hitbox.height;
      entity.vy = 0;
      entity.isGrounded = true;
      if ("canDoubleJump" in entity) entity.canDoubleJump = true;
    } else if (entity.vy < 0) {
      entity.y = platform.y + platform.height - offsetY;
      entity.vy = 0;
    }
  }
}
