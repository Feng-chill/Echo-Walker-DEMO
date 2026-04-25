class AudioManager {
  constructor() {
    this.unlocked = false;
    this.currentBgm = null;
    this.currentBgmName = "";
    this.currentBgmVolume = null;
    this.bgmTracks = {
      menu: this.createBgm("./voice/zhujiemian-bgm-60s.mp3", 0.42),
      scene: this.createBgm("./voice/changjing-bgm-75s.mp3", 0.32)
    };
    this.sfxPools = {
      melee: this.createSfxPool("./voice/jinzhan-daosheng-short.mp3", 0.6, 5),
      rifle: this.createSfxPool("./voice/danfabuqiang-short.mp3", 0.52, 5),
      shotgun: this.createSfxPool("./voice/xiandanqiang-short.mp3", 0.58, 5),
      parry: this.createSfxPool("./voice/tanfan-short.mp3", 0.62, 6)
    };
  }

  createBgm(src, volume) {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.loop = true;
    audio.volume = volume;
    return audio;
  }

  createSfxPool(src, volume, size) {
    return Array.from({ length: size }, () => {
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = volume;
      return audio;
    });
  }

  unlock() {
    this.unlocked = true;
    if (this.currentBgmName) this.playBgm(this.currentBgmName, this.currentBgmVolume ?? undefined);
  }

  playBgm(name, volumeOverride = null) {
    if (!this.unlocked) {
      this.currentBgmName = name;
      this.currentBgmVolume = volumeOverride;
      return;
    }

    const next = this.bgmTracks[name];
    if (!next) return;
    const targetVolume = volumeOverride ?? next.volume;

    if (this.currentBgm === next) {
      next.volume = targetVolume;
      this.currentBgmVolume = targetVolume;
      if (next.paused) next.play().catch(() => {});
      return;
    }

    this.stopBgm();
    this.currentBgm = next;
    this.currentBgmName = name;
    this.currentBgmVolume = targetVolume;
    next.volume = targetVolume;
    next.currentTime = 0;
    next.play().catch(() => {});
  }

  stopBgm() {
    if (!this.currentBgm) return;
    this.currentBgm.pause();
    this.currentBgm.currentTime = 0;
    this.currentBgm = null;
    this.currentBgmName = "";
    this.currentBgmVolume = null;
  }

  playSfx(name) {
    if (!this.unlocked) return;
    const pool = this.sfxPools[name];
    if (!pool?.length) return;
    const channel = pool.find((audio) => audio.paused || audio.ended) ?? pool[0];
    channel.currentTime = 0;
    channel.play().catch(() => {});
  }
}
