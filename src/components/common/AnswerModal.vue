<template>
  <el-dialog
    v-model="visible"
    :title="`Lv${targetLevel} 智慧农具考核`"
    width="480px"
    :close-on-click-modal="false"
    :show-close="submitted"
    custom-class="answer-dialog"
    @close="onClose"
  >
    <div v-if="!submitted" class="q-wrap">
      <div class="q-meta">
        <span>第 {{ idx + 1 }} / {{ list.length }} 题</span>
        <span class="topic-line">
          <span class="topic-tag">{{ current.topic || '综合' }}</span>
          <span class="diff-tag" :class="diffClass(current.difficulty)">
            {{ diffText(current.difficulty) }}
          </span>
          <span class="meta-exp">经验 +{{ current.expReward }}</span>
        </span>
      </div>
      <div class="q-title">
        <img :src="getTopicIcon(current.topic)" class="topic-ic" :alt="current.topic || ''"/>
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
      <p class="r-line">本次答对 <b>{{ correctCount }}</b> / {{ list.length }} 题</p>
      <p class="r-line">正确率: <b>{{ rateText }}</b></p>
      <p v-if="passed" class="ok">
        🎉 通过!已解锁科技 <b>{{ techName }}</b>
        <span v-if="techReward">  →  {{ techName }}</span>
      </p>
      <p v-else class="fail">❌ 未达标(需 ≥ 70%),继续种菜攒金币再来挑战</p>

      <div v-if="wrongList.length" class="wrong">
        <p class="wt">错题解析:</p>
        <div v-for="(w, i) in wrongList" :key="i" class="wrong-item">
          <div class="wq">
            <img :src="getTopicIcon(w.q.topic)" class="topic-ic" :alt="w.q.topic || ''"/>
            {{ i + 1 }}. {{ w.q.question }}
          </div>
          <div class="wh">正确答案: {{ w.q.answer }} · {{ w.q.topic }} · {{ w.hint }}</div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button v-if="!submitted" @click="onClose" class="ghost-btn">取消</el-button>
      <el-button v-if="!submitted" type="primary" @click="onSubmit" class="primary-action">提交</el-button>
      <el-button v-else type="primary" @click="onClose" class="primary-action">知道了</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import questionBank from '../../assets/data/questionBank.json'
import { store, saveStore } from '../../utils/gameStore.js'
import { pickByLevelAndDifficulty, isPassed, getLevelCfg, getTechById } from '../../utils/game.js'

// ---- 主题 -> 图标 key 映射 ----
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
// AnswerModal.vue 在 src/components/common/,向上两级到 src/assets/icons/
const getTopicIcon = (topicName) =>
  new URL(`../../assets/icons/${topicIconMap[topicName] || 'topic_water'}.png`, import.meta.url).href

// 难度 -> 文案 / 样式
function diffText(d) {
  const v = Number(d) || 1
  if (v >= 3) return '困难'
  if (v >= 2) return '中等'
  return '简单'
}
function diffClass(d) {
  const v = Number(d) || 1
  if (v >= 3) return 'diff-hard'
  if (v >= 2) return 'diff-mid'
  return 'diff-easy'
}

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'passed'])

const visible = ref(props.modelValue)
watch(() => props.modelValue, v => (visible.value = v))
watch(visible, v => emit('update:modelValue', v))

const targetLevel = ref(2)
const list = ref([])
const idx = ref(0)
const answers = ref([])
const submitted = ref(false)
const correctCount = ref(0)
const passed = ref(false)
const wrongList = ref([])

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

function reset() {
  list.value = pickByLevelAndDifficulty(questionBank, targetLevel.value, 5)
  idx.value = 0
  answers.value = list.value.map(() => '')
  submitted.value = false
  correctCount.value = 0
  passed.value = false
  wrongList.value = []
}

function start(level) {
  targetLevel.value = level
  reset()
  visible.value = true
}
defineExpose({ start })

function onSubmit() {
  const unanswered = answers.value.findIndex(a => !a)
  if (unanswered >= 0) {
    alert(`第 ${unanswered + 1} 题未作答`)
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
  if (passed.value) emit('passed', { level: targetLevel.value, tech: techReward.value?.techReward })
}

function onClose() {
  visible.value = false
  submitted.value = false
  list.value = []
}
</script>

<style scoped>
/* ===== 题卡 ===== */
.q-wrap, .r-wrap { font-size: 14px; color: #3d3d3d; }

.q-meta {
  display: flex; justify-content: space-between; color: #7a7a7a;
  margin-bottom: 10px; gap: 8px; flex-wrap: wrap;
}
.topic-line { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.meta-exp { font-size: 12px; color: #7a7a7a; }

/* 主题标签(节水灌溉等) */
.topic-tag {
  display: inline-block;
  border-radius: 8px;
  padding: 2px 10px;
  font-size: 12px;
  background: #f0ebe3;
  color: #7a7a7a;
  transition: all 0.2s ease;
}

/* 难度标签(简单/中等/困难) */
.diff-tag {
  display: inline-block;
  border-radius: 8px;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
}
.diff-easy { background: #eaf4eb; color: #4a7c59; }
.diff-mid  { background: #fff3cd; color: #8a6d3b; }
.diff-hard { background: #f8d7da; color: #b14a4a; }

/* 题目文字 */
.q-title {
  font-size: 15px;
  font-weight: 600;
  color: #3d3d3d;
  line-height: 1.6;
  margin-bottom: 10px;
  display: flex; align-items: flex-start; gap: 6px;
}

/* 选项区 */
.q-opts {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

/* 导航 */
.q-nav { display: flex; gap: 8px; margin-top: 12px; }

/* ===== 结果区 ===== */
.r-wrap p { margin: 6px 0; }
.r-line { text-align: center; }
.r-wrap .ok {
  color: #4a7c59;
  font-weight: 600;
  text-align: center;
  margin-top: 12px;
}
.r-wrap .fail {
  color: #b14a4a;
  font-weight: 600;
  text-align: center;
  margin-top: 12px;
}

/* 错题 */
.wrong { margin-top: 12px; border-top: 1px solid #e8ddd0; padding-top: 8px; }
.wt { font-weight: 600; margin-bottom: 6px; color: #3d3d3d; }
.wrong-item { margin-bottom: 6px; }
.wq {
  font-size: 13px;
  display: flex; align-items: flex-start; gap: 6px;
}
.wh { font-size: 12px; color: #7a7a7a; margin-top: 2px; }

/* 主题图标(与 FarmGrid 内嵌弹窗保持一致) */
.topic-ic {
  width: 18px; height: 18px;
  margin-right: 4px;
  vertical-align: middle;
  flex-shrink: 0;
}

/* ===== 题目卡片化(给"做题区"整体卡片视觉) ===== */
.q-wrap {
  background: #fafaf5;
  border: 1.5px solid #e8ddd0;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 4px;
  transition: all 0.2s ease;
}

/* ===== 自定义按钮(主操作 / 取消) ===== */
.primary-action {
  border-radius: 20px !important;
  padding: 8px 24px !important;
  font-weight: 600 !important;
  background: linear-gradient(135deg, #4a7c59, #6a9e7a) !important;
  border: none !important;
  color: #fff !important;
  transition: all 0.2s ease;
}
.primary-action:hover { filter: brightness(1.1); }
.primary-action:active { transform: scale(0.98); }

.ghost-btn {
  border-radius: 20px !important;
  padding: 8px 24px !important;
  font-weight: 600 !important;
  border: 1.5px solid #d4c9b8 !important;
  background: #fff !important;
  color: #7a7a7a !important;
  transition: all 0.2s ease;
}
.ghost-btn:hover { border-color: #4a7c59 !important; color: #4a7c59 !important; }

/* ===== 选项(el-radio)自定义莫兰迪卡 ===== */
.q-opts :deep(.el-radio) {
  display: block;
  margin: 4px 0;
  padding: 8px 14px;
  border: 1.5px solid #d4c9b8;
  border-radius: 10px;
  background: #ffffff;
  color: #555;
  font-size: 14px;
  transition: all 0.2s ease;
  white-space: normal;
  height: auto;
  line-height: 1.5;
}
.q-opts :deep(.el-radio):hover {
  border-color: #4a7c59;
  background: #f5faf5;
}
.q-opts :deep(.el-radio.is-checked) {
  border-color: #4a7c59;
  background: #eaf4eb;
  color: #4a7c59;
  font-weight: 600;
  box-shadow: 0 0 0 2px rgba(74, 124, 89, 0.10);
}
.q-opts :deep(.el-radio__label) { padding-left: 6px; }
.q-opts :deep(.el-radio__inner) { border-color: #c8b89a; }
.q-opts :deep(.el-radio.is-checked .el-radio__inner) {
  background: #4a7c59;
  border-color: #4a7c59;
}
</style>

<style>
/* ===== 全局:弹窗外壳(header/body 圆角 + 描边) ===== */
.answer-dialog {
  border-radius: 16px !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08) !important;
  overflow: hidden;
}
.answer-dialog .el-dialog__header {
  background: #f5f0e8;
  border-bottom: 1.5px solid #d4c9b8;
  padding: 14px 20px;
  border-radius: 16px 16px 0 0;
}
.answer-dialog .el-dialog__title {
  font-size: 16px;
  font-weight: 700;
  color: #3d3d3d;
  line-height: 1.4;
}
.answer-dialog .el-dialog__body {
  padding: 20px;
  background: #ffffff;
  border-radius: 0 0 16px 16px;
}
.answer-dialog .el-dialog__footer {
  padding: 12px 20px 16px;
  background: #ffffff;
  border-top: 1px solid #f0ebe3;
  border-radius: 0 0 16px 16px;
}
.answer-dialog .el-dialog__headerbtn {
  top: 14px;
  right: 16px;
}
</style>
