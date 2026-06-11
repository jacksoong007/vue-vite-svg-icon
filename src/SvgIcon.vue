<template>
  <svg :class="svgClass" :style="svgStyle" aria-hidden="true">
    <use :href="iconName" />
  </svg>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    iconClass: string
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

const iconName = computed(() => `#icon-${props.iconClass}`)
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
  if (!document.getElementById(`icon-${props.iconClass}`)) {
    console.warn(`[SvgIcon] 未找到图标: ${props.iconClass}`)
  }
}

onMounted(warnMissingIcon)
watch(() => props.iconClass, warnMissingIcon)
</script>

<style scoped lang="scss">
.svg-icon {
  width: 1em;
  height: 1em;
  position: relative;
  fill: currentColor;
  color: inherit;
  vertical-align: -2px;
}
</style>
