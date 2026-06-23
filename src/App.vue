<template>
  <div class="farm-container">
    <!-- 左区:经营主界面 -->
    <div class="left-zone">
      <!-- 1. 顶部标题栏 -->
      <div class="top-bar">
        <div class="top-title">
          <span class="farm-name">🏡 {{ levelCfg.stageName || '归乡小镇' }}</span>
        </div>
        <div class="top-season">
          <button class="season-pill" type="button" @click="onSwitchSeason" title="点击切换到下一季">
            <img :src="$ic(seasonIconKey)" class="season-icon" :alt="store.currentSeason"/>
            <span class="season-name">{{ store.currentSeason }}季</span>
            <span class="season-next">↻ 换季</span>
          </button>
        </div>
      </div>

      <!-- 3. 货币状态栏(网格上方) -->
      <div class="currency-bar">
        <div class="cur-item">
          <img :src="$ic('ui_gold')" class="cur-ic" alt="gold"/>
          <span class="cur-val">{{ store.totalGold }}</span>
          <span class="cur-label">金币</span>
        </div>
        <div class="cur-item">
          <img :src="$ic('ui_level')" class="cur-ic" alt="lv"/>
          <span class="cur-val">Lv{{ store.level }}</span>
          <span class="cur-label">小镇等级</span>
        </div>
        <div class="cur-item">
          <img :src="$ic('ui_warehouse')" class="cur-ic" alt="wh"/>
          <span class="cur-val">{{ warehouseCount }}</span>
          <span class="cur-label">仓库</span>
        </div>
      </div>

      <!-- 2. 游戏场景预览(6×6 农田) -->
      <div class="scene-card">
        <div class="scene-header">
          <span class="scene-title">🌾 我的农田</span>
          <span class="scene-sub">点击格子种植/收获</span>
        </div>
        <FarmGrid ref="farmRef" />
      </div>

      <!-- 4. 种子分类圆形按钮区(网格下方) -->
      <div class="seed-bar">
        <div class="seed-title">🌱 选择种子</div>
        <div class="seed-list">
          <div
            v-for="c in availableCrops"
            :key="c.id"
            class="seed-btn"
            :class="{
              active: selectedSeedId === c.id,
              off: !isSeedInSeason(c)
            }"
            :title="`${c.name} · ${c.category} · 季:${seasonTextOfSeed(c)}${isSeedInSeason(c) ? '' : ' (非当季)'}`"
            @click="onPickSeed(c)"
          >
            <img :src="$ic(c.icon)" :alt="c.name" class="seed-ic"/>
          </div>
          <div v-if="!availableCrops.length" class="seed-empty">暂无可种作物</div>
        </div>
      </div>

      <!-- 5. 底部两主按钮 + 仓库展开 -->
      <div class="bottom-bar">
        <button class="primary-btn" @click="onPlant">
          <img :src="$ic('btn_plant')" class="btn-ic" alt="plant"/>
          <span>种植</span>
        </button>
        <button class="primary-btn" @click="onSell">
          <img :src="$ic('btn_shop')" class="btn-ic" alt="shop"/>
          <span>市场</span>
        </button>
        <button class="primary-btn" @click="onHarvestAll">
          <img :src="$ic('btn_harvest')" class="btn-ic" alt="harvest"/>
          <span>一键收割</span>
        </button>
        <el-button text class="toggle-wh" @click="showWarehouse = !showWarehouse">
          {{ showWarehouse ? '收起仓库详情' : '展开仓库详情' }}
        </el-button>
      </div>

      <!-- 6. 仓库详情 -->
      <transition name="fade">
        <div v-if="showWarehouse" class="warehouse-card">
          <div class="wh-title">📦 仓库作物</div>
          <div v-if="!store.warehouse.length" class="wh-empty">仓库为空,快去种菜吧～</div>
          <div v-else class="wh-list">
            <div v-for="w in store.warehouse" :key="w.cropId" class="wh-item">
              <img :src="$ic(iconKeyOf(w.cropId))" class="wh-ic" :alt="nameOf(w.cropId)"/>
              <span class="wh-name">{{ nameOf(w.cropId) }}</span>
              <span class="wh-qty">×{{ w.qty }}</span>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- 右区:科技研发模块 -->
    <div class="right-zone">
      <div class="tech-header">
        <div class="tech-title">🔬 科技研发</div>
        <div class="tech-sub">
          小镇等级 Lv{{ store.level }} · {{ levelCfg.stageName }} · 已解锁 {{ store.unlockedTechs.length }} 项科技
        </div>
      </div>

      <!-- 2×2 四宫格 -->
      <div class="tech-grid">
        <div
          v-for="t in techFour"
          :key="t.id"
          class="tech-card"
          :class="{ unlocked: hasTech(t.id) }"
        >
          <div class="tech-mask" v-if="!hasTech(t.id)"></div>
          <img :src="getTechIcon(t.id)" :alt="t.name" class="tech-ic"/>
          <div class="tech-name">{{ t.name }}</div>
          <div class="tech-desc">{{ t.desc }}</div>
          <div class="tech-status">
            <span v-if="hasTech(t.id)" class="ts-ok">✓ 已解锁</span>
            <span v-else class="ts-lock">Lv{{ t.unlockLevel }} 解锁</span>
          </div>
        </div>
      </div>

      <!-- 3. 双进度条 -->
      <div class="progress-block">
        <div class="prog-row">
          <span class="prog-label">研发进度</span>
          <el-progress
            :percentage="researchProgress"
            :color="'#4a7c59'"
            :stroke-width="8"
            text-inside
          />
        </div>
        <div class="prog-row">
          <span class="prog-label">解锁进度</span>
          <el-progress
            :percentage="unlockProgress"
            :color="'#4a7c59'"
            :stroke-width="8"
            text-inside
          />
        </div>
      </div>

      <!-- 4. 右下角去答题按钮 -->
      <div class="tech-bottom">
        <button class="primary-btn" @click="onAnswer">
          <img :src="$ic('btn_quiz')" class="btn-ic" alt="quiz"/>
          <span>去答题</span>
        </button>
      </div>
    </div>

    <!-- ===== 弹窗区(原业务逻辑保留) ===== -->
    <BaseDialog v-model="sellDlg" title="售卖结果" width="360px">
      <div v-if="lastSell">
        <p>本次共卖出 <b>{{ lastSell.qty }}</b> 件作物</p>
        <p>获得金币
          <img :src="$ic('ui_gold')" class="ui-ic-xs" alt="g"/>
          <b style="color:#67c23a">+{{ lastSell.gain }}</b>
        </p>
        <p>小镇累计金币: <b>{{ store.totalGold }}</b></p>
        <p>当前等级: <b>Lv{{ store.level }} · {{ levelCfg.stageName }}</b></p>
      </div>
    </BaseDialog>

    <AnswerModal ref="answerRef" />

    <el-dialog
      v-model="showLevelUpDesc"
      title="小镇升级"
      width="440px"
      :show-close="false"
      :close-on-click-modal="false"
      custom-class="levelup-dialog"
    >
      <p class="levelup-body">{{ curLevelUpDesc }}</p>
      <template #footer>
        <el-button type="primary" class="levelup-confirm" @click="onCloseLevelUp">继续冒险</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, provide, onMounted, onUnmounted, watch } from 'vue'
import BaseDialog from './components/common/BaseDialog.vue'
import AnswerModal from './components/common/AnswerModal.vue'
import FarmGrid from './components/game/FarmGrid.vue'
import { store, level, currentTool, yieldBonus, saveStore, loadStore } from './utils/gameStore.js'
import { clearAll } from './utils/storage.js'
import { calcSellIncome, getLevelCfg, getNextLevelCfg, SEASONS, nextSeason } from './utils/game.js'
import crops from './assets/data/cropList.json'
import techTree from './assets/data/techTree.json'

// 统一图标工具
const $ic = (n) => new URL(`./assets/icons/${n}.png`, import.meta.url).href

// 科技图标加载:techTree.json 不含 icon 字段,按 id 映射到 src/assets/icons/tech_xxx.png
// App.vue 位于 src/, 与 assets/ 同级,路径写 ./assets/icons/
const TECH_ICON_MAP = {
  autoWater:    'tech_autoWater',
  pestControl:  'tech_pestControl',
  drone:        'tech_drone',
  soilSensor:   'tech_soilSensor',
  greenhouse:   'tech_greenhouse',
  smartIrrig:   'tech_smartIrrig'
}
const getTechIcon = (techId) => {
  const file = TECH_ICON_MAP[techId] || `tech_${techId}`
  return new URL(`./assets/icons/${file}.png`, import.meta.url).href
}

const farmRef = ref(null)
const answerRef = ref(null)
const sellDlg = ref(false)
const lastSell = ref(null)
let tickTimer = null

// 升级文案弹窗
const showLevelUpDesc = ref(false)
const curLevelUpDesc = ref('')
const shownLevelDescs = ref(new Set())

// 季节 emoji 映射(保留兼容,部分区域仍可能用到)
const SEASON_EMOJI = { '春': '🌸', '夏': '☀️', '秋': '🍂', '冬': '❄️' }
const seasonEmoji = computed(() => SEASON_EMOJI[store.currentSeason] || '🌸')

// 季节中文 -> 本地图标文件名(season_spring/summer/autumn/winter.png)
// 注:winter 实际文件名为 season_winter.png.png(双后缀,统一在此映射)
const SEASON_KEY_MAP = {
  '春':   'season_spring',
  '夏':   'season_summer',
  '秋':   'season_autumn',
  '冬':   'season_winter.png'   // 兼容双后缀文件名
}
const seasonIconKey = computed(() => SEASON_KEY_MAP[store.currentSeason] || 'season_spring')

// 仓库展开
const showWarehouse = ref(false)

// 选中种子
const selectedSeedId = ref(null)

// 向下提供当前季节 & 图标
provide('currentSeason', computed(() => store.currentSeason))
provide('$ic', $ic)
// 同步把当前选中种子与可选种子暴露给 FarmGrid
provide('selectedSeedId', selectedSeedId)
provide('availableSeeds', computed(() =>
  crops.filter(c => (c.unlockLevel || 1) <= level.value)
))
provide('pickSeed', (c) => onPickSeed(c))

const levelCfg = computed(() => getLevelCfg(level.value))
const nextCfg = computed(() => getNextLevelCfg(level.value))

const warehouseCount = computed(() =>
  (store.warehouse || []).reduce((s, w) => s + (w.qty || 0), 0)
)
const yieldBonusText = computed(() => yieldBonus.value.toFixed(2))

// 可种作物(供种子按钮区使用)
const availableCrops = computed(() =>
  crops.filter(c => (c.unlockLevel || 1) <= level.value)
)

function seasonTextOfSeed(c) {
  return Array.isArray(c.season) ? c.season.join('/') : ''
}
function isSeedInSeason(c) {
  return Array.isArray(c.season) ? c.season.includes(store.currentSeason) : true
}
function onPickSeed(c) {
  if (!isSeedInSeason(c)) {
    alert('该作物非当季,需温室大棚')
    return
  }
  selectedSeedId.value = (selectedSeedId.value === c.id) ? null : c.id
}

// 仓库内作物元数据
function nameOf(cropId) {
  return crops.find(x => x.id === cropId)?.name || `#${cropId}`
}
function iconKeyOf(cropId) {
  return crops.find(x => x.id === cropId)?.icon || '?'
}

// 四宫格科技(原业务四件套)
const techFour = computed(() => {
  const ids = ['autoWater', 'pestControl', 'drone', 'soilSensor']
  return ids
    .map(id => techTree.find(t => t.id === id))
    .filter(Boolean)
})
function hasTech(id) {
  return store.unlockedTechs.includes(id)
}

// 双进度条(研发 / 解锁)
const researchProgress = computed(() => {
  // 研发进度:按已通过答题数/总题目数 取近似
  const total = 10
  return Math.min(100, Math.round((store.passedLevels.length / total) * 100))
})
const unlockProgress = computed(() => {
  // 解锁进度:已解锁科技/科技总数
  const total = techTree.length || 1
  return Math.min(100, Math.round((store.unlockedTechs.length / total) * 100))
})

function pctOf(now, base, target) {
  if (target <= base) return 100
  return Math.max(0, Math.min(100, ((now - base) / (target - base)) * 100))
}
const goldPct = computed(() => {
  const base = levelCfg.value?.needGold || 0
  const target = nextCfg.value?.needGold
  if (target == null) return 100
  return pctOf(store.totalGold, base, target)
})
const expPct = computed(() => {
  const base = levelCfg.value?.needExp || 0
  const target = nextCfg.value?.needExp
  if (target == null) return 100
  return pctOf(store.totalExp, base, target)
})

// 切换季节
function onSwitchSeason() {
  store.currentSeason = nextSeason(store.currentSeason)
  saveStore()
}

// 升级文案弹窗
function showDescForLevel(lv) {
  if (shownLevelDescs.value.has(lv)) return
  const cfg = getLevelCfg(lv)
  if (!cfg?.description) return
  shownLevelDescs.value.add(lv)
  curLevelUpDesc.value = cfg.description
  showLevelUpDesc.value = true
}
function onCloseLevelUp() {
  showLevelUpDesc.value = false
}

watch(() => store.totalGold, () => {
  const lv = level.value
  if (lv !== store.level) {
    store.level = lv
    saveStore()
    showDescForLevel(lv)
    const tr = getLevelCfg(lv)?.unlockTechQuiz
    if (tr && !store.unlockedTechs.includes(tr.techReward)) {
      setTimeout(() => answerRef.value?.start(lv), 200)
    }
  }
})

function onHarvestAll() { farmRef.value?.harvestAll() }

// 底部"种植":若已选种子,直接在 FarmGrid 内尝试种入第一个空格;
function onPlant() {
  farmRef.value?.plantBySeed(selectedSeedId.value)
}
function onSell() {
  if (!store.warehouse.length) { alert('仓库为空'); return }
  const qty = warehouseCount.value
  const gain = calcSellIncome(store.warehouse)
  store.totalGold += gain
  store.warehouse = []
  store.level = level.value
  lastSell.value = { qty, gain }
  sellDlg.value = true
  saveStore()
}

function onAnswer() {
  const lv = store.level
  const tr = getLevelCfg(lv)?.unlockTechQuiz
  if (tr && !store.unlockedTechs.includes(tr.techReward)) {
    answerRef.value?.start(lv); return
  }
  const list = []
  for (let l = 1; l <= 6; l++) {
    const cfg = getLevelCfg(l)
    if (cfg?.unlockTechQuiz && !store.unlockedTechs.includes(cfg.unlockTechQuiz.techReward)) {
      list.push(l)
    }
  }
  if (list.length) answerRef.value?.start(list[0])
  else alert('已通过全部科技考核,无新农具可解锁')
}

function onReset() {
  if (!confirm('确认重置所有存档?')) return
  clearAll()
  shownLevelDescs.value = new Set()
  location.reload()
}

onMounted(() => {
  loadStore()
  if (getLevelCfg(store.level)?.description) {
    shownLevelDescs.value.add(store.level)
    curLevelUpDesc.value = getLevelCfg(store.level).description
    setTimeout(() => { showLevelUpDesc.value = true }, 400)
  }
  const tr = getLevelCfg(store.level)?.unlockTechQuiz
  if (tr && !store.unlockedTechs.includes(tr.techReward)) {
    setTimeout(() => answerRef.value?.start(store.level), 300)
  }
  tickTimer = setInterval(() => {
    if (level.value !== store.level) {
      store.level = level.value
      saveStore()
    }
  }, 1000)
})
onUnmounted(() => clearInterval(tickTimer))
</script>

<style scoped>
/* ===== 整体容器 ===== */
.farm-container {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #f5f0e8;
  min-height: 100vh;
  font-family: 'PingFang SC','Microsoft YaHei','Segoe UI',sans-serif;
  color: #3d3d3d;
  box-sizing: border-box;
}

/* ===== 左右区 ===== */
.left-zone {
  flex: 2;
  padding: 16px;
  background: #fffaf2;
  border-radius: 16px;
  border: 1.5px solid #d4c9b8;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.right-zone {
  flex: 1;
  padding: 16px;
  background: #fffaf2;
  border-radius: 16px;
  border: 1.5px solid #d4c9b8;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ===== 顶部标题栏 ===== */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 12px;
  padding: 8px 14px;
  border: 1px solid rgba(212, 201, 184, 0.6);
}
.top-title { display: flex; align-items: center; gap: 6px; }
.farm-name { font-size: 16px; font-weight: 700; color: #3d3d3d; }
.top-season .season-pill {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; color: #4a7c59;
  background: #eaf4eb;
  border: 1.5px solid #c8b89a;
  border-radius: 20px;
  padding: 3px 10px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}
.top-season .season-pill:hover {
  background: #d6e9d8;
  border-color: #4a7c59;
  transform: scale(1.04);
  filter: brightness(1.05);
}
.top-season .season-pill:active { transform: scale(0.97); }
.season-emoji { font-size: 14px; }
.season-icon { width: 20px; height: 20px; vertical-align: middle; margin-right: 4px; }
.season-next {
  font-size: 11px;
  color: #7a7a7a;
  border-left: 1px solid #c8b89a;
  padding-left: 6px;
  margin-left: 2px;
  font-weight: 500;
  transition: color 0.2s ease;
}
.top-season .season-pill:hover .season-next { color: #4a7c59; }

/* ===== 货币状态栏 ===== */
.currency-bar {
  display: flex;
  gap: 10px;
  justify-content: space-between;
  flex-wrap: wrap;
}
.cur-item {
  flex: 1;
  min-width: 90px;
  display: flex; align-items: center; gap: 6px;
  background: #fafaf5;
  border: 1.5px solid #d4c9b8;
  border-radius: 12px;
  padding: 8px 12px;
  transition: all 0.2s ease;
}
.cur-item:hover { transform: translateY(-1px); }
.cur-ic { width: 20px; height: 20px; }                /* ⬆ 18→20 */
.cur-val { font-size: 16px; font-weight: 700; color: #4a7c59; }
.cur-label { font-size: 12px; color: #7a7a7a; }

/* ===== 场景卡片 ===== */
.scene-card {
  background: #fafaf5;
  border: 1.5px solid #d4c9b8;
  border-radius: 16px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.scene-header {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 8px;
}
.scene-title { font-size: 14px; font-weight: 600; color: #4a7c59; }
.scene-sub { font-size: 12px; color: #7a7a7a; }

/* ===== 种子按钮区 ===== */
.seed-bar {
  background: #fafaf5;
  border: 1.5px solid #d4c9b8;
  border-radius: 12px;
  padding: 10px 12px;
}
.seed-title {
  font-size: 12px; color: #7a7a7a; margin-bottom: 8px;
}
.seed-list { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.seed-btn {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: #eaf4eb;
  border: 1.5px solid #c8b89a;
  display: flex; align-items: center; justify-content: center;
  padding: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  overflow: hidden;                                   /* 防 28px 图标溢出 */
}
.seed-btn:hover { transform: scale(1.05); }
.seed-btn.active {
  border-color: #4a7c59;
  background: #d6e9d8;
  box-shadow: 0 0 0 2px rgba(74, 124, 89, 0.15);
}
.seed-btn.off { opacity: 0.45; }
.seed-ic { width: 28px; height: 28px; object-fit: contain; }   /* ⬆ 26→28 */
.seed-empty { font-size: 12px; color: #7a7a7a; padding: 4px; }

/* ===== 底部主按钮 ===== */
.bottom-bar {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.primary-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: linear-gradient(135deg, #4a7c59, #6a9e7a);
  color: #fff;
  border: none;
  border-radius: 20px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}
.primary-btn:hover { filter: brightness(1.1); transform: scale(1.03); }
.primary-btn:active { transform: scale(0.98); }
.btn-ic { width: 20px; height: 20px; object-fit: contain; }     /* ⬆ 18→20 */
.toggle-wh { color: #4a7c59 !important; font-size: 13px !important; }

/* ===== 仓库详情 ===== */
.warehouse-card {
  background: #fafaf5;
  border: 1.5px solid #d4c9b8;
  border-radius: 12px;
  padding: 10px 12px;
}
.wh-title { font-size: 13px; color: #4a7c59; font-weight: 600; margin-bottom: 8px; }
.wh-empty { font-size: 12px; color: #7a7a7a; padding: 4px 0; }
.wh-list { display: flex; flex-wrap: wrap; gap: 8px; }
.wh-item {
  display: flex; align-items: center; gap: 4px;
  background: #fff;
  border: 1px solid #e8ddd0;
  border-radius: 10px;
  padding: 4px 8px;
}
.wh-ic { width: 24px; height: 24px; object-fit: contain; }       /* ⬆ 20→24 */
.wh-name { font-size: 12px; color: #3d3d3d; }
.wh-qty { font-size: 12px; color: #4a7c59; font-weight: 600; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ===== 右区:科技研发 ===== */
.tech-header {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 12px;
  padding: 8px 14px;
  border: 1px solid rgba(212, 201, 184, 0.6);
}
.tech-title { font-size: 16px; font-weight: 700; color: #3d3d3d; }
.tech-sub { font-size: 12px; color: #7a7a7a; margin-top: 4px; }

.tech-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.tech-card {
  position: relative;
  background: #fafaf5;
  border: 1.5px solid #d4c9b8;
  border-radius: 12px;
  padding: 12px;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  text-align: center;
  transition: all 0.2s ease;
  overflow: hidden;
}
.tech-card:hover { transform: translateY(-1px); }
.tech-card.unlocked {
  border-color: #4a7c59;
}
.tech-card.unlocked::after {
  content: '';
  position: absolute; inset: 0;
  background: rgba(74, 124, 89, 0.08);
  pointer-events: none;
}
.tech-mask {
  position: absolute; inset: 0;
  background: rgba(120, 120, 120, 0.18);
  pointer-events: none;
  z-index: 1;
}
.tech-ic { width: 36px; height: 36px; object-fit: contain; position: relative; z-index: 2; }   /* ⬇ 48→36(按需求) */
.tech-name { font-size: 12px; font-weight: 600; color: #3d3d3d; position: relative; z-index: 2; margin-top: 2px; }
.tech-desc { font-size: 11px; color: #7a7a7a; line-height: 1.3; position: relative; z-index: 2; }
.tech-status { font-size: 11px; position: relative; z-index: 2; margin-top: 2px; }
.ts-ok { color: #4a7c59; font-weight: 600; }
.ts-lock { color: #7a7a7a; }

.progress-block {
  display: flex; flex-direction: column; gap: 10px;
  background: #fafaf5;
  border: 1.5px solid #d4c9b8;
  border-radius: 12px;
  padding: 12px;
}
.prog-row { display: flex; flex-direction: column; gap: 4px; }
.prog-label { font-size: 12px; color: #7a7a7a; }

.tech-bottom { display: flex; justify-content: flex-end; margin-top: auto; }

/* ===== 共用 ===== */
.ui-ic-xs { width: 14px; height: 14px; margin: 0 2px; vertical-align: middle; }

/* ===== 全局图标放大(1.2× 基线) ===== */
img[src*="assets/icons"] {
  /* 基线声明,各区域用更具体类名覆盖 */
}

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .farm-container { flex-direction: column; }
  .left-zone, .right-zone { flex: 1; }
}

/* ===== 小镇升级弹窗样式(作用域内描述与按钮) ===== */
.levelup-body {
  font-size: 15px;
  color: #3d3d3d;
  line-height: 1.8;
  white-space: pre-wrap;
  margin-bottom: 16px;
  transition: all 0.2s ease;
}
.levelup-confirm {
  border-radius: 20px !important;
  padding: 8px 28px !important;
  font-weight: 600 !important;
  background: linear-gradient(135deg, #4a7c59, #6a9e7a) !important;
  border: none !important;
  color: #fff !important;
  transition: all 0.2s ease;
}
.levelup-confirm:hover { filter: brightness(1.1); }
.levelup-confirm:active { transform: scale(0.98); }
</style>

<style>
/* ===== 全局:小镇升级弹窗外壳(header/body) ===== */
.levelup-dialog {
  border-radius: 16px !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08) !important;
  overflow: hidden;
}
.levelup-dialog .el-dialog__header {
  background: #f5f0e8;
  border-bottom: 1.5px solid #d4c9b8;
  padding: 14px 20px;
}
.levelup-dialog .el-dialog__title {
  font-size: 16px;
  font-weight: 700;
  color: #3d3d3d;
  line-height: 1.4;
}
.levelup-dialog .el-dialog__body {
  padding: 20px;
  background: #ffffff;
}
.levelup-dialog .el-dialog__footer {
  padding: 0 20px 16px;
  background: #ffffff;
  text-align: right;
}
</style>
