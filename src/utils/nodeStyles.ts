import type { DomainMap } from '@/types/domain'
import type { ThemeColors } from '@/types/theme'
import type { VisNodeColor, VisNodeFont } from '@/types/network'
import { domainColor, domainBorder } from './colors'

export function nc(domains: DomainMap, domain: string, lvl: number): VisNodeColor {
  const bg = domainColor(domains, domain, lvl)
  const border = domainBorder(domains, domain, lvl)
  return { background: bg, border, highlight: { background: bg, border } }
}

export function nodeFont(domains: DomainMap, theme: ThemeColors, themeName: string, domain: string, level: number): VisNodeFont {
  const d = domains[domain]
  if (level === 1) {
    return { size: 140, color: theme.l12font, bold: true, strokeWidth: 5, strokeColor: theme.fontStrokeL1 }
  }
  if (level === 2) {
    return { size: 88, color: theme.l12font, bold: false, strokeWidth: 4, strokeColor: theme.fontStrokeL1 }
  }
  // L3 заметно серее L1/L2: светлоту поднимаем до ~40%, насыщенность снижена
  const fontLightness = themeName === 'dark' ? 60 : 60
  const fontSat = d ? Math.max(8, Math.min(25, Math.round(d.sat * 0.30))) : 10
  const hue = d ? d.hue : 0
  return { size: 49, color: `hsl(${hue}, ${fontSat}%, ${fontLightness}%)`, strokeWidth: 3, strokeColor: theme.fontStroke }
}

export function nodeSize(level: number): number {
  if (level === 1) return 335
  if (level === 2) return 140
  return 48
}

export function nodeMass(level: number): number {
  if (level === 1) return 10
  if (level === 2) return 4
  return 1.5
}

// Союзы и предлоги, которые нельзя оставлять висеть в конце строки
const HANGING_WORDS = new Set([
  'и', 'а', 'но', 'или', 'да', 'то', 'же', 'бы', 'ли',
  'как', 'что', 'при', 'для', 'под', 'над', 'без', 'про',
  'по', 'на', 'в', 'с', 'к', 'от', 'об', 'за', 'до',
  'из', 'у', 'со', 'ко', 'во', 'не', 'ни',
])

/**
 * Разбивает текст метки на строки по N слов.
 * Не оставляет союзы/предлоги висячими в конце строки —
 * переносит их на следующую строку вместе со следующим словом.
 */
export function wrapLabel(text: string, wordsPerLine = 3): string {
  const words = text.split(/\s+/)
  if (words.length <= wordsPerLine) return text

  const lines: string[] = []
  let i = 0

  while (i < words.length) {
    let end = Math.min(i + wordsPerLine, words.length)

    // Если последнее слово строки — висячий союз/предлог и впереди есть слова,
    // сдвигаем его на следующую строку (уменьшаем текущую на 1 слово)
    if (end < words.length && HANGING_WORDS.has(words[end - 1].toLowerCase())) {
      end = end - 1
      if (end === i) end = i + 1 // не допускаем пустую строку
    }

    lines.push(words.slice(i, end).join(' '))
    i = end
  }

  return lines.join('\n')
}
