<template>
  <div class="farm-panel">
    <div class="farm-grid">
      <div
        v-for="(cell, idx) in fields"
        :key="idx"
        class="cell"
        :class="cellClass(cell)"
        @click="onCellClick(idx)"
        :title="cellTip(cell)"
      >
        <div class="cell-main">
          <template v-if="cell.status === 'empty'">＋</template>
          <template v-else>
            <el-tooltip
              v-if="cell.cropId"
              :content="cellDescription(cell) || cell.name || ''"
              placement="top"
              effect="light"
            >
              <img
                :src="$ic(cropIconKey(cell))"
                :alt="cell.name || 'crop'"
                class="cell-crop-img"
              />
            </el-tooltip>
            <span v-else>{{ cropIconOf(cell) }}</span>
          </template>
        </div>
        <div class="cell-sub">
          <template v-if="cell.status === 'growing'">
            <span>{{ cell.name }}</span>
            <span class="t">{{ remain(cell) }}s</span>
          </template>
          <template v-else-if="cell.status === 'ripe'">
            <span>{{ cell.name }}</span>
            <span class="t">可收获</span>
          </template>
          <template v-else>
            <span>空地</span>
          </template>
        </div>
      </div>
    </div>

    <BaseDialog v-model="plantDlg" title="选择作物" width="460px">
      <div class="crop-list">
        <el-tooltip
          v-for="c in availableCrops"
          :key="c.id"
          :content="c.description || c.name"
          placement="top"
          effect="light"
        >
          <div
            class="crop-item"
            :class="{ disabled: !isInSeasonNow(c) }"
            @click="onPick(c)"
          >
            <img
              :src="$ic(c.icon)"
              :alt="c.name"
              class="crop-icon-img"
            />
            <div class="crop-info">
              <div class="row1">
                <span class="crop-name">{{ c.name }}</span>
                <span class="crop-tag">{{ c.category }}</span>
                <span class="crop-tag">季:{{ seasonTextOf(c) }}</span>
                <span v-if="!isInSeasonNow(c)" class="crop-tag off">非当季</span>
              </div>
              <div class="row2">
                生长 {{ effGrowTimeOf(c) }}s · 产量 {{ effYieldOf(c) }} · 单价 {{ c.sellPrice }} · 经验 +{{ c.expValue }}
              </div>
              <div class="row3">
                💧{{ effWaterOf(c) }} · 🧪{{ effFertOf(c) }} · 🐛{{ effPestOf(c) }}%
              </div>
            </div>
          </div>
        </el-tooltip>
        <div v-if="!availableCrops.length" class="empty-tip">
          暂无可种作物,请先升级小镇
        </div>
      </div>
    </BaseDialog>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import BaseDialog from '../common/BaseDialog.vue'
import crops from '../../assets/data/cropList.json'
import { store, level, saveStore } from '../../utils/gameStore.js'
import {
  calcHarvestYield, calcHarvestExp, getEffectiveGrowTime,
  applyTechEffects, isInSeason
} from '../../utils/game.js'

// 统一图标工具:基于当前文件 src/components/game/ → src/assets/icons/
const $ic = (n) => new URL(`../../assets/icons/${n}.png`, import.meta.url).href

function initFields() {
  if (store.fields.length !== 36) {
    store.fields = Array.from({ length: 36 }, () => ({ status: 'empty' }))
  }
}
initFields()
const fields = computed(() => store.fields)

// 接收父组件提供的当前季节
const currentSeasonRef = inject('currentSeason')
const currentSeason = computed(() => currentSeasonRef?.value || '春')

const plantDlg = ref(false)
const pendingIdx = ref(-1)
let timer = null

// 可种作物:unlockLevel <= 当前等级
const availableCrops = computed(() =>
  crops.filter(c => (c.unlockLevel || 1) <= level.value)
)

// 季节适配:season 字段现为数组
function seasonTextOf(c) {
  return Array.isArray(c.season) ? c.season.join('/') : ''
}
function isInSeasonNow(c) {
  return isInSeason(c, currentSeason.value, store.unlockedTechs)
}

function cropOf(cell) { return crops.find(x => x.id === cell.cropId) }
function cropIconKey(cell) {
  const c = cropOf(cell)
  return c ? c.icon : '?'
}
function cellDescription(cell) {
  const c = cropOf(cell)
  return c ? c.description : ''
}
function effGrowTimeOf(c) { return getEffectiveGrowTime(c, store.unlockedTechs) }
function effYieldOf(c) { return calcHarvestYield(c, level.value, store.unlockedTechs) }
function effWaterOf(c) { return applyTechEffects(c, store.unlockedTechs).waterNeed }
function effFertOf(c)  { return applyTechEffects(c, store.unlockedTechs).fertilizerNeed }
function effPestOf(c)  { return applyTechEffects(c, store.unlockedTechs).pestRisk }

function cellClass(cell) {
  return {
    empty: cell.status === 'empty',
    sown: cell.status === 'sown',
    growing: cell.status === 'growing',
    ripe: cell.status === 'ripe'
  }
}
function cropIconOf(cell) {
  const c = cropOf(cell)
  return c ? c.icon : '?'
}
function remain(cell) {
  return Math.max(0, Math.ceil((cell.endAt - Date.now()) / 1000))
}
function cellTip(cell) {
  const c = cropOf(cell)
  if (!c) return '空地'
  const t = applyTechEffects(c, store.unlockedTechs)
  return [
    `${c.name} | ${c.category} | 季:${seasonTextOf(c)}`,
    `生长 ${t.growTime}s | 单价 ${c.sellPrice}`,
    `💧${t.waterNeed} 🧪${t.fertilizerNeed} 🐛${t.pestRisk}%`
  ].join('\n')
}

function tick() {
  const now = Date.now()
  let changed = false
  for (const cell of fields.value) {
    if (cell.status === 'growing' && now >= cell.endAt) {
      cell.status = 'ripe'
      changed = true
    }
  }
  if (changed) saveStore()
}

function onCellClick(idx) {
  const cell = fields.value[idx]
  if (cell.status === 'growing') return
  if (cell.status === 'ripe') { harvest(idx); return }
  pendingIdx.value = idx
  plantDlg.value = true
}

// 选中作物:做季节校验
function onPick(c) {
  if (!isInSeasonNow(c)) {
    alert('该作物非当季,需温室大棚')
    return
  }
  confirmPlant(c)
}

function confirmPlant(c) {
  if (pendingIdx.value < 0) return
  const cell = fields.value[pendingIdx.value]
  cell.status = 'growing'
  cell.cropId = c.id
  cell.name = c.name
  cell.description = c.description
  cell.category = c.category
  cell.season = c.season
  cell.icon = c.icon
  cell.sownAt = Date.now()
  cell.endAt = Date.now() + effGrowTimeOf(c) * 1000
  plantDlg.value = false
  pendingIdx.value = -1
  saveStore()
}

function harvest(idx) {
  const cell = fields.value[idx]
  const c = cropOf(cell)
  if (!c) return
  const qty = calcHarvestYield(c, level.value, store.unlockedTechs)
  const exp = calcHarvestExp(c)
  pushToWarehouse(store.warehouse, c.id, qty)
  store.totalExp += exp
  store.level = level.value
  fields.value[idx] = { status: 'empty' }
  saveStore()
}
function pushToWarehouse(warehouse, cropId, qty) {
  const slot = warehouse.find(w => w.cropId === cropId)
  if (slot) slot.qty += qty
  else warehouse.push({ cropId, qty })
}

function harvestAll() {
  for (let i = 0; i < fields.value.length; i++) {
    if (fields.value[i].status === 'ripe') harvest(i)
  }
}
defineExpose({ harvestAll })

onMounted(() => { timer = setInterval(tick, 1000) })
onUnmounted(() => { clearInterval(timer) })
</script>

<style scoped>
.farm-panel { width: 100%; }
.farm-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
.cell {
  aspect-ratio: 1 / 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  cursor: pointer; user-select: none; border-radius: 4px; font-size: 12px; color: #fff;
}
.cell:hover { opacity: .9; }
.cell.empty { background: #e6e6e6; color: #999; }
.cell.sown { background: #c0d8a0; color: #333; }
.cell.growing { background: #5b8def; }
.cell.ripe { background: #f5a623; }
.cell-main { font-size: 22px; line-height: 1; }
.cell-sub { margin-top: 4px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.cell-sub .t { font-size: 11px; opacity: .9; }

.crop-list { display: flex; flex-direction: column; gap: 6px; }
.crop-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px; border: 1px solid #ebeef5; border-radius: 4px; cursor: pointer;
}
.crop-item:hover { background: #f0f9eb; }
.crop-item.disabled { opacity: .55; cursor: not-allowed; }
.crop-item.disabled:hover { background: transparent; }
.crop-icon-img {
  width: 22px;
  height: 22px;
  object-fit: contain;
  flex-shrink: 0;
  margin-right: 8px;
}
.crop-info { flex: 1; }
.row1 { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.crop-name { font-weight: 500; }
.crop-tag { font-size: 11px; color: #666; border: 1px solid #ddd; border-radius: 3px; padding: 0 4px; }
.crop-tag.off { color: #c45656; border-color: #f3c2c2; }
.row2 { font-size: 12px; color: #606266; margin-top: 2px; }
.row3 { font-size: 12px; color: #909399; margin-top: 2px; }
.empty-tip { color: #999; text-align: center; padding: 12px; }

/* 格子内作物图 */
.cell-crop-img { width: 28px; height: 28px; object-fit: contain; }
</style>
