import { ref, computed } from 'vue'
import type { ThemeName, ThemeColors } from '@/types/theme'
import { THEMES } from '@/data/themes'

const currentTheme = ref<ThemeName>('light')

const T = computed<ThemeColors>(() => THEMES[currentTheme.value])

export function useTheme() {
  return { currentTheme, T }
}
