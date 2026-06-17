<template>
  <svg :class="svgClass" :style="svgStyle" aria-hidden="true">
    <use :href="symbolHref" />
  </svg>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    iconName?: string
    iconClass?: string
    className?: string
    color?: string
    size?: string | number
  }>(),
  {
    className: '',
    color: '',
    size: '',
  }
)

const resolvedIconName = computed(() => props.iconName || props.iconClass || '')
const symbolHref = computed(() => (resolvedIconName.value ? `#icon-${resolvedIconName.value}` : ''))
const svgClass = computed(() => ['svg-icon', props.className].filter(Boolean))
const svgStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.color) style.color = props.color
  if (props.size) {
    const size = typeof props.size === 'number' ? `${props.size}px` : props.size
    style.width = size
    style.height = size
  }
  return style
})

async function warnMissingIcon() {
  if (!import.meta.env.DEV) return
  await nextTick()
  if (!resolvedIconName.value) {
    console.warn('[SvgIcon] 缺少图标名，请使用 icon-name 或 icon-class')
    return
  }
  if (!document.getElementById(`icon-${resolvedIconName.value}`)) {
    console.warn(`[SvgIcon] 未找到图标: ${resolvedIconName.value}`)
  }
}

onMounted(warnMissingIcon)
watch(resolvedIconName, warnMissingIcon)
</script>

<style scoped>
.svg-icon {
  width: 1em;
  height: 1em;
  position: relative;
  fill: currentColor;
  color: inherit;
  vertical-align: -2px;
}
</style>
