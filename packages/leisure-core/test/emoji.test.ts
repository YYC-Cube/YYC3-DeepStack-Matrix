import { describe, expect, it } from 'vitest'
import { ALL_EMOJIS, EMOJI_GROUPS, REACTION_QUICK } from '../src/emoji.js'

describe('emoji 全集面板单源', () => {
  it('快捷条与全集组非空', () => {
    expect(REACTION_QUICK.length).toBeGreaterThanOrEqual(6)
    expect(EMOJI_GROUPS.length).toBeGreaterThanOrEqual(8)
  })

  it('每枚 emoji ≤ 8 UTF-16 码元(后端 ReactDto @Length 兼容;不录 ZWJ 组合)', () => {
    for (const e of ALL_EMOJIS) {
      expect(e.length, `${e} 长 ${String(e.length)}`).toBeLessThanOrEqual(8)
    }
  })

  it('全集无重复(ALL_EMOJIS 已去重,组内不得出现重复项)', () => {
    const flat = EMOJI_GROUPS.flatMap((g) => g.emojis)
    expect(new Set(flat).size).toBe(flat.length)
    expect(ALL_EMOJIS.length).toBe(flat.length)
  })

  it('快捷条 emoji 均在全集内(单源一致)', () => {
    for (const q of REACTION_QUICK) {
      expect(ALL_EMOJIS).toContain(q)
    }
  })
})
