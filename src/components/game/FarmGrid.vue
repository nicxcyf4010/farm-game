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
              popper-class="crop-tooltip"
            >
              <img
                :src="ic(cropIconKey(cell))"
                :alt="cell.name || 'crop'"
                class="cell-crop-img"
              />
            </el-tooltip>
            <span v-else>{{ cropIconOf(cell) }}</span>
          </template>
        </div>
        <div class="cell-sub">
          <template v-if="cell.status === 'growing'">
            <span class="cn">{{ cell.name }}</span>
            <span class="t">{{ remain(cell) }}s</span>
          </template>
          <template v-else-if="cell.status === 'ripe'">
            <span class="cn">{{ cell.name }}</span>
            <span class="t ripe-t">可收获</span>
          </template>
          <template v-else>
            <span class="cn dim">空地</span>
          </template>
        </div>
      </div>
    </div>

    <!-- 内嵌作物选择弹窗(原 BaseDialog 风格) -->
    <el-dialog
      v-model="plantDlg"
      title="选择作物"
      width="460px"
      :close-on-click-modal="false"
      custom-class="crop-pick-dialog"
      @close="onClosePlant"
    >
      <div class="crop-list">
        <el-tooltip
          v-for="c in availableCrops"
          :key="c.id"
          :content="c.description || c.name"
          placement="top"
          effect="light"
          popper-class="crop-tooltip"
        >
          <div
            class="crop-item"
            :class="{
              disabled: !isInSeasonNow(c),
              active: pendingCropId === c.id
            }"
            @click="onPick(c)"
          >
            <img
              :src="ic(c.icon)"
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
      <template #footer>
        <el-button @click="onClosePlant" class="crop-cancel">取消</el-button>
        <el-button
          type="primary"
          :disabled="pendingCropId < 0"
          @click="onConfirm"
          class="crop-action"
        >确定种植</el-button>
      </template>
    </el-dialog>

    <!-- 内嵌 AnswerModal:弹窗显示答题/作物信息 -->
    <el-dialog
      v-model="answerVisible"
      :title="`Lv${targetLevel} 智慧农具考核`"
      width="540px"
      :close-on-click-modal="false"
      :show-close="submitted"
      custom-class="answer-dialog"
      @close="onAnswerClose"
    >
      <div v-if="!submitted" class="q-wrap">
        <div class="q-meta">
          <span>第 {{ idx + 1 }} / {{ list.length }} 题</span>
          <span class="topic-line">
            <img :src="ic(getTopicIcon(current.topic))" class="topic-ic" :alt="current.topic || ''"/>
            主题: {{ current.topic }} · 难度 {{ current.difficulty }} · 经验 +{{ current.expReward }}
          </span>
        </div>
        <div class="q-title">
          <img :src="ic(getTopicIcon(current.topic))" class="topic-ic" :alt="current.topic || ''"/>
          {{ current.question }}
        </div>
        <el-radio-group v-model="answers[idx]" class="q-opts">
          <el-radio
            v-for="(opt, i) in current.options"
            :key="i"
            :value="String.fromCharCode(65 + i)"
          >
            {{ String.fromCharCode(65 + i) }}. {{ opt }}
          </el-radio>
        </el-radio-group>
        <div class="q-nav">
          <el-button size="small" :disabled="idx === 0" @click="idx--">上一题</el-button>
          <el-button size="small" :disabled="idx === list.length - 1" @click="idx++">下一题</el-button>
        </div>
      </div>

      <div v-else class="r-wrap">
        <p>本次答对 <b>{{ correctCount }}</b> / {{ list.length }} 题</p>
        <p>正确率: <b>{{ rateText }}</b></p>
        <p v-if="passed" class="ok">
          🎉 通过!已解锁科技 <b>{{ techName }}</b>
          <span v-if="techReward">  →  {{ techName }}</span>
        </p>
        <p v-else class="fail">❌ 未达标(需 ≥ 70%),继续种菜攒金币再来挑战</p>

        <div v-if="wrongList.length" class="wrong">
          <p class="wt">错题解析:</p>
          <div v-for="(w, i) in wrongList" :key="i" class="wrong-item">
            <div class="wq">
              <img :src="ic(getTopicIcon(w.q.topic))" class="topic-ic" :alt="w.q.topic || ''"/>
              {{ i + 1 }}. {{ w.q.question }}
            </div>
            <div class="wh">正确答案: {{ w.q.answer }} · {{ w.q.topic }} · {{ w.hint }}</div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button v-if="!submitted" @click="onAnswerClose">取消</el-button>
        <el-button v-if="!submitted" type="primary" @click="onSubmit">提交</el-button>
        <el-button v-else type="primary" @click="onAnswerClose">知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import crops from '../../assets/data/cropList.json'
import questionBank from '../../assets/data/questionBank.json'
import { store, level, saveStore } from '../../utils/gameStore.js'
import {
  calcHarvestYield, calcHarvestExp, getEffectiveGrowTime,
  applyTechEffects, isInSeason, pushToWarehouse,
  pickByLevelAndDifficulty, isPassed, getLevelCfg, getTechById
} from '../../utils/game.js'

// 自身 $ic
const selfIc = (n) => new URL(`../../assets/icons/${n}.png`, import.meta.url).href
// 兼容父组件 App.vue 提供的 $ic
const injectedIc = inject('$ic', null)
const ic = injectedIc || selfIc

function initFields() {
  if (store.fields.length !== 36) {
    store.fields = Array.from({ length: 36 }, () => ({ status: 'empty' }))
  }
}
initFields()
const fields = computed(() => store.fields)

const currentSeasonRef = inject('currentSeason')
const currentSeason = computed(() => currentSeasonRef?.value || '春')

// 父组件传入的选中种子(可选)
const injectedSelectedSeed = inject('selectedSeedId', null)
const selectedSeedId = injectedSelectedSeed || ref(null)

const plantDlg = ref(false)
const pendingIdx = ref(-1)
const pendingCropId = ref(-1)
let timer = null

const availableCrops = computed(() =>
  crops.filter(c => (c.unlockLevel || 1) <= level.value)
)

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
  // 优先使用父组件传入的选中种子
  if (selectedSeedId.value != null) {
    const c = crops.find(x => x.id === selectedSeedId.value)
    if (c) {
      if (!isInSeasonNow(c)) { alert('该作物非当季,需温室大棚'); return }
      confirmPlant(c); return
    }
  }
  pendingCropId.value = -1
  plantDlg.value = true
}

function onPick(c) {
  if (!isInSeasonNow(c)) {
    alert('该作物非当季,需温室大棚')
    return
  }
  pendingCropId.value = c.id
}
function onConfirm() {
  if (pendingCropId.value < 0) return
  const c = crops.find(x => x.id === pendingCropId.value)
  if (c) confirmPlant(c)
}
function onClosePlant() {
  plantDlg.value = false
  pendingIdx.value = -1
  pendingCropId.value = -1
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
  pendingCropId.value = -1
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
function harvestAll() {
  for (let i = 0; i < fields.value.length; i++) {
    if (fields.value[i].status === 'ripe') harvest(i)
  }
}

// ===== 内嵌 AnswerModal 逻辑 =====
const answerVisible = ref(false)
const targetLevel = ref(2)
const list = ref([])
const idx = ref(0)
const answers = ref([])
const submitted = ref(false)
const correctCount = ref(0)
const passed = ref(false)
const wrongList = ref([])

const topicIconMap = {
  '节水灌溉': 'topic_water',
  '绿色种植': 'topic_green',
  '智慧农机': 'topic_smart',
  '耕地保护': 'topic_land',
  '作物常识': 'topic_crop',
  '乡村环保': 'topic_env',
  '乡村振兴政策': 'topic_policy',
  '养殖知识': 'topic_animal',
  '气候与农业': 'topic_climate',
  '数字乡村与电商': 'topic_digital'
}
const getTopicIcon = (topicName) => topicIconMap[topicName] || 'topic_water'

const current = computed(() => list.value[idx.value] || {})
const rateText = computed(() =>
  list.value.length
    ? Math.round((correctCount.value / list.value.length) * 100) + '%'
    : '0%'
)
const techReward = computed(() => getLevelCfg(targetLevel.value)?.unlockTechQuiz || null)
const techName = computed(() => {
  const id = techReward.value?.techReward
  return id ? (getTechById(id)?.name || id) : ''
})

function resetAnswer() {
  list.value = pickByLevelAndDifficulty(questionBank, targetLevel.value, 5)
  idx.value = 0
  answers.value = list.value.map(() => '')
  submitted.value = false
  correctCount.value = 0
  passed.value = false
  wrongList.value = []
}
function startAnswer(level) {
  targetLevel.value = level
  resetAnswer()
  answerVisible.value = true
}
function onAnswerClose() {
  answerVisible.value = false
  submitted.value = false
  list.value = []
}
function onSubmit() {
  const unanswered = answers.value.findIndex(a => !a)
  if (unanswered >= 0) {
    alert(`第 ${unanswered + 1 } 题未作答`)
    idx.value = unanswered
    return
  }
  let cnt = 0
  const wrong = []
  list.value.forEach((q, i) => {
    if (answers.value[i] === q.answer) cnt++
    else wrong.push({ q, hint: q.hint || '暂无提示' })
  })
  correctCount.value = cnt
  passed.value = isPassed(cnt, list.value.length)
  wrongList.value = wrong

  if (passed.value) {
    if (!store.passedLevels.includes(targetLevel.value)) {
      store.passedLevels.push(targetLevel.value)
    }
    const tr = techReward.value
    if (tr?.techReward && !store.unlockedTechs.includes(tr.techReward)) {
      store.unlockedTechs.push(tr.techReward)
    }
  }
  saveStore()
  submitted.value = true
}

// 对外暴露:父组件通过 ref 调用
function plantBySeed(seedId) {
  if (!seedId) {
    // 没有选中种子:尝试种到第一个空格并打开弹窗
    const i = fields.value.findIndex(c => c.status === 'empty')
    if (i < 0) { alert('没有空地了'); return }
    pendingIdx.value = i
    pendingCropId.value = -1
    plantDlg.value = true
    return
  }
  const c = crops.find(x => x.id === seedId)
  if (!c) { alert('未知种子'); return }
  if (!isInSeasonNow(c)) { alert('该作物非当季,需温室大棚'); return }
  const i = fields.value.findIndex(ce => ce.status === 'empty')
  if (i < 0) { alert('没有空地了'); return }
  pendingIdx.value = i
  confirmPlant(c)
}
defineExpose({ harvestAll, plantBySeed, startAnswer })

onMounted(() => { timer = setInterval(tick, 1000) })
onUnmounted(() => { clearInterval(timer) })
</script>

<style scoped>
.farm-panel { width: 100%; }
.farm-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}
.cell {
  aspect-ratio: 1 / 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  cursor: pointer; user-select: none;
  border: 2px solid #c8b89a;
  border-radius: 8px;
  background: #e8ddd0;
  font-size: 12px;
  color: #3d3d3d;
  transition: all 0.2s ease;
  overflow: hidden;
}
.cell:hover { transform: translateY(-1px); }
.cell.empty { color: #7a7a7a; }
.cell.sown { background: #d6e0b8; color: #3d3d3d; }
.cell.growing { background: #b9d4a3; }
.cell.ripe { background: #f4d18a; }
.cell-main { font-size: 22px; line-height: 1; }
.cell-sub { margin-top: 4px; display: flex; flex-direction: column; align-items: center; gap: 2px; line-height: 1.2; }
.cell-sub .cn { font-size: 12px; }
.cell-sub .cn.dim { color: #7a7a7a; }
.cell-sub .t { font-size: 11px; color: #7a7a7a; }
.cell-sub .ripe-t { color: #b07a2b; font-weight: 600; }

.crop-list { display: flex; flex-direction: column; gap: 6px; }
.crop-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px; border: 1px solid #ebeef5; border-radius: 8px; cursor: pointer;
  background: #fff;
  transition: all 0.2s ease;
}
.crop-item:hover { background: #f0f9eb; }
.crop-item.active {
  background: #eaf4eb;
  border-color: #4a7c59;
}
.crop-item.disabled { opacity: .55; cursor: not-allowed; }
.crop-item.disabled:hover { background: transparent; }
.crop-icon-img {
  width: 26px; height: 26px; object-fit: contain; flex-shrink: 0; margin-right: 8px;  /* ⬆ 22→26 */
}
.crop-info { flex: 1; }
.row1 { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.crop-name { font-weight: 600; color: #3d3d3d; }
.crop-tag { font-size: 11px; color: #7a7a7a; border: 1px solid #d4c9b8; border-radius: 4px; padding: 0 5px; background: #fafaf5; }
.crop-tag.off { color: #b56b6b; border-color: #e8c8c8; background: #fbeeee; }
.row2 { font-size: 12px; color: #606266; margin-top: 2px; }
.row3 { font-size: 12px; color: #7a7a7a; margin-top: 2px; }
.empty-tip { color: #7a7a7a; text-align: center; padding: 12px; }

.cell-crop-img { width: 24px; height: 24px; object-fit: contain; }    /* ⬇ 28→24(防 tooltip 遮挡) */

/* ===== AnswerModal 内嵌样式 ===== */
.q-wrap, .r-wrap { font-size: 14px; color: #3d3d3d; }
.q-meta {
  display: flex; justify-content: space-between; color: #7a7a7a; margin-bottom: 8px;
  gap: 8px; flex-wrap: wrap;
}
.topic-line { display: inline-flex; align-items: center; }
.q-title {
  font-weight: 500; margin-bottom: 12px; line-height: 1.5;
  display: flex; align-items: flex-start; gap: 6px;
}
.q-opts { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.q-nav { display: flex; gap: 8px; margin-top: 12px; }
.r-wrap p { margin: 6px 0; }
.r-wrap .ok { color: #4a7c59; font-weight: 600; }
.r-wrap .fail { color: #b56b6b; }
.wrong { margin-top: 12px; border-top: 1px solid #e8ddd0; padding-top: 8px; }
.wt { font-weight: 600; margin-bottom: 6px; color: #3d3d3d; }
.wrong-item { margin-bottom: 6px; }
.wq {
  font-size: 13px;
  display: flex; align-items: flex-start; gap: 6px;
}
.wh { font-size: 12px; color: #7a7a7a; margin-top: 2px; }
.topic-ic { width: 22px; height: 22px; margin-right: 4px; vertical-align: middle; flex-shrink: 0; }   /* ⬆ 18→22 */

/* ===== 呼吸动画(已播种/生长中) ===== */
@keyframes breathe {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.7; }
}
.cell.sown img,
.cell.growing img {
  animation: breathe 2s infinite;
}

/* ===== 弹窗 footer 按钮(莫兰迪) ===== */
.crop-action {
  border-radius: 20px !important;
  padding: 8px 24px !important;
  font-weight: 600 !important;
  background: linear-gradient(135deg, #4a7c59, #6a9e7a) !important;
  border: none !important;
  color: #fff !important;
  transition: all 0.2s ease;
}
.crop-action:hover { filter: brightness(1.1); }
.crop-action:active { transform: scale(0.98); }

.crop-cancel {
  border-radius: 20px !important;
  padding: 8px 24px !important;
  font-weight: 600 !important;
  border: 1.5px solid #d4c9b8 !important;
  background: #fff !important;
  color: #7a7a7a !important;
  transition: all 0.2s ease;
}
.crop-cancel:hover { border-color: #4a7c59 !important; color: #4a7c59 !important; }
</style>

<style>
/* 全局:弹窗圆角 + 莫兰迪风(非 scoped,作用于 el-dialog 根元素) */
.crop-pick-dialog,
.answer-dialog {
  border-radius: 16px !important;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important;
}
.crop-pick-dialog .el-dialog__header,
.answer-dialog .el-dialog__header {
  background: #f5f0e8;
  border-bottom: 1.5px solid #d4c9b8;
  padding: 14px 20px;
}
.crop-pick-dialog .el-dialog__title,
.answer-dialog .el-dialog__title {
  color: #4a7c59;
  font-weight: 700;
  font-size: 16px;
}
.crop-pick-dialog .el-dialog__body,
.answer-dialog .el-dialog__body {
  background: #ffffff;
  padding: 20px;
}
.crop-pick-dialog .el-dialog__footer,
.answer-dialog .el-dialog__footer {
  background: #ffffff;
  border-top: 1px solid #f0ebe3;
  padding: 12px 20px 16px;
}
.crop-pick-dialog .el-dialog__headerbtn,
.answer-dialog .el-dialog__headerbtn {
  top: 14px;
  right: 16px;
}
.crop-pick-dialog .el-dialog__close,
.answer-dialog .el-dialog__close {
  color: #7a7a7a;
  transition: all 0.2s ease;
}
.crop-pick-dialog .el-dialog__close:hover,
.answer-dialog .el-dialog__close:hover {
  color: #3d3d3d;
}

/* 作物悬停 tooltip 浮层 */
.crop-tooltip {
  background: #fafaf5 !important;
  border: 1.5px solid #d4c9b8 !important;
  border-radius: 12px !important;
  padding: 10px 14px !important;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06) !important;
  transition: all 0.2s ease;
}
.crop-tooltip .el-tooltip__content {
  font-size: 13px;
  color: #3d3d3d;
  line-height: 1.6;
  background: transparent !important;
}
.crop-tooltip .popper__arrow,
.crop-tooltip .popper__arrow::before {
  border-color: #d4c9b8 !important;
}
</style>
