<template>
  <el-dialog
    v-model="visible"
    :title="`Lv${targetLevel} 智慧农具考核`"
    width="540px"
    :close-on-click-modal="false"
    :show-close="submitted"
    @close="onClose"
  >
    <div v-if="!submitted" class="q-wrap">
      <div class="q-meta">
        <span>第 {{ idx + 1 }} / {{ list.length }} 题</span>
        <span class="topic-line">
          <img :src="getTopicIcon(current.topic)" class="topic-ic" :alt="current.topic || ''"/>
          主题: {{ current.topic }} · 难度 {{ current.difficulty }} · 经验 +{{ current.expReward }}
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
            <img :src="getTopicIcon(w.q.topic)" class="topic-ic" :alt="w.q.topic || ''"/>
            {{ i + 1 }}. {{ w.q.question }}
          </div>
          <div class="wh">正确答案: {{ w.q.answer }} · {{ w.q.topic }} · {{ w.hint }}</div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button v-if="!submitted" @click="onClose">取消</el-button>
      <el-button v-if="!submitted" type="primary" @click="onSubmit">提交</el-button>
      <el-button v-else type="primary" @click="onClose">知道了</el-button>
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
.q-wrap, .r-wrap { font-size: 14px; }
.q-meta { display: flex; justify-content: space-between; color: #666; margin-bottom: 8px; gap: 8px; flex-wrap: wrap; }
.topic-line { display: inline-flex; align-items: center; }
.q-title {
  font-weight: 500; margin-bottom: 12px; line-height: 1.5;
  display: flex; align-items: flex-start; gap: 6px;
}
.q-opts { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.q-nav { display: flex; gap: 8px; margin-top: 12px; }
.r-wrap p { margin: 6px 0; }
.r-wrap .ok { color: #000; font-weight: 500; }
.r-wrap .fail { color: #000; }
.wrong { margin-top: 12px; border-top: 1px solid #eee; padding-top: 8px; }
.wt { font-weight: 500; margin-bottom: 6px; }
.wrong-item { margin-bottom: 6px; }
.wq {
  font-size: 13px;
  display: flex; align-items: flex-start; gap: 6px;
}
.wh { font-size: 12px; color: #888; margin-top: 2px; }

/* 主题图标 */
.topic-ic { width: 18px; height: 18px; margin-right: 4px; vertical-align: middle; flex-shrink: 0; }
</style>
