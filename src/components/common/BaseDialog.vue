<template>
  <el-dialog
    v-model="visible"
    :title="title"
    :width="width"
    :close-on-click-modal="false"
    @close="onClose"
  >
    <slot />
    <template #footer>
      <slot name="footer">
        <el-button @click="onClose">关闭</el-button>
      </slot>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '提示' },
  width: { type: String, default: '420px' }
})
const emit = defineEmits(['update:modelValue', 'close'])

const visible = ref(props.modelValue)
watch(() => props.modelValue, v => (visible.value = v))
watch(visible, v => emit('update:modelValue', v))

function onClose() {
  visible.value = false
  emit('close')
}
</script>
