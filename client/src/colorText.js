/**
 * @typedef {Object} TextSegment
 * @property {string} text 这一段的原文
 * @property {string | null} color 颜色码，形如 #rrggbb；未着色时为 null
 */

/**
 * 把片段拼回纯文本。
 * @param {TextSegment[]} segments 文案片段
 * @returns {string} 不含颜色码的原文
 */
export function segmentsToPlain(segments) {
  return segments.map((segment) => segment.text).join('')
}

/**
 * 把片段收成游戏用的颜色码。未着色的文字不加前缀。
 * @param {TextSegment[]} segments 文案片段
 * @returns {string} 例如 #87ceeb你好#7b68ee江湖
 */
export function serializeColoredText(segments) {
  let result = ''
  for (const segment of segments) {
    if (!segment.text) {
      continue
    }
    if (segment.color) {
      result += segment.color
    }
    result += segment.text
  }
  return result
}

/**
 * 把用户选的颜色收成小写的 #rrggbb。
 * @param {string} value 颜色值，可带或不带 #
 * @returns {string | null} 合法颜色码；无法识别时为 null
 */
export function normalizeHexColor(value) {
  const matched = /^#?([0-9a-fA-F]{6})$/.exec(value.trim())
  if (!matched) {
    return null
  }
  return `#${matched[1].toLowerCase()}`
}

/**
 * 合并相邻且颜色相同的片段，并丢掉空片段。
 * @param {TextSegment[]} segments 待合并的片段
 * @returns {TextSegment[]} 合并后的片段；全文为空时保留一个空片段
 */
function mergeSegments(segments) {
  /** @type {TextSegment[]} */
  const merged = []
  for (const segment of segments) {
    if (!segment.text) {
      continue
    }
    const last = merged[merged.length - 1]
    if (last && last.color === segment.color) {
      last.text += segment.text
    } else {
      merged.push({ text: segment.text, color: segment.color })
    }
  }
  if (merged.length === 0) {
    return [{ text: '', color: null }]
  }
  return merged
}

/**
 * 取插入点应继承的颜色：用光标前一个字的颜色；在开头则用第一段的颜色。
 * @param {TextSegment[]} segments 文案片段
 * @param {number} index 纯文本中的插入下标
 * @returns {string | null} 继承到的颜色码
 */
function colorAtOffset(segments, index) {
  if (segments.length === 0) {
    return null
  }
  if (index <= 0) {
    return segments[0].color
  }
  let cursor = 0
  for (const segment of segments) {
    cursor += segment.text.length
    if (index <= cursor) {
      return segment.color
    }
  }
  return segments[segments.length - 1].color
}

/**
 * 替换纯文本中的一个区间，插入的文字使用指定颜色。
 * @param {TextSegment[]} segments 文案片段
 * @param {number} start 区间起点（含）
 * @param {number} removeCount 删掉的字符数
 * @param {string} inserted 插入的文字
 * @param {string | null} insertedColor 插入文字的颜色
 * @returns {TextSegment[]} 替换后的片段
 */
function replaceTextRange(segments, start, removeCount, inserted, insertedColor) {
  const end = start + removeCount
  /** @type {TextSegment[]} */
  const next = []
  let cursor = 0
  let placed = false

  /**
   * 追加一段文字，并和上一段合并相同颜色。
   * @param {string} text 文字
   * @param {string | null} color 颜色码
   * @returns {void}
   */
  function pushPiece(text, color) {
    if (!text) {
      return
    }
    const last = next[next.length - 1]
    if (last && last.color === color) {
      last.text += text
    } else {
      next.push({ text, color })
    }
  }

  for (const segment of segments) {
    const segStart = cursor
    const segEnd = cursor + segment.text.length
    cursor = segEnd

    if (segEnd <= start) {
      pushPiece(segment.text, segment.color)
      continue
    }

    if (segStart >= end) {
      if (!placed) {
        pushPiece(inserted, insertedColor)
        placed = true
      }
      pushPiece(segment.text, segment.color)
      continue
    }

    const beforeLength = Math.max(0, start - segStart)
    const afterStart = Math.max(0, end - segStart)
    pushPiece(segment.text.slice(0, beforeLength), segment.color)
    if (!placed) {
      pushPiece(inserted, insertedColor)
      placed = true
    }
    pushPiece(segment.text.slice(afterStart), segment.color)
  }

  if (!placed) {
    pushPiece(inserted, insertedColor)
  }

  return mergeSegments(next)
}

/**
 * 用户改了纯文本后，按这次增删更新片段。新打的字继承光标处的颜色。
 * @param {TextSegment[]} segments 改之前的片段
 * @param {string} nextPlain 改之后的纯文本
 * @returns {TextSegment[]} 更新后的片段
 */
export function updateSegmentsFromPlain(segments, nextPlain) {
  const previous = segmentsToPlain(segments)
  if (previous === nextPlain) {
    return segments
  }

  let start = 0
  const shared = Math.min(previous.length, nextPlain.length)
  while (start < shared && previous[start] === nextPlain[start]) {
    start += 1
  }

  let previousEnd = previous.length
  let nextEnd = nextPlain.length
  while (
    previousEnd > start &&
    nextEnd > start &&
    previous[previousEnd - 1] === nextPlain[nextEnd - 1]
  ) {
    previousEnd -= 1
    nextEnd -= 1
  }

  const inserted = nextPlain.slice(start, nextEnd)
  const color = inserted ? colorAtOffset(segments, start) : null
  return replaceTextRange(segments, start, previousEnd - start, inserted, color)
}

/**
 * 给纯文本区间染上颜色，或在 color 为 null 时清除颜色。
 * @param {TextSegment[]} segments 文案片段
 * @param {number} start 选区起点（含）
 * @param {number} end 选区终点（不含）
 * @param {string | null} color 目标颜色；null 表示清除
 * @returns {TextSegment[]} 上色后的片段
 */
export function colorTextRange(segments, start, end, color) {
  const plain = segmentsToPlain(segments)
  const from = Math.max(0, Math.min(start, plain.length))
  const to = Math.max(from, Math.min(end, plain.length))
  if (from === to) {
    return segments
  }

  const nextColor = color == null ? null : normalizeHexColor(color)
  if (color != null && nextColor == null) {
    return segments
  }

  return replaceTextRange(segments, from, to - from, plain.slice(from, to), nextColor)
}
