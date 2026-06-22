<template>
  <div class="farm-container">
    <!-- 顶部:等级 + 金币 + 经验 + 农具 + 进度 -->
    <div class="panel top-bar">
      <div class="top-left">
        <span class="lv">
          <img :src="$ic('ui_level')" class="ui-ic" alt="lv"/>
          Lv{{ store.level }} · {{ levelCfg.stageName }}
        </span>
        <span class="coin">
          <img :src="$ic('ui_gold')" class="ui-ic" alt="gold"/>
          累计金币: {{ store.totalGold }}
        </span>
        <span class="exp">
          <img :src="$ic('ui_bonus')" class="ui-ic" alt="exp"/>
          累计经验: {{ store.totalExp }}
        </span>
      </div>
      <div class="top-right">
        <span class="season">{{ seasonEmoji }} 季节: {{ store.currentSeason }}</span>
        <el-button size="small" @click="onSwitchSeason">切换季节(下季)</el-button>
        <span class="tool">
          <img :src="$ic('ui_level')" class="ui-ic" alt="tool"/>
          当前农具: {{ currentTool }}
        </span>
        <span class="bonus">
          <img :src="$ic('ui_bonus')" class="ui-ic" alt="bonus"/>
          产量加成: x{{ yieldBonusText }}
        </span>
        <span class="wh">
          <img :src="$ic('ui_warehouse')" class="ui-ic" alt="wh"/>
          仓库: {{ warehouseCount }} 件
        </span>
      </div>
      <div class="progress" v-if="nextCfg">
        <div class="prog-text">
          下一级 Lv{{ nextCfg.level }} · {{ nextCfg.stageName }}
          需 <img :src="$ic('ui_gold')" class="ui-ic-xs" alt="g"/>
          {{ nextCfg.needGold }}
          <img :src="$ic('ui_bonus')" class="ui-ic-xs" alt="e"/>
          {{ nextCfg.needExp }}
        </div>
        <div class="prog-bar">
          <div class="prog-gold" :style="{ width: goldPct + '%' }"></div>
          <div class="prog-exp"  :style="{ width: expPct + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- 中间:农田 -->
    <div class="panel">
      <FarmGrid ref="farmRef" />
    </div>

    <!-- 底部:操作 -->
    <div class="panel bottom-bar">
      <el-button class="btn" @click="onAnswer">
        <img :src="$ic('btn_quiz')" class="btn-ics" alt="q"/>
        答题解锁农具
      </el-button>
      <el-button class="btn" @click="onSell">
        <img :src="$ic('btn_shop')" class="btn-ics" alt="s"/>
        一键售卖仓库
      </el-button>
      <el-button class="btn orange" @click="onHarvestAll">
        <img :src="$ic('btn_harvest')" class="btn-ics" alt="h"/>
        一键收割
      </el-button>
      <el-button class="btn gray" @click="onReset">
        <img :src="$ic('btn_speed')" class="btn-ics" alt="r"/>
        重置存档
      </el-button>
    </div>

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

    <!-- 升级文案弹窗:每级只弹一次 -->
    <el-dialog
      v-model="showLevelUpDesc"
      title="小镇升级"
      width="420px"
      :show-close="false"
      :close-on-click-modal="false"
    >
      <p style="white-space:pre-wrap;line-height:1.6">{{ curLevelUpDesc }}</p>
      <template #footer>
        <el-button type="primary" @click="onCloseLevelUp">继续冒险</el-button>
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

// 统一图标工具:基于当前文件 src/App.vue → src/assets/icons/
const $ic = (n) => new URL(`./assets/icons/${n}.png`, import.meta.url).href

const farmRef = ref(null)
const answerRef = ref(null)
const sellDlg = ref(false)
const lastSell = ref(null)
let tickTimer = null

// 升级文案弹窗
const showLevelUpDesc = ref(false)
const curLevelUpDesc = ref('')
const shownLevelDescs = ref(new Set())

// 季节 emoji 映射
const SEASON_EMOJI = { '春': '🌸', '夏': '☀️', '秋': '🍂', '冬': '❄️' }
const seasonEmoji = computed(() => SEASON_EMOJI[store.currentSeason] || '🌸')

// 向下提供当前季节
provide('currentSeason', computed(() => store.currentSeason))
// 同步把 $ic 提供给后代组件
provide('$ic', $ic)

const levelCfg = computed(() => getLevelCfg(level.value))
const nextCfg = computed(() => getNextLevelCfg(level.value))

const warehouseCount = computed(() =>
  (store.warehouse || []).reduce((s, w) => s + (w.qty || 0), 0)
)
const yieldBonusText = computed(() => yieldBonus.value.toFixed(2))

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

// 切换季节(循环:春→夏→秋→冬→春)
function onSwitchSeason() {
  store.currentSeason = nextSeason(store.currentSeason)
  saveStore()
}

// 升级文案弹窗:每级只弹一次
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
.top-bar { display: flex; flex-direction: column; gap: 6px; }
.top-left, .top-right { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.lv, .coin, .exp, .season, .tool, .bonus, .wh { font-size: 15px; display: inline-flex; align-items: center; }
.progress { width: 100%; }
.prog-text { font-size: 12px; color: #666; margin-bottom: 4px; display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.prog-bar { position: relative; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
.prog-gold { position: absolute; left: 0; top: 0; bottom: 0; background: #e6a23c; width: 0; }
.prog-exp  { position: absolute; left: 0; top: 0; bottom: 0; background: #67c23a; width: 0; opacity: .55; }
.bottom-bar { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.bottom-bar .btn { display: inline-flex; align-items: center; }

/* 图标尺寸统一样式 */
.ui-ic    { width: 16px; height: 16px; margin-right: 3px; vertical-align: middle; }
.ui-ic-xs { width: 14px; height: 14px; margin: 0 2px; vertical-align: middle; }
.btn-ics  { width: 14px; height: 14px; margin-right: 4px; vertical-align: middle; }
</style>
