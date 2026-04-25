下面是一份**适合直接交给 Codex / AI 编程助手看的完整开发文档**。
你可以直接复制到 Codex 里，让它按阶段生成代码、拆任务、修改文件。

---

# 《Echo Walker / 回响行者》开发文档

## 0. 项目定位

项目名称：

```text
Echo Walker
```

中文名：

```text
回响行者
```

一句话定位：

```text
一个 8MB 内可运行的轻量横版弹反动作互动作品。
```

核心玩法钩子：

```text
敌人的攻击不是威胁，而是你的武器。
```

核心体验闭环：

```text
观察敌人前摇
↓
精准弹反
↓
敌人破防
↓
怒气积攒
↓
开启无双
↓
强力反击
↓
通关结算
```

项目目标：

```text
做一个适合抖音 AI 创变者赛道一「互动空间」提交的 HTML5 / Canvas 横版动作 Demo。
```

---

# 1. 比赛与技术约束

## 1.1 提交环境

作品需要适配：

```text
HTML5 / Canvas / Web
```

最终提交形式：

```text
zip 压缩包
根目录必须包含 index.html
总包体积 ≤ 8MB
```

## 1.2 技术限制

必须尽量满足：

```text
1. 不依赖外部 CDN
2. 不做网络请求
3. 尽量纯离线运行
4. 资源本地化
5. 移动端可体验
6. 包体积控制在 8MB 内
```

## 1.3 推荐技术栈

第一版使用：

```text
原生 HTML
原生 CSS
原生 JavaScript
Canvas 2D API
```

暂时不要使用：

```text
大型游戏引擎
大型前端框架
大型图片资源
大型音频资源
视频素材
复杂构建工具
后端服务
```

原因：

```text
1. 控制包体积
2. 降低工程复杂度
3. 保证能直接运行
4. 适合互动空间提交
5. 更容易被 Codex 分阶段实现
```

---

# 2. 最小可行版本 MVP

## 2.1 MVP 必须包含

```text
1. 一个横版场景
2. 一个玩家角色
3. 左右移动
4. 跳跃
5. 重力与地面碰撞
6. 普通攻击
7. 一个近战敌人
8. 敌人会靠近玩家
9. 敌人攻击前有明显前摇
10. 玩家可以弹反
11. 完美弹反让敌人破防
12. 怒气条
13. 怒气满后开启无双
14. 击败敌人后通关
15. 通关结算页
```

## 2.2 第一版不要做

```text
1. 大地图
2. 多关卡
3. 复杂剧情
4. 多角色
5. 多武器
6. 技能树
7. Boss 战
8. 背包系统
9. 装备系统
10. 大量图片素材
11. 大量音频素材
12. 联机
13. 存档
```

## 2.3 第一版目标体验

玩家应该能在 30 秒到 1 分钟内体验到：

```text
移动
↓
遇敌
↓
看见敌人前摇
↓
按键弹反
↓
敌人破防
↓
怒气上涨
↓
开无双
↓
击败敌人
↓
看到结算评价
```

---

# 3. 项目目录结构

建议目录结构：

```text
echo-walker/
├── index.html
├── README.md
├── src/
│   ├── main.js
│   ├── config/
│   │   └── gameConfig.js
│   ├── core/
│   │   ├── Game.js
│   │   ├── Loop.js
│   │   ├── Input.js
│   │   ├── Camera.js
│   │   └── Collision.js
│   ├── entities/
│   │   ├── Entity.js
│   │   ├── Player.js
│   │   ├── Enemy.js
│   │   └── Projectile.js
│   ├── systems/
│   │   ├── CombatSystem.js
│   │   ├── ParrySystem.js
│   │   ├── RageSystem.js
│   │   ├── EffectSystem.js
│   │   └── StateMachine.js
│   ├── scenes/
│   │   ├── StartScene.js
│   │   ├── GameScene.js
│   │   └── ResultScene.js
│   ├── ui/
│   │   ├── HUD.js
│   │   └── ResultCard.js
│   └── utils/
│       ├── math.js
│       └── timer.js
├── assets/
│   ├── audio/
│   └── fonts/
└── styles/
    └── style.css
```

第一版如果想更简单，也可以先减少文件：

```text
echo-walker/
├── index.html
├── styles/
│   └── style.css
└── src/
    ├── main.js
    ├── Game.js
    ├── Player.js
    ├── Enemy.js
    ├── Input.js
    ├── Collision.js
    ├── CombatSystem.js
    ├── EffectSystem.js
    └── HUD.js
```

推荐先用第二种简单结构，等功能稳定后再拆成完整结构。

---

# 4. 模块职责说明

## 4.1 index.html

职责：

```text
1. 提供页面入口
2. 创建 canvas
3. 引入 CSS
4. 引入 main.js
```

基本结构：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Echo Walker</title>
  <link rel="stylesheet" href="./styles/style.css" />
</head>
<body>
  <canvas id="gameCanvas"></canvas>
  <script type="module" src="./src/main.js"></script>
</body>
</html>
```

---

## 4.2 style.css

职责：

```text
1. 页面全屏
2. 移除默认边距
3. 设置暗色背景
4. 让 canvas 居中或全屏
5. 适配移动端
```

设计方向：

```text
黑色 / 深蓝 / 深紫背景
高对比发光线条
现代 HUD
轻量 CSS 动效
```

---

## 4.3 main.js

职责：

```text
1. 获取 canvas
2. 初始化游戏对象
3. 启动游戏循环
```

逻辑：

```text
获取 canvas
↓
设置 canvas 尺寸
↓
创建 Game 实例
↓
game.start()
```

---

## 4.4 Game.js

职责：

```text
游戏总控制器
```

负责：

```text
1. 管理当前场景
2. 管理游戏状态
3. 调用 update
4. 调用 render
5. 处理开始、暂停、结束、重开
```

游戏状态：

```text
start
playing
paused
result
```

---

## 4.5 Loop.js

职责：

```text
封装 requestAnimationFrame 游戏循环
```

核心逻辑：

```text
上一帧时间
↓
当前帧时间
↓
计算 deltaTime
↓
update(deltaTime)
↓
render()
↓
requestAnimationFrame(nextFrame)
```

---

## 4.6 Input.js

职责：

```text
统一管理键盘 / 触摸输入
```

PC 端按键建议：

```text
A / ← ：向左移动
D / → ：向右移动
W / Space ：跳跃
J ：普通攻击
K ：闪避
L ：弹反
I ：开启无双
Enter ：开始 / 重开
```

移动端可以后续加入虚拟按钮：

```text
左按钮
右按钮
跳跃按钮
攻击按钮
弹反按钮
闪避按钮
无双按钮
```

第一版可以先做键盘输入。

---

## 4.7 Entity.js

职责：

```text
所有实体的基类
```

通用属性：

```text
x
y
width
height
vx
vy
health
maxHealth
facing
isAlive
```

通用方法：

```text
update(deltaTime)
render(ctx)
getHitbox()
takeDamage(amount)
```

---

## 4.8 Player.js

职责：

```text
玩家角色逻辑
```

玩家属性：

```text
x
y
vx
vy
width
height
speed
jumpForce
gravity
health
rage
isGrounded
canDoubleJump
facing
state
```

玩家状态：

```text
idle
run
jump
fall
attack
parry
dodge
hurt
stunned
ultimate
dead
```

玩家能力：

```text
移动
跳跃
二段跳
普通攻击
弹反
闪避
受击
怒气增长
开启无双
```

---

## 4.9 Enemy.js

职责：

```text
敌人逻辑
```

第一版只做近战敌人。

敌人属性：

```text
x
y
vx
vy
width
height
health
speed
attackRange
detectRange
state
attackTimer
stunTimer
```

敌人状态：

```text
idle
chase
attack_startup
attack_active
attack_recovery
stunned
dead
```

敌人行为：

```text
待机
发现玩家
靠近玩家
攻击前摇
攻击判定
攻击后摇
被弹反破防
死亡
```

---

## 4.10 Collision.js

职责：

```text
碰撞检测工具
```

负责：

```text
1. AABB 矩形碰撞
2. 地面碰撞
3. 攻击判定碰撞
4. 玩家与敌人碰撞
```

AABB 逻辑：

```text
两个矩形在 x 轴重叠
并且
两个矩形在 y 轴重叠
则发生碰撞
```

---

## 4.11 CombatSystem.js

职责：

```text
统一处理战斗判定
```

负责：

```text
1. 玩家攻击敌人
2. 敌人攻击玩家
3. 攻击命中判定
4. 伤害计算
5. 击退
6. 僵直
7. 死亡检测
```

---

## 4.12 ParrySystem.js

职责：

```text
处理弹反和完美弹反逻辑
```

弹反分为：

```text
普通弹反
完美弹反
失败弹反
```

规则建议：

```text
玩家按下弹反键后，进入 parry 状态
parry 状态持续 300ms
前 120ms 是完美弹反窗口
后 180ms 是普通弹反窗口
如果敌人攻击在完美窗口命中，则触发完美弹反
如果敌人攻击在普通窗口命中，则触发普通弹反
如果没有挡到攻击，则弹反失败，进入短后摇
```

弹反结果：

```text
普通弹反：
- 玩家不受伤
- 敌人轻微后退
- 玩家获得少量怒气

完美弹反：
- 玩家不受伤
- 敌人破防
- 敌人进入 stunned 状态
- 玩家获得大量怒气
- 触发震屏、闪光、冲击波
```

---

## 4.13 RageSystem.js

职责：

```text
处理怒气系统
```

怒气规则：

```text
普通攻击命中：+8
普通弹反成功：+15
完美弹反成功：+35
完美闪避成功：+10
受到伤害：+5
```

怒气上限：

```text
100
```

无双规则：

```text
怒气达到 100 后可以开启无双
开启后怒气清空或持续消耗
无双持续 5 秒
无双期间玩家伤害提升
攻击反馈增强
移动速度略微提升
攻击后摇减少
```

第一版建议：

```text
怒气满后按 I 开启无双
持续 5 秒
期间玩家攻击伤害 × 2
敌人受击粒子增加
屏幕边缘发光
```

---

## 4.14 EffectSystem.js

职责：

```text
管理视觉反馈
```

第一版需要的效果：

```text
1. 攻击命中火花
2. 完美弹反冲击波
3. 敌人破防闪光
4. 轻微震屏
5. 无双状态残影
6. 怒气满 HUD 闪烁
7. 通关结算动画
```

注意：

```text
所有特效尽量用 Canvas 绘制，不依赖图片。
```

---

## 4.15 HUD.js

职责：

```text
绘制游戏 UI
```

HUD 包含：

```text
玩家血条
怒气条
当前状态提示
操作提示
敌人血条
无双状态倒计时
```

HUD 风格：

```text
简洁
高对比
发光边缘
不要遮挡战斗区域
```

---

## 4.16 ResultCard.js

职责：

```text
绘制通关结算页
```

结算内容：

```text
通关时间
受到伤害次数
完美弹反次数
最大连击数
评级
称号
```

评级示例：

```text
S：Echo Master
A：Parry Hunter
B：Rage Walker
C：Survivor
```

中文称号示例：

```text
S：回响大师
A：弹反猎手
B：怒气行者
C：幸存者
```

---

# 5. 游戏核心数据结构

## 5.1 玩家数据

```js
const player = {
  x: 100,
  y: 300,
  width: 32,
  height: 48,
  vx: 0,
  vy: 0,
  speed: 260,
  jumpForce: -520,
  gravity: 1600,
  health: 100,
  maxHealth: 100,
  rage: 0,
  maxRage: 100,
  facing: 1,
  isGrounded: false,
  canDoubleJump: true,
  state: "idle",
  isUltimate: false,
  ultimateTimer: 0
};
```

---

## 5.2 敌人数据

```js
const enemy = {
  x: 500,
  y: 300,
  width: 36,
  height: 52,
  vx: 0,
  vy: 0,
  speed: 120,
  health: 100,
  maxHealth: 100,
  facing: -1,
  detectRange: 280,
  attackRange: 60,
  state: "idle",
  attackTimer: 0,
  stunTimer: 0,
  isAlive: true
};
```

---

## 5.3 攻击判定数据

```js
const attackBox = {
  x: 0,
  y: 0,
  width: 50,
  height: 32,
  damage: 20,
  knockback: 180,
  owner: "player",
  active: false
};
```

---

## 5.4 关卡数据

```js
const level = {
  width: 1200,
  height: 600,
  groundY: 500,
  platforms: [
    { x: 0, y: 500, width: 1200, height: 60 },
    { x: 300, y: 400, width: 160, height: 20 }
  ],
  enemies: [
    { type: "melee", x: 600, y: 448 }
  ]
};
```

---

# 6. 游戏状态机设计

## 6.1 玩家状态机

```text
idle
├─ 按左右 → run
├─ 按跳跃 → jump
├─ 按攻击 → attack
├─ 按弹反 → parry
├─ 按闪避 → dodge
└─ 受击 → hurt

run
├─ 松开方向 → idle
├─ 按跳跃 → jump
├─ 按攻击 → attack
├─ 按弹反 → parry
└─ 受击 → hurt

jump
├─ 下落 → fall
├─ 按攻击 → attack
├─ 按弹反 → parry
└─ 落地 → idle

attack
├─ 攻击结束 → idle / run / fall
└─ 受击 → hurt

parry
├─ 成功 → parry_success
├─ 完美成功 → perfect_parry
├─ 失败 → parry_recovery
└─ 结束 → idle

dodge
├─ 完美闪避 → dodge_success
└─ 结束 → idle

hurt
├─ 僵直结束 → idle
└─ 血量 <= 0 → dead
```

---

## 6.2 敌人状态机

```text
idle
├─ 玩家进入检测范围 → chase
└─ 死亡 → dead

chase
├─ 玩家进入攻击范围 → attack_startup
├─ 玩家离开检测范围 → idle
└─ 死亡 → dead

attack_startup
├─ 前摇结束 → attack_active
├─ 被完美弹反 → stunned
└─ 死亡 → dead

attack_active
├─ 命中 / 持续时间结束 → attack_recovery
├─ 被弹反 → stunned
└─ 死亡 → dead

attack_recovery
├─ 后摇结束 → chase / idle
└─ 死亡 → dead

stunned
├─ 破防时间结束 → chase
├─ 被处决 / 血量归零 → dead

dead
└─ 播放死亡效果，移除或停止更新
```

---

# 7. 关键机制规则

## 7.1 移动规则

玩家移动：

```text
按左键：
vx = -speed
facing = -1

按右键：
vx = speed
facing = 1

没有方向输入：
vx 逐渐趋近于 0
```

重力：

```text
vy += gravity * deltaTime
y += vy * deltaTime
```

落地：

```text
如果玩家底部 >= 地面高度：
y = groundY - player.height
vy = 0
isGrounded = true
canDoubleJump = true
```

---

## 7.2 跳跃规则

```text
如果在地面：
  执行普通跳跃
  vy = jumpForce

如果不在地面，并且 canDoubleJump = true：
  执行二段跳
  vy = jumpForce * 0.9
  canDoubleJump = false
```

---

## 7.3 普通攻击规则

```text
玩家按攻击键
↓
进入 attack 状态
↓
前摇 100ms
↓
攻击判定 active 120ms
↓
后摇 180ms
↓
回到正常状态
```

攻击判定位置：

```text
如果 facing = 1：
attackBox.x = player.x + player.width

如果 facing = -1：
attackBox.x = player.x - attackBox.width
```

---

## 7.4 敌人攻击规则

敌人攻击分三段：

```text
attack_startup：攻击前摇，给玩家观察和反应时间
attack_active：真正有伤害判定的时间
attack_recovery：攻击后摇，敌人短暂不能行动
```

建议时间：

```text
前摇：600ms
攻击有效：160ms
后摇：500ms
```

敌人攻击前摇必须明显：

```text
身体变红
出现攻击提示线
武器 / 手臂后拉
地面出现危险提示
```

---

## 7.5 弹反规则

玩家按下弹反键后：

```text
parryTimer = 0
state = "parry"
```

弹反窗口：

```text
0ms - 120ms：完美弹反窗口
120ms - 300ms：普通弹反窗口
300ms 后：弹反失败并进入短后摇
```

当敌人攻击判定碰到玩家时：

```text
如果玩家处于 parry 状态：
  如果 parryTimer <= 120ms：
    触发完美弹反
  否则如果 parryTimer <= 300ms：
    触发普通弹反
  否则：
    玩家受伤
否则：
  玩家受伤
```

---

## 7.6 完美弹反结果

完美弹反时：

```text
1. 玩家不受伤
2. 敌人进入 stunned 状态
3. 敌人停止攻击
4. 玩家怒气 +35
5. 屏幕震动
6. 生成冲击波
7. 播放高亮闪光
8. 短暂停顿 hit stop
```

建议参数：

```text
敌人破防时间：1200ms
震屏时间：150ms
hit stop：80ms
冲击波半径：从 10 扩散到 80
```

---

## 7.7 普通弹反结果

普通弹反时：

```text
1. 玩家不受伤
2. 敌人攻击被挡住
3. 敌人轻微后退
4. 玩家怒气 +15
5. 小型火花效果
```

---

## 7.8 怒气规则

怒气来源：

```text
普通攻击命中：+8
普通弹反：+15
完美弹反：+35
玩家受击：+5
```

怒气最大值：

```text
100
```

怒气满时：

```text
HUD 发光
提示 Press I / 点击无双按钮
```

---

## 7.9 无双规则

开启条件：

```text
rage >= 100
```

开启后：

```text
isUltimate = true
ultimateTimer = 5
rage = 0
```

无双期间：

```text
玩家攻击伤害 × 2
玩家移动速度 × 1.15
攻击后摇减少 30%
敌人受击粒子增强
玩家有残影
HUD 边缘发光
```

无双结束：

```text
isUltimate = false
ultimateTimer = 0
恢复普通参数
```

---

## 7.10 通关规则

第一版通关条件：

```text
击败场景中所有敌人
```

通关后：

```text
进入 ResultScene
显示结算卡
```

结算数据：

```text
timeUsed
damageTakenCount
perfectParryCount
normalParryCount
maxCombo
rank
title
```

---

# 8. 阶段开发路线

## Phase 1：项目骨架

目标：

```text
让项目可以打开，并显示 canvas。
```

任务：

```text
1. 创建 index.html
2. 创建 style.css
3. 创建 src/main.js
4. 获取 canvas
5. 设置 canvas 自适应屏幕
6. 绘制基础背景
```

验收标准：

```text
打开 index.html 后，页面全屏显示深色背景。
```

---

## Phase 2：游戏循环

目标：

```text
建立 update / render 循环。
```

任务：

```text
1. 使用 requestAnimationFrame
2. 计算 deltaTime
3. 每帧清屏
4. 每帧绘制背景
5. 显示 FPS 或调试信息
```

验收标准：

```text
页面稳定刷新，能看到 FPS 或动态元素。
```

---

## Phase 3：玩家移动

目标：

```text
玩家可以左右移动、跳跃、受重力影响。
```

任务：

```text
1. 创建 Player 类
2. 创建 Input 类
3. 监听键盘输入
4. 实现左右移动
5. 实现重力
6. 实现地面碰撞
7. 实现跳跃
8. 实现二段跳
```

验收标准：

```text
玩家可以左右移动、跳跃、二段跳，并能落回地面。
```

---

## Phase 4：基础场景和摄像机

目标：

```text
建立横版空间感。
```

任务：

```text
1. 创建地面
2. 创建简单平台
3. 实现基础碰撞
4. 实现 Camera 跟随玩家
5. 绘制远景背景线条
```

验收标准：

```text
玩家可以在横版场景中移动，镜头能跟随玩家。
```

---

## Phase 5：玩家普通攻击

目标：

```text
玩家可以进行普通攻击。
```

任务：

```text
1. 添加攻击按键
2. 添加 attack 状态
3. 添加攻击前摇、有效帧、后摇
4. 显示攻击判定框或攻击特效
5. 根据 facing 决定攻击方向
```

验收标准：

```text
按 J 后，玩家朝面向方向攻击，并有可见攻击效果。
```

---

## Phase 6：敌人实体

目标：

```text
场景中出现一个可被攻击的敌人。
```

任务：

```text
1. 创建 Enemy 类
2. 绘制敌人
3. 添加敌人血量
4. 添加敌人受击
5. 添加敌人死亡
```

验收标准：

```text
玩家攻击命中敌人后，敌人掉血，血量归零后死亡。
```

---

## Phase 7：近战敌人 AI

目标：

```text
敌人可以发现、靠近、攻击玩家。
```

任务：

```text
1. 添加敌人状态机
2. idle 状态
3. chase 状态
4. attack_startup 状态
5. attack_active 状态
6. attack_recovery 状态
7. 攻击冷却
```

验收标准：

```text
玩家靠近后，敌人会追击玩家，并在距离足够近时攻击。
```

---

## Phase 8：玩家受击系统

目标：

```text
敌人可以伤害玩家。
```

任务：

```text
1. 添加玩家血量
2. 敌人攻击判定碰撞玩家
3. 玩家受伤
4. 玩家击退
5. 玩家短暂僵直
6. 血条显示
```

验收标准：

```text
敌人攻击命中玩家后，玩家扣血并被击退。
```

---

## Phase 9：弹反系统

目标：

```text
玩家可以使用弹反防住敌人攻击。
```

任务：

```text
1. 添加弹反按键 L
2. 添加 parry 状态
3. 添加弹反计时器
4. 添加普通弹反窗口
5. 添加完美弹反窗口
6. 敌人攻击命中时判断玩家是否处于弹反窗口
```

验收标准：

```text
玩家按 L 后，如果敌人攻击命中玩家，玩家可以成功格挡。
```

---

## Phase 10：完美弹反和破防

目标：

```text
完美弹反成为核心爽点。
```

任务：

```text
1. 判断完美弹反时间窗口
2. 完美弹反让敌人进入 stunned
3. 敌人停止当前攻击
4. 玩家获得大量怒气
5. 添加冲击波
6. 添加震屏
7. 添加 hit stop
```

验收标准：

```text
玩家精准弹反敌人攻击时，敌人破防，画面有强反馈。
```

---

## Phase 11：怒气系统

目标：

```text
玩家可以积攒怒气。
```

任务：

```text
1. 添加 rage 数据
2. 普通攻击命中增加怒气
3. 普通弹反增加怒气
4. 完美弹反增加大量怒气
5. HUD 显示怒气条
6. 怒气满后显示提示
```

验收标准：

```text
玩家战斗行为会让怒气条上涨，满后有明显提示。
```

---

## Phase 12：无双系统

目标：

```text
怒气满后可以开启爆发状态。
```

任务：

```text
1. 添加无双按键 I
2. 判断 rage >= 100
3. 开启无双状态
4. 无双持续 5 秒
5. 攻击伤害增加
6. 移动速度略增
7. 特效增强
8. 无双结束后恢复普通状态
```

验收标准：

```text
怒气满后按 I，玩家进入无双状态，战斗反馈明显增强。
```

---

## Phase 13：短关卡闭环

目标：

```text
完成一个可以通关的短 Demo。
```

任务：

```text
1. 设计一个短场景
2. 放置 1 到 3 个敌人
3. 玩家击败所有敌人后通关
4. 切换到结算页
```

验收标准：

```text
玩家可以从开始进入战斗，击败敌人，看到通关结果。
```

---

## Phase 14：结算评级卡

目标：

```text
让作品有分享点。
```

任务：

```text
1. 记录通关时间
2. 记录完美弹反次数
3. 记录受击次数
4. 计算评级
5. 显示称号
6. 显示重开按钮
```

验收标准：

```text
通关后出现结算卡，玩家能看到自己的表现评价。
```

---

## Phase 15：视觉反馈强化

目标：

```text
让作品适合录屏和抖音展示。
```

任务：

```text
1. 攻击命中火花
2. 完美弹反冲击波
3. 震屏
4. 慢动作 / hit stop
5. 无双残影
6. HUD 发光
7. 敌人前摇红色警示
8. 通关结算动画
```

验收标准：

```text
弹反、破防、无双、通关时有明显视觉爆点。
```

---

# 9. 渲染风格规范

## 9.1 总体风格

```text
极简几何风
暗色背景
高对比发光边缘
程序生成粒子
少量 UI 动效
```

## 9.2 玩家视觉

玩家可以先用几何形状表示：

```text
主体：小矩形 / 方块人
头部：小圆形
边缘：青色发光描边
无双状态：外圈能量光环
```

颜色建议：

```text
普通状态：青蓝色
弹反状态：白蓝色
无双状态：金色 / 紫色能量边缘
受击状态：红色闪烁
```

---

## 9.3 敌人视觉

近战敌人：

```text
主体：红色 / 暗红色几何体
攻击前摇：身体变亮、红色提示线
攻击有效：红色冲击区域
破防：白色闪烁 + 裂纹线条
死亡：粒子爆散
```

---

## 9.4 背景视觉

背景建议：

```text
深色渐变
远处网格线
少量粒子
简单平台
地面发光边缘
```

不要使用大型图片。

---

## 9.5 HUD 视觉

HUD 包含：

```text
左上角血条
下方怒气条
右上角操作提示
中间短提示文本
```

提示文本示例：

```text
PERFECT PARRY
RAGE FULL
ULTIMATE
ENEMY BROKEN
STAGE CLEAR
```

---

# 10. 操作设计

## 10.1 PC 键盘

```text
A / ←：左移
D / →：右移
W / Space：跳跃
J：普通攻击
K：闪避，第一版可选
L：弹反
I：无双
Enter：开始 / 重开
```

## 10.2 移动端，后续版本

屏幕左侧：

```text
左
右
```

屏幕右侧：

```text
跳跃
攻击
弹反
无双
```

第一版优先键盘。

如果比赛平台主要是手机体验，后期必须加入虚拟按钮。

---

# 11. 代码规范

## 11.1 基本原则

```text
1. 不要把所有代码写进 main.js
2. 每个模块只负责一类事情
3. 命名要清楚
4. 优先可读性，不追求炫技
5. 每个阶段完成后保证能运行
6. 不要一次性实现所有功能
```

## 11.2 命名规范

类名：

```text
Player
Enemy
Game
Input
CombatSystem
EffectSystem
```

变量名：

```text
player
enemy
deltaTime
attackBox
parryTimer
rageValue
```

状态名：

```text
idle
run
jump
fall
attack
parry
hurt
stunned
dead
```

## 11.3 文件规范

```text
一个文件一个主要职责
不要循环依赖
工具函数放 utils
配置参数放 config
核心循环放 core
实体逻辑放 entities
战斗逻辑放 systems
UI 绘制放 ui
```

---

# 12. 性能要求

## 12.1 运行目标

```text
移动端尽量 30 FPS 以上
PC 端尽量 60 FPS
```

## 12.2 优化原则

```text
1. 不使用大量图片
2. 不生成过多粒子
3. 粒子有生命周期，结束后删除
4. 避免每帧创建大量临时对象
5. 不做复杂物理模拟
6. 不使用大型依赖
```

## 12.3 包体积控制

```text
index.html
CSS
JS
少量音效
少量字体，可选
```

目标：

```text
zip 包体积控制在 2MB - 5MB 内
```

---

# 13. 调试工具

第一版可以加入 debug 模式。

debug 内容：

```text
1. 显示 FPS
2. 显示玩家状态
3. 显示敌人状态
4. 显示 hitbox
5. 显示 parryTimer
6. 显示 rage
```

开启方式：

```js
const DEBUG = true;
```

调试完成后可以关闭：

```js
const DEBUG = false;
```

---

# 14. Codex 开发指令建议

给 Codex 的工作方式：

```text
请不要一次性实现完整游戏。
请严格按照 Phase 分阶段实现。
每完成一个 Phase，都要保证项目可以运行。
每次只修改必要文件。
每个模块都要保持职责清晰。
不要引入外部 CDN。
不要引入大型依赖。
不要使用图片素材，优先用 Canvas 绘制几何图形。
```

---

# 15. 推荐给 Codex 的第一条 Prompt

可以这样发给 Codex：

```text
你现在是这个 HTML5 Canvas 小游戏项目的开发助手。

请阅读下面的开发文档，但不要一次性实现完整项目。

请先完成 Phase 1 和 Phase 2：

Phase 1：项目骨架
- 创建 index.html
- 创建 styles/style.css
- 创建 src/main.js
- 页面全屏
- 创建 canvas
- 设置 canvas 自适应窗口
- 绘制深色背景

Phase 2：游戏循环
- 使用 requestAnimationFrame
- 计算 deltaTime
- 每帧清屏并重绘
- 显示简单 FPS 或动态测试元素

要求：
1. 使用原生 HTML / CSS / JavaScript
2. 不使用外部 CDN
3. 不使用框架
4. 保持文件结构清晰
5. 给出完整代码
6. 每个文件都要标明路径
7. 代码必须能直接运行
```

---

# 16. 后续阶段给 Codex 的拆分 Prompt

## Prompt：实现玩家移动

```text
请基于当前项目继续实现 Phase 3：玩家移动。

目标：
- 创建 Player 类
- 创建 Input 类
- 支持 A/D 或 左右方向键移动
- 支持 W / Space 跳跃
- 实现重力
- 实现地面碰撞
- 实现二段跳
- 在 canvas 中绘制玩家几何角色

要求：
1. 不要重写整个项目
2. 只新增或修改必要文件
3. 保持模块清晰
4. 玩家参数放在清晰的位置
5. 保证项目运行后可以控制玩家移动和跳跃
```

---

## Prompt：实现敌人 AI

```text
请基于当前项目继续实现近战敌人 AI。

目标：
- 创建 Enemy 类
- 敌人有 idle / chase / attack_startup / attack_active / attack_recovery / stunned / dead 状态
- 玩家进入检测范围后，敌人追击玩家
- 玩家进入攻击范围后，敌人进入攻击前摇
- 攻击前摇要有明显红色提示
- 攻击 active 阶段才造成伤害
- 攻击结束进入 recovery
- recovery 结束后继续追击或待机

要求：
1. 敌人先用几何形状绘制
2. 不要引入图片
3. 状态机逻辑要清晰
4. 可以在 debug 模式显示敌人当前状态
```

---

## Prompt：实现弹反系统

```text
请基于当前项目继续实现弹反系统。

目标：
- 玩家按 L 进入 parry 状态
- parry 状态持续 300ms
- 前 120ms 为 perfect parry 窗口
- 120ms 到 300ms 为 normal parry 窗口
- 如果敌人攻击 active 阶段命中玩家，同时玩家处于 parry 状态，则判断弹反类型
- 完美弹反让敌人进入 stunned 状态
- 普通弹反只挡住伤害并击退敌人
- 完美弹反触发冲击波、震屏、怒气增加

要求：
1. 弹反逻辑尽量放在 ParrySystem 或 CombatSystem 中
2. 不要让 Player 类变得过于臃肿
3. 加入明显视觉反馈
4. 保证普通受击逻辑仍然有效
```

---

## Prompt：实现怒气和无双

```text
请基于当前项目继续实现 Rage / Ultimate 系统。

目标：
- 玩家拥有 rage，最大 100
- 普通攻击命中增加怒气
- 普通弹反增加怒气
- 完美弹反增加大量怒气
- HUD 显示怒气条
- 怒气满后按 I 开启无双
- 无双持续 5 秒
- 无双期间攻击伤害翻倍
- 无双期间玩家有残影或发光特效
- 无双结束后恢复普通状态

要求：
1. 保持逻辑清晰
2. 不要引入外部资源
3. 用 Canvas 绘制 HUD
4. 参数要方便调整
```

---

## Prompt：实现结算页

```text
请基于当前项目继续实现 ResultScene。

目标：
- 击败所有敌人后进入结算页
- 统计通关时间
- 统计完美弹反次数
- 统计受击次数
- 统计最大连击
- 根据表现给出评级
- 显示称号
- 支持按 Enter 重新开始

评级建议：
S：Echo Master / 回响大师
A：Parry Hunter / 弹反猎手
B：Rage Walker / 怒气行者
C：Survivor / 幸存者

要求：
1. 结算页要适合截图分享
2. 视觉风格保持暗色、高对比、发光边缘
3. 不要使用图片素材
```

---

# 17. 最终验收标准

项目完成后，应该满足：

```text
1. 双击或打开 index.html 可以运行
2. 没有外部网络依赖
3. zip 包体积小于 8MB
4. 玩家可以移动、跳跃、攻击
5. 敌人可以追击和攻击
6. 玩家可以弹反
7. 完美弹反有明显反馈
8. 怒气可以积攒
9. 怒气满后可以开无双
10. 击败敌人后出现结算页
11. 画面适合录屏展示
12. 代码结构清晰，方便继续迭代
```

---

# 18. 核心开发优先级

开发优先级从高到低：

```text
第一优先级：
玩法闭环

第二优先级：
弹反反馈

第三优先级：
怒气和无双

第四优先级：
结算分享

第五优先级：
视觉强化

第六优先级：
移动端适配
```

不要本末倒置。

先完成：

```text
能玩
```

再完成：

```text
好玩
```

最后完成：

```text
好看
```

---

# 19. 项目一句话提醒

```text
Echo Walker 不是大型动作游戏，而是一个轻量互动作品。
它的成功不在于内容多，而在于 30 秒内让玩家体验到一次漂亮的完美弹反。
```

---

# 20. 给 Codex 的总要求

```text
请严格按阶段实现，不要一次性生成完整大型项目。

每次开发时请遵守：

1. 当前阶段目标优先
2. 不引入不必要依赖
3. 不使用外部 CDN
4. 不做网络请求
5. 不使用大型素材
6. 保持 Canvas 几何绘制风格
7. 代码模块清晰
8. 每阶段结束都能运行
9. 所有参数尽量可配置
10. 优先完成玩法闭环，而不是堆视觉效果
```

---

这份文档可以直接作为：

```text
Codex 项目说明文档
比赛项目开发说明
新线程启动提示词
团队协作需求文档
README 草稿
```

最推荐你下一步让 Codex 只做：

```text
Phase 1 + Phase 2
```

不要一上来让它做完整游戏。
这个项目必须一层一层搭，不然很容易变成一大坨不可维护代码。

