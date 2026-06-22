// 全局游戏状态 store
import { reactive, computed } from 'vue'
import { saveData, loadData } from './storage.js'
import { calcLevel, getCurrentTool, getYieldBonus, SEASONS } from './game.js'

const STORAGE_KEY = 'store'

export const store = reactive({
  totalGold: 0,
  totalExp: 0,
  level: 1,
  warehouse: [],
  fields: [],
  unlockedTechs: [],
  passedLevels: [],
  currentSeason: '春'   // 当前季节,可选 春/夏/秋/冬
})

export const level = computed(() => calcLevel(store.totalGold))
export const yieldBonus = computed(() => getYieldBonus(level.value))
export const currentTool = computed(() => getCurrentTool(level.value, store.unlockedTechs))

export function saveStore() {
  saveData(STORAGE_KEY, {
    totalGold: store.totalGold,
    totalExp: store.totalExp,
    warehouse: store.warehouse,
    fields: store.fields,
    unlockedTechs: store.unlockedTechs,
    passedLevels: store.passedLevels,
    currentSeason: store.currentSeason
  })
}

export function loadStore() {
  const v = loadData(STORAGE_KEY, null)
  if (!v) return
  store.totalGold = v.totalGold || 0
  store.totalExp = v.totalExp || 0
  store.warehouse = Array.isArray(v.warehouse) ? v.warehouse : []
  store.fields = Array.isArray(v.fields) && v.fields.length === 36 ? v.fields : []
  store.unlockedTechs = Array.isArray(v.unlockedTechs) ? v.unlockedTechs : []
  store.passedLevels = Array.isArray(v.passedLevels) ? v.passedLevels : []
  store.currentSeason = SEASONS.includes(v.currentSeason) ? v.currentSeason : '春'
  store.level = calcLevel(store.totalGold)
}
