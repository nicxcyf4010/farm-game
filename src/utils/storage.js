// localStorage 持久化工具
const PREFIX = 'farm_'

export function saveData(key, val) {
  localStorage.setItem(PREFIX + key, JSON.stringify(val))
}

export function loadData(key, def = null) {
  const v = localStorage.getItem(PREFIX + key)
  if (v == null) return def
  try { return JSON.parse(v) } catch { return def }
}

export function removeData(key) {
  localStorage.removeItem(PREFIX + key)
}

export function clearAll() {
  Object.keys(localStorage)
    .filter(k => k.startsWith(PREFIX))
    .forEach(k => localStorage.removeItem(k))
}
