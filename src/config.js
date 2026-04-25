const DEBUG = false;

const CONFIG = {
  world: {
    width: 4100,
    height: 820,
    gravity: 2800,
    floorDeathY: 1020
  },
  camera: {
    lerp: 0.12
  },
  player: {
    x: 120,
    y: 330,
    width: 30,
    height: 46,
    speed: 460,
    jumpForce: -820,
    maxHealth: 220,
    attackDamage: 28,
    parryHealRatio: 0.05,
    ultimateDamageScale: 2,
    ultimateSpeedScale: 1.22,
    ultimateHealRatio: 0.5,
    hurtInvuln: 0.84
  },
  enemy: {
    maxHealth: 95,
    speed: 128,
    detectRange: 460,
    attackRange: 70,
    attackDamage: 16,
    startupTime: 0.62,
    activeTime: 0.15,
    recoveryTime: 0.38,
    stunTime: 1.45,
    casterHealth: 70,
    casterRange: 560,
    casterKeepAway: 210,
    casterProjectileDamage: 13,
    casterProjectileSpeed: 360,
    ledgeProbe: 30,
    maxChaseHeightGap: 74
  },
  combat: {
    attackStartup: 0.08,
    attackActive: 0.13,
    attackRecovery: 0.17,
    attackBoxWidth: 58,
    attackBoxHeight: 34,
    parryPerfectWindow: 0.34,
    parryNormalWindow: 0.72,
    shieldHoldThreshold: 0.12,
    shieldMeleeDamageScale: 0.22,
    shieldRangedRage: 24,
    parryRecovery: 0.05,
    normalParryRage: 28,
    perfectParryRage: 44,
    attackRage: 6,
    hurtRage: -12,
    maxRage: 100,
    ultimateTime: 5,
    parryRadius: 46,
    shieldRadius: 58
  },
  weapons: [
    {
      id: "blade",
      name: "回响刃",
      shortName: "刃",
      type: "melee",
      damage: 34,
      startup: 0.045,
      active: 0.12,
      recovery: 0.10,
      boxWidth: 68,
      boxHeight: 38
    },
    {
      id: "rifle",
      name: "脉冲步枪",
      shortName: "步枪",
      type: "rifle",
      damage: 17,
      startup: 0.025,
      active: 0.04,
      recovery: 0.08,
      speed: 940,
      range: 760,
      pellets: 1
    },
    {
      id: "shotgun",
      name: "散射霰弹",
      shortName: "霰弹",
      type: "shotgun",
      damage: 12,
      startup: 0.055,
      active: 0.04,
      recovery: 0.24,
      speed: 760,
      range: 360,
      pellets: 6,
        spread: 0.24
      },
      {
        id: "laser",
        name: "实验级激光",
        shortName: "实验级激光",
        type: "laser",
        damage: 0,
        startup: 0.04,
        active: 0.08,
        recovery: 0.18,
        range: 1600,
        beamLife: 0.34,
        beamWidth: 10,
        reflections: 4,
        tickDamage: 9,
        tickInterval: 0.08
      }
    ],
  level: {
    id: "silent-corridor",
    title: "静默回廊",
    subtitle: "第一关",
    intro: "逐个清空封锁区域，继续向右推进。",
    playerStart: { x: 120, y: 474 },
    platforms: [
      { x: 0, y: 520, width: 260, height: 42, type: "standard" },
      { x: 320, y: 520, width: 920, height: 42, type: "standard" },
      { x: 392, y: 474, width: 52, height: 46, type: "standard" },
      { x: 444, y: 428, width: 52, height: 92, type: "standard" },
      { x: 496, y: 378, width: 52, height: 142, type: "standard" },
      { x: 820, y: 454, width: 164, height: 24, type: "standard" },
      { x: 1098, y: 314, width: 52, height: 206, type: "standard" },

      { x: 1260, y: 520, width: 220, height: 42, type: "standard" },
      { x: 1460, y: 452, width: 188, height: 24, type: "standard" },
      { x: 1660, y: 520, width: 560, height: 42, type: "standard" },
      { x: 1750, y: 404, width: 214, height: 24, type: "standard" },
      { x: 1912, y: 404, width: 52, height: 116, type: "standard" },
      { x: 2190, y: 240, width: 52, height: 280, type: "standard" },
      { x: 2260, y: 520, width: 180, height: 42, type: "standard" },

      { x: 2440, y: 520, width: 380, height: 42, type: "standard" },
      { x: 2660, y: 400, width: 52, height: 120, type: "standard" },
      { x: 2920, y: 520, width: 400, height: 42, type: "standard" },
      { x: 3000, y: 340, width: 320, height: 180, type: "standard" },
      { x: 3440, y: 520, width: 520, height: 42, type: "standard" },
      { x: 3460, y: 448, width: 210, height: 72, type: "standard" },
      { x: 3580, y: 320, width: 250, height: 36, type: "standard" },
      { x: 3520, y: 180, width: 440, height: 42, type: "standard" },
      { x: 3704, y: 222, width: 38, height: 98, type: "standard" }
    ],
    enemies: [],
    blocks: [
      { id: "r1-blue-a", roomId: "room-1", x: 1038, y: 472, width: 48, height: 48, type: "breakable" },
      { id: "r1-blue-b", roomId: "room-1", x: 1038, y: 424, width: 48, height: 48, type: "breakable" },
      { id: "r2-blue-a", roomId: "room-2", x: 1406, y: 472, width: 48, height: 48, type: "breakable" },
      {
        id: "r2-green-a",
        roomId: "room-2",
        x: 1864,
        y: 356,
        width: 48,
        height: 48,
        type: "spawn",
        required: true,
        spawnEnemies: [
          { x: 1706, y: 470, type: "striker" },
          { x: 1994, y: 470, type: "striker" },
          { x: 1808, y: 354, type: "caster" }
        ]
      },
      { id: "r3-blue-a", roomId: "room-3", x: 2870, y: 472, width: 48, height: 48, type: "breakable" }
    ],
    enemyGuards: [
      { x: 266, y: 484, width: 28, height: 36, tilt: -0.18 },
      { x: 1554, y: 484, width: 44, height: 36, tilt: 0.14 },
      { x: 2848, y: 484, width: 34, height: 36, tilt: -0.16 },
      { x: 3352, y: 484, width: 38, height: 36, tilt: 0.16 }
    ],
    rooms: [
      {
        id: "room-1",
        bounds: { x: 0, width: 1240 },
        respawn: { x: 120, y: 474 },
        barrierRight: { x: 1236, y: 32, width: 12, height: 680 },
        enemies: [
          { x: 332, y: 470, type: "striker" },
          { x: 560, y: 470, type: "striker" },
          { x: 726, y: 470, type: "caster" },
          { x: 848, y: 412, type: "striker" },
          { x: 932, y: 412, type: "caster" },
          { x: 1160, y: 470, type: "striker" }
        ]
      },
      {
        id: "room-2",
        bounds: { x: 1260, width: 1180 },
        respawn: { x: 1320, y: 474 },
        barrierLeft: { x: 1236, y: 32, width: 12, height: 680 },
        barrierRight: { x: 2436, y: 32, width: 12, height: 680 },
        enemies: [
          { x: 1342, y: 470, type: "striker" },
          { x: 1518, y: 410, type: "caster" },
          { x: 1758, y: 470, type: "striker" },
          { x: 2104, y: 470, type: "caster" }
        ]
      },
      {
        id: "room-3",
        bounds: { x: 2440, width: 1520 },
        respawn: { x: 2520, y: 474 },
        barrierLeft: { x: 2436, y: 32, width: 12, height: 680 },
        enemies: [
          { x: 2520, y: 470, type: "striker" },
          { x: 2680, y: 358, type: "caster" },
          { x: 3088, y: 290, type: "striker" },
          { x: 3218, y: 290, type: "striker" },
          { x: 3492, y: 398, type: "striker" },
          { x: 3662, y: 278, type: "caster" },
          { x: 3760, y: 138, type: "caster" }
        ]
      }
    ],
    exit: { x: 3888, y: 414, width: 62, height: 106 },
    ruleSigns: [
      {
        x: 74,
        y: 362,
        width: 376,
        height: 118,
        title: "规则一 / 第一关",
        lines: [
          "蓝色方块攻击一次即可破坏。",
          "绿色方块打碎后会消失并召来更多怪物。",
          "掉入虚空会回到当前区域起点。"
        ]
      },
      {
        x: 1506,
        y: 308,
        width: 316,
        height: 96,
        title: "封锁协议",
        lines: [
          "清空本区域怪物后，紫色结界才会解除。",
          "最终区域清完之前，出口不会开启。"
        ]
      }
    ],
    fissures: [
      { x: 262, y: 522, width: 58, height: 84 },
      { x: 1482, y: 522, width: 178, height: 86 },
      { x: 2218, y: 522, width: 44, height: 82 },
      { x: 2820, y: 522, width: 100, height: 86 },
      { x: 3320, y: 522, width: 120, height: 86 }
    ],
    farStructures: [
      { x: 120, y: 112, width: 110, height: 58, accent: "echo" },
      { x: 520, y: 86, width: 92, height: 52, accent: "echo" },
      { x: 980, y: 126, width: 138, height: 78, accent: "noise" },
      { x: 1530, y: 98, width: 118, height: 62, accent: "echo" },
      { x: 2080, y: 146, width: 116, height: 56, accent: "noise" },
      { x: 2790, y: 94, width: 166, height: 84, accent: "echo" },
      { x: 3360, y: 122, width: 144, height: 72, accent: "noise" }
    ],
    messages: {
      blockBreak: "蓝色方块已破坏。",
      spawnBlock: "召怪方块破裂，敌人出现了。",
      roomEnter: "紫色结界已启动。",
      roomClear: "区域结界已解除。",
      barrierBlocked: "还有怪物在本区域游荡，先清理干净。",
      exitBlocked: "最终区域清空后，出口才会开启。",
      voidFall: "坠入虚空，回到当前区域起点。"
    }
  },
  tutorialLevel: {
    intro: "教程：先理解节奏，再用回响回应它。",
    playerStart: { x: 120, y: 474 },
    platforms: [
      { x: 0, y: 520, width: 2000, height: 42, type: "standard" },
      { x: 500, y: 440, width: 30, height: 80, type: "standard" },
      { x: 1000, y: 340, width: 600, height: 42, type: "echo" }
    ],
    enemies: [
      { x: 650, y: 470, type: "striker" },
      { x: 950, y: 470, type: "striker", tutorialId: "master" },
      { x: 1300, y: 298, type: "caster", tutorialId: "master" }
    ],
    exit: { x: 1450, y: 234, width: 62, height: 106 },
    ruleSigns: [
      {
        x: 74,
        y: 380,
        width: 620,
        height: 130,
        title: "新手教程",
        lines: [
          "轻按回响：短时间进入回响判定。",
          "按住回响：举盾格挡，远程攻击可以反射。",
          "每次成功回响都会回复 5% 最大生命值。",
          "开启无双后不会被打出僵直。"
        ],
        sideTitle: "进阶提示",
        sideLines: [
          "切换武器体验不同节奏与攻击距离。",
          "利用上方平台练习二段跳和空中走位。"
        ],
        accent: "gold"
      }
    ]
  },
  palette: {
    void: "#050711",
    back: "#081326",
    grid: "rgba(112, 224, 255, 0.14)",
    echo: "#78f4ff",
    echoSoft: "rgba(120, 244, 255, 0.42)",
    player: "#cbfbff",
    noise: "#ff3d66",
    noiseDark: "#5f1230",
    gold: "#ffd56b",
    white: "#f8ffff",
    breakable: "#2d48ff",
    spawnBlock: "#22e95e",
    barrier: "#ff00ff",
    laser: "#9cff72"
  }
};
