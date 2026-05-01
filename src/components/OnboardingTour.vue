<template>
  <Teleport to="body">
    <div v-if="visible" class="tour-root">
      <!-- Перехват кликов в тёмной зоне — закрывает тур -->
      <div
        class="tour-catcher"
        :class="{ 'no-target': !targetRect }"
        @click="onSkip"
      />

      <!-- Spotlight: прозрачный прямоугольник с box-shadow 9999px, который затемняет всё вокруг -->
      <div
        v-if="targetRect"
        class="tour-spotlight"
        :style="spotlightStyle"
      />

      <!-- Карточка тура -->
      <div
        ref="cardRef"
        class="tour-card"
        :style="cardStyle"
        role="dialog"
        aria-modal="false"
        :aria-label="`Шаг ${tourStep + 1} из ${totalSteps}: ${currentStep?.title}`"
        @click.stop
      >
        <div class="tc-header">
          <span class="tc-counter">{{ tourStep + 1 }} / {{ totalSteps }}</span>
          <button class="tc-skip" type="button" @click.stop="onSkip" aria-label="Пропустить тур">Пропустить</button>
        </div>

        <div class="tc-dots">
          <span
            v-for="i in totalSteps"
            :key="i"
            class="tc-dot"
            :class="{ active: i - 1 === tourStep }"
          />
        </div>

        <h3 class="tc-title">{{ currentStep?.title }}</h3>
        <p class="tc-text">{{ currentStep?.text }}</p>

        <div class="tc-actions">
          <button
            v-if="tourStep > 0"
            type="button"
            class="tc-btn-back"
            @click.stop="prevStep()"
          >← Назад</button>
          <div v-else class="tc-spacer" />
          <button type="button" class="tc-btn-next" @click.stop="onNext">
            {{ isLast ? 'Готово' : 'Далее →' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useCoachMarks } from '@/composables/useCoachMarks'
import { useStore } from '@/composables/state/useStore'
import { SCENARIOS_STEPS, GRAPH_STEPS } from '@/components/onboarding/tourSteps'
import type { TourStep } from '@/components/onboarding/tourSteps'

const emit = defineEmits<{
  'tour-ended': []
}>()

const { tourActive, tourStep, tourFlow, nextStep, prevStep, endTour } = useCoachMarks()
const { currentView, dispatch } = useStore()

const CARD_WIDTH = 300
const CARD_HEIGHT_FALLBACK = 260
const CARD_GAP = 14
const SPOT_PAD = 8

const targetRect = ref<DOMRect | null>(null)
const cardPosition = ref<{ top: number; left: number } | null>(null)
const cardRef = ref<HTMLElement | null>(null)

const steps = computed((): TourStep[] => {
  if (tourFlow.value === 'scenarios') return SCENARIOS_STEPS
  if (tourFlow.value === 'graph') return GRAPH_STEPS
  return []
})

const totalSteps = computed(() => steps.value.length)
const currentStep = computed(() => steps.value[tourStep.value] ?? null)
const isLast = computed(() => tourStep.value >= totalSteps.value - 1)
const visible = computed(() => tourActive.value && currentStep.value !== null)

async function syncViewAndPosition() {
  const step = currentStep.value
  if (!step) {
    targetRect.value = null
    cardPosition.value = null
    return
  }

  // Переключаем view если тур в другом режиме (graph/scenarios)
  if (currentView.value !== step.flow) {
    dispatch({ type: 'SWITCH_VIEW', view: step.flow })
    await new Promise((r) => setTimeout(r, 350))
  }

  await nextTick()

  // Скролл таргета в видимую область
  const el = document.querySelector(step.targetSelector) as HTMLElement | null
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    await new Promise((r) => setTimeout(r, 320))
  }

  // Первый проход — с fallback-высотой карточки
  updatePosition(CARD_HEIGHT_FALLBACK)

  // Второй проход — после рендера измеряем реальную высоту
  await nextTick()
  const actualHeight = cardRef.value?.offsetHeight ?? CARD_HEIGHT_FALLBACK
  updatePosition(actualHeight)
}

function pickPlacement(rect: DOMRect, requested: string, cardHeight: number, vw: number, vh: number): string {
  const needVertical = cardHeight + CARD_GAP + SPOT_PAD + 12
  const needHorizontal = CARD_WIDTH + CARD_GAP + SPOT_PAD + 12
  const topSpace = rect.top
  const bottomSpace = vh - rect.bottom
  const leftSpace = rect.left
  const rightSpace = vw - rect.right

  // Если запрошенный placement не помещается — выбираем сторону с наибольшим запасом
  if (requested === 'top' && topSpace < needVertical) {
    if (bottomSpace >= needVertical) return 'bottom'
    if (rightSpace >= needHorizontal) return 'right'
    if (leftSpace >= needHorizontal) return 'left'
  }
  if (requested === 'bottom' && bottomSpace < needVertical) {
    if (topSpace >= needVertical) return 'top'
    if (rightSpace >= needHorizontal) return 'right'
    if (leftSpace >= needHorizontal) return 'left'
  }
  if (requested === 'right' && rightSpace < needHorizontal) {
    if (leftSpace >= needHorizontal) return 'left'
    if (bottomSpace >= needVertical) return 'bottom'
    if (topSpace >= needVertical) return 'top'
  }
  if (requested === 'left' && leftSpace < needHorizontal) {
    if (rightSpace >= needHorizontal) return 'right'
    if (bottomSpace >= needVertical) return 'bottom'
    if (topSpace >= needVertical) return 'top'
  }
  return requested
}

function updatePosition(cardHeight = cardRef.value?.offsetHeight ?? CARD_HEIGHT_FALLBACK) {
  const step = currentStep.value
  if (!step) return

  const el = document.querySelector(step.targetSelector)
  if (!el) {
    targetRect.value = null
    cardPosition.value = null
    return
  }

  const rect = el.getBoundingClientRect()
  targetRect.value = rect

  const vw = window.innerWidth
  const vh = window.innerHeight
  const placement = pickPlacement(rect, step.placement, cardHeight, vw, vh)

  let top = 0
  let left = rect.left + rect.width / 2 - CARD_WIDTH / 2

  if (placement === 'bottom') {
    top = rect.bottom + CARD_GAP + SPOT_PAD
  } else if (placement === 'top') {
    top = rect.top - cardHeight - CARD_GAP - SPOT_PAD
  } else if (placement === 'right') {
    top = rect.top + rect.height / 2 - cardHeight / 2
    left = rect.right + CARD_GAP + SPOT_PAD
  } else {
    top = rect.top + rect.height / 2 - cardHeight / 2
    left = rect.left - CARD_WIDTH - CARD_GAP - SPOT_PAD
  }

  // Клампирование к вьюпорту
  left = Math.max(12, Math.min(vw - CARD_WIDTH - 12, left))
  top = Math.max(12, Math.min(vh - cardHeight - 12, top))

  cardPosition.value = { top, left }
}

const spotlightStyle = computed(() => {
  if (!targetRect.value) return {}
  const r = targetRect.value
  return {
    top: `${r.top - SPOT_PAD}px`,
    left: `${r.left - SPOT_PAD}px`,
    width: `${r.width + SPOT_PAD * 2}px`,
    height: `${r.height + SPOT_PAD * 2}px`,
  }
})

const cardStyle = computed(() => {
  if (!cardPosition.value) {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    }
  }
  return {
    top: `${cardPosition.value.top}px`,
    left: `${cardPosition.value.left}px`,
  }
})

watch([tourActive, tourStep, tourFlow], () => {
  syncViewAndPosition()
}, { immediate: true })

function onResize() { updatePosition() }

function onKey(e: KeyboardEvent) {
  if (!tourActive.value) return
  if (e.key === 'Escape') onSkip()
  if (e.key === 'ArrowRight') onNext()
  if (e.key === 'ArrowLeft') prevStep()
}

let scrollTimer: number | null = null
function onScroll() {
  if (scrollTimer !== null) return
  scrollTimer = window.setTimeout(() => {
    updatePosition()
    scrollTimer = null
  }, 60)
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKey)
  window.addEventListener('scroll', onScroll, true)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('scroll', onScroll, true)
})

function onNext() {
  if (isLast.value) {
    endTour()
    emit('tour-ended')
  } else {
    nextStep(totalSteps.value)
  }
}

function onSkip() {
  endTour()
  emit('tour-ended')
}
</script>

<style scoped>
.tour-root {
  position: fixed;
  inset: 0;
  z-index: 1100;
  pointer-events: none;
}

/* Прозрачный ловец кликов — закрывает тур при клике вне карточки.
   Когда нет таргета, сам становится затемнением. */
.tour-catcher {
  position: absolute;
  inset: 0;
  background: transparent;
  pointer-events: auto;
  transition: background 0.2s;
}
.tour-catcher.no-target {
  background: rgba(0, 0, 0, 0.45);
}

/* Spotlight: box-shadow 9999px создаёт затемнение вокруг, внутри — прозрачно */
.tour-spotlight {
  position: fixed;
  border-radius: 10px;
  box-shadow:
    0 0 0 9999px rgba(0, 0, 0, 0.55),
    0 0 0 2px var(--accent),
    0 0 0 6px rgba(192, 138, 62, 0.25),
    0 0 32px rgba(192, 138, 62, 0.35);
  pointer-events: none;
  transition:
    top 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    left 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: spot-pulse 2s ease-in-out infinite;
}

@keyframes spot-pulse {
  0%, 100% {
    box-shadow:
      0 0 0 9999px rgba(0, 0, 0, 0.55),
      0 0 0 2px var(--accent),
      0 0 0 6px rgba(192, 138, 62, 0.25),
      0 0 32px rgba(192, 138, 62, 0.35);
  }
  50% {
    box-shadow:
      0 0 0 9999px rgba(0, 0, 0, 0.55),
      0 0 0 2px var(--accent),
      0 0 0 10px rgba(192, 138, 62, 0.15),
      0 0 40px rgba(192, 138, 62, 0.45);
  }
}

.tour-card {
  position: fixed;
  pointer-events: auto;
  width: 300px;
  text-align: left;
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12);
  animation: tc-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
  transition:
    top 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes tc-in {
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to { opacity: 1; transform: none; }
}

.tc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.tc-counter {
  font-size: 10px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.tc-skip {
  font-size: 10px;
  color: var(--text-dim);
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
  transition: color 0.15s;
}

.tc-skip:hover {
  color: var(--text-muted);
}

.tc-dots {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}

.tc-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--border);
  transition: background 0.2s, transform 0.2s;
  flex-shrink: 0;
}

.tc-dot.active {
  background: var(--accent);
  transform: scale(1.5);
}

.tc-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
  letter-spacing: 0;
  line-height: 1.3;
}

.tc-text {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.65;
  margin-bottom: 16px;
}

.tc-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.tc-spacer {
  flex: 1;
}

.tc-btn-back {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.15s, background 0.15s;
}

.tc-btn-back:hover {
  color: var(--text);
  background: var(--card-hover);
}

.tc-btn-next {
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: 999px;
  padding: 7px 16px;
  cursor: pointer;
  font-family: inherit;
  margin-left: auto;
  transition: filter 0.15s, box-shadow 0.15s;
  box-shadow: 0 1px 6px rgba(var(--accent-rgb),0.28);
}

.tc-btn-next:hover {
  filter: brightness(1.08);
  box-shadow: 0 2px 10px rgba(var(--accent-rgb),0.34);
}

@media (max-width: 480px) {
  .tour-card {
    width: calc(100vw - 24px) !important;
    left: 12px !important;
    top: auto !important;
    bottom: 24px;
    transform: none !important;
  }
}
</style>
