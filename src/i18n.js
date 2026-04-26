class I18nManager {
  constructor() {
    this.locale = "zh";
    this.resources = {
      zh: {
        tutorial: {
          task1: "切换一次武器",
          task2: "回响能量满时开启无双",
          task3: "完成一次二段跳",
          task4: "完成一次举盾格挡",
          task5: "完成一次举盾反射"
        },
        controls: {
          pcHint: "A/D 移动  W/K 跳跃  J 攻击  轻按L回响/按住L举盾  P切换武器  空格开启无双",
          mobileHint: "",
          ultimateReady: "无双已就绪（开启时回复50%生命）"
        }
      },
      en: {
        tutorial: {
          task1: "Switch Weapon",
          task2: "Activate Ultimate when Echo is full",
          task3: "Perform Double Jump",
          task4: "Perform a Shield Block",
          task5: "Perform a Shield Reflect"
        },
        controls: {
          pcHint: "A/D Move  W/K Jump  J Attack  Tap L Parry/Hold L Shield  P Switch  Space Ultimate",
          mobileHint: "",
          ultimateReady: "Ultimate Ready (Heals 50%)"
        }
      }
    };
  }

  setLocale(lang) {
    if (this.resources[lang]) {
      this.locale = lang;
    }
  }

  get(keyPath) {
    const keys = keyPath.split(".");
    let current = this.resources[this.locale];
    for (const key of keys) {
      if (current[key] === undefined) return keyPath;
      current = current[key];
    }
    return current;
  }
}

const I18N = new I18nManager();
