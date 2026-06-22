// 数值计算工具,所有派生量统一在此处
import townLevels from '../assets/data/townLevel.json'
import crops from '../assets/data/cropList.json'
import techTree from '../assets/data/techTree.json'

// ---- 等级 ----
export function calcLevel(totalGold) {
  let lv = 1
  for (const t of townLevels) {
    if (totalGold >= t.needGold) lv = t.level
  }
  return lv
}
export function getLevelCfg(level) {
  return townLevels.find(t => t.level === level) || townLevels[0]
}
export function getYieldBonus(level) {
  return getLevelCfg(level).yieldBonus
}
// 旧版奖励展示(保留兼容,新机制走 unlockedTechs)
export const toolRewards = {
  2: { name: '除草机', bonus: 0.3 },
  3: { name: '无人机灌溉', bonus: 0.5 }
}
export function getCurrentTool(level, unlockedTechs = []) {
  // 优先取已解锁的最高级科技名
  const owned = unlockedTechs
    .map(id => techTree.find(t => t.id === id))
    .filter(Boolean)
    .sort((a, b) => b.unlockLevel - a.unlockLevel)[0]
  if (owned) return owned.name
  return getLevelCfg(level).unlockTool
}

// ---- 科技:查询已解锁科技配置 ----
export function getTechById(id) {
  return techTree.find(t => t.id === id) || null
}
// 是否已解锁
export function hasTech(id, unlockedTechs = []) {
  return unlockedTechs.includes(id)
}

// 应用科技效果(对单个作物)
// 返回 { yieldMul, growTime, waterNeed, fertilizerNeed, pestRisk, ignoreSeason }
export function applyTechEffects(crop, unlockedTechs = []) {
  // 单科技叠加规则:多个 growTimeMul 连乘,waterNeed/fertilizerNeed 取最小,ignoreSeason 任一即生效
  let yieldMul = 0
  let growTimeMul = 1
  let waterNeed = crop.waterNeed
  let fertilizerNeed = crop.fertilizerNeed
  let pestRisk = crop.pestRisk
  let ignoreSeason = false

  for (const id of unlockedTechs) {
    const tech = getTechById(id)
    if (!tech) continue
    // 仅当该作物支持该科技(techBonus 中对应布尔)才生效
    const flag = crop.techBonus?.[id]
    const eff = tech.effect || {}

    if (eff.waterNeed !== undefined) waterNeed = Math.min(waterNeed, eff.waterNeed)
    if (eff.fertilizerNeed !== undefined) fertilizerNeed = Math.min(fertilizerNeed, eff.fertilizerNeed)
    if (eff.fertilizerNeedMul !== undefined) fertilizerNeed = Math.floor(fertilizerNeed * eff.fertilizerNeedMul)
    if (eff.pestRisk !== undefined) pestRisk = Math.min(pestRisk, eff.pestRisk)
    if (typeof eff.pestRiskAdd === 'number') pestRisk = Math.max(0, pestRisk + eff.pestRiskAdd)
    if (eff.growTimeMul !== undefined) growTimeMul *= eff.growTimeMul
    if (eff.ignoreSeason) ignoreSeason = true

    // yieldBoost:仅当 flag===true 时纳入计算
    if (flag === true) yieldMul += (crop.techBonus?.yieldBoost || 0)
  }
  return { yieldMul, growTimeMul, waterNeed, fertilizerNeed, pestRisk, ignoreSeason, growTime: Math.max(1, Math.floor(crop.growTime * growTimeMul)) }
}

// ---- 收割产量与经验 ----
// actualYield = baseYield × (1 + yieldBoost×科技使能) × 等级基础加成
export function calcHarvestYield(crop, level, unlockedTechs = []) {
  const { yieldMul } = applyTechEffects(crop, unlockedTechs)
  return Math.max(1, Math.floor(crop.baseYield * (1 + yieldMul) * getYieldBonus(level)))
}
// 收获经验
export function calcHarvestExp(crop) {
  return crop.expValue || 0
}
// 实际生长时间(秒)
export function getEffectiveGrowTime(crop, unlockedTechs = []) {
  return applyTechEffects(crop, unlockedTechs).growTime
}

// ---- 仓库 ----
export function calcSellIncome(warehouse) {
  let total = 0
  for (const item of warehouse) {
    const c = crops.find(x => x.id === item.cropId)
    if (c) total += c.sellPrice * item.qty
  }
  return total
}
export function pushToWarehouse(warehouse, cropId, qty) {
  const slot = warehouse.find(w => w.cropId === cropId)
  if (slot) slot.qty += qty
  else warehouse.push({ cropId, qty })
}

// ---- 题目 ----
// 按等级允许的最大 difficulty 筛选:初阶=1,中阶=2,高阶=3
export function maxDifficultyOf(level) {
  if (level >= 5) return 3
  if (level >= 3) return 2
  return 1
}
export function pickByLevelAndDifficulty(bank, level, n = 5) {
  const maxD = maxDifficultyOf(level)
  const filtered = bank.filter(q => (q.difficulty || 1) <= maxD)
  return pickRandomQuestions(filtered, n)
}
export function pickRandomQuestions(bank, n = 5) {
  const copy = [...bank]
  const out = []
  for (let i = 0; i < n && copy.length; i++) {
    const k = Math.floor(Math.random() * copy.length)
    out.push(copy.splice(k, 1)[0])
  }
  return out
}
export function isPassed(correctCount, total, threshold = 0.7) {
  return total > 0 && correctCount / total >= threshold
}

// ---- 下一等级信息 ----
export function getNextLevelCfg(level) {
  return townLevels.find(t => t.level === level + 1) || null
}

// ---- 季节 ----
// 合法季节列表
export const SEASONS = ['春', '夏', '秋', '冬']
// 下一个季节(循环)
export function nextSeason(season) {
  const i = SEASONS.indexOf(season)
  return SEASONS[(i < 0 ? 0 : i + 1) % SEASONS.length]
}
// 判断作物在当前季节是否可种:已解锁 greenhouse 科技 => 忽略季节限制
export function isInSeason(crop, season, unlockedTechs = []) {
  if (unlockedTechs.includes('greenhouse')) return true
  const arr = Array.isArray(crop.season) ? crop.season : []
  return arr.includes(season)
}
