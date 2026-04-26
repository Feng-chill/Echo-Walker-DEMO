const ScoreStorage = (() => {
  const STORAGE_KEY = "echo-walker:score-records:v1";
  const EMPTY_DATA = {
    version: 1,
    totalScore: 0,
    totalClears: 0,
    bestScore: 0,
    levels: {}
  };

  function cloneEmptyData() {
    return {
      ...EMPTY_DATA,
      levels: {}
    };
  }

  function load() {
    try {
      const raw = window.localStorage?.getItem(STORAGE_KEY);
      if (!raw) return cloneEmptyData();

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return cloneEmptyData();

      return {
        ...cloneEmptyData(),
        ...parsed,
        levels: parsed.levels && typeof parsed.levels === "object" ? parsed.levels : {}
      };
    } catch (error) {
      console.warn("Score records could not be loaded.", error);
      return cloneEmptyData();
    }
  }

  function save(data) {
    try {
      window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn("Score records could not be saved.", error);
      return false;
    }
  }

  function recordRun(result) {
    if (!result || result.defeated || !result.levelId) return result;

    const data = load();
    const previous = data.levels[result.levelId] ?? null;
    const score = Math.max(0, Math.round(result.score || 0));
    const playedAt = new Date().toISOString();
    const isNewBest = !previous || score > (previous.bestScore || 0);
    const run = {
      score,
      rank: result.rank,
      title: result.title,
      time: Number(result.time || 0),
      damageTaken: Number(result.damageTaken || 0),
      perfectParry: Number(result.perfectParry || 0),
      normalParry: Number(result.normalParry || 0),
      maxCombo: Number(result.maxCombo || 0),
      bursts: Number(result.bursts || 0),
      playedAt
    };

    const levelRecord = {
      levelId: result.levelId,
      levelTitle: result.levelTitle,
      clears: (previous?.clears || 0) + 1,
      lastScore: score,
      lastRank: result.rank,
      lastTime: run.time,
      lastPlayedAt: playedAt,
      bestScore: isNewBest ? score : previous.bestScore,
      bestRank: isNewBest ? result.rank : previous.bestRank,
      bestTime: isNewBest ? run.time : previous.bestTime,
      bestPlayedAt: isNewBest ? playedAt : previous.bestPlayedAt,
      history: [run, ...(previous?.history || [])].slice(0, 10)
    };

    data.levels[result.levelId] = levelRecord;
    data.totalScore = Math.max(0, Math.round(data.totalScore || 0)) + score;
    data.totalClears = Math.max(0, Math.round(data.totalClears || 0)) + 1;
    data.bestScore = Math.max(data.bestScore || 0, levelRecord.bestScore || 0);
    save(data);

    return {
      ...result,
      isNewBest,
      bestScore: levelRecord.bestScore,
      totalScore: data.totalScore
    };
  }

  function reset() {
    save(cloneEmptyData());
  }

  return {
    load,
    recordRun,
    reset
  };
})();

window.ScoreStorage = ScoreStorage;
