import { useEffect, useRef, useState } from 'react'
import {
  colorTextRange,
  segmentsToPlain,
  serializeColoredText,
  updateSegmentsFromPlain,
} from './colorText.js'
import './ColorTextDialog.css'

/** 文案着色对话框的 id，供页面上的打开按钮指向它。 */
export const COLOR_TEXT_DIALOG_ID = 'color-text-dialog'

/** 颜色码文本框的 id，复制按钮通过 commandfor 读取它。 */
const COLOR_CODE_ID = 'color-text-code'

const COLOR_PRESETS = [
  { name: '朱红', value: '#ff0000' },
  { name: '天青', value: '#87ceeb' },
  { name: '紫藤', value: '#7b68ee' },
  { name: '新绿', value: '#00ff00' },
  { name: '赤金', value: '#ffd700' },
  { name: '霜色', value: '#f4f0e6' },
]

const copyTimers = new WeakMap()
let lastCopyMessage = ''

/**
 * 在复制按钮旁显示结果。气泡用透明度显隐，避免从无障碍树里消失。
 * @param {HTMLButtonElement} button 复制按钮
 * @param {boolean} succeeded 是否复制成功
 * @param {string} successText 成功时的短句
 * @param {string} failureText 失败时的短句
 * @returns {void}
 */
function reportCopyResult(button, succeeded, successText, failureText) {
  const tip = button.nextElementSibling
  if (!(tip instanceof HTMLElement)) {
    return
  }

  const pending = copyTimers.get(button)
  if (pending) {
    window.clearTimeout(pending)
  }

  button.removeAttribute('data-copied')
  button.removeAttribute('data-failed')

  let message = succeeded ? successText : failureText
  if (message === lastCopyMessage) {
    message += '\u00A0'
  }
  lastCopyMessage = message

  tip.textContent = ''
  void button.offsetWidth
  button.setAttribute(succeeded ? 'data-copied' : 'data-failed', '')
  window.requestAnimationFrame(() => {
    tip.textContent = message
  })

  copyTimers.set(
    button,
    window.setTimeout(() => {
      button.removeAttribute('data-copied')
      button.removeAttribute('data-failed')
      tip.textContent = ''
    }, 2000),
  )
}

/**
 * 把颜色码文本框里的原文写入剪贴板。
 * @param {HTMLButtonElement} button 触发复制的按钮
 * @param {EventTarget | null} target commandfor 指向的元素
 * @returns {Promise<void>}
 */
async function copyColoredText(button, target) {
  const text =
    target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement
      ? target.value
      : target instanceof HTMLElement
        ? target.innerText
        : ''

  if (!text) {
    reportCopyResult(button, false, '已复制', '没有可复制的内容')
    return
  }

  try {
    await navigator.clipboard.writeText(text)
    reportCopyResult(button, true, '已复制', '复制失败')
  } catch {
    reportCopyResult(button, false, '已复制', '复制失败')
  }
}

/**
 * 按下颜色按钮时保住文本框里的选区，避免焦点一走选区就丢。
 * @param {React.MouseEvent<HTMLButtonElement>} event 鼠标按下事件
 * @returns {void}
 */
function keepTextSelection(event) {
  event.preventDefault()
}

/**
 * 文案着色对话框：输入文字，选中一段，再给这段指定颜色。
 * @returns {import('react').JSX.Element} 对话框
 */
function ColorTextDialog() {
  const dialogRef = useRef(null)
  const textAreaRef = useRef(null)
  const rangeRef = useRef({ start: 0, end: 0 })
  const composingRef = useRef(false)
  const [segments, setSegments] = useState(/** @type {import('./colorText.js').TextSegment[]} */ ([
    { text: '', color: null },
  ]))
  const [selectionCount, setSelectionCount] = useState(0)
  const [actionMessage, setActionMessage] = useState('')

  const plain = segmentsToPlain(segments)
  const colorCode = serializeColoredText(segments)

  useEffect(() => {
    const dialog = dialogRef.current
    const field = textAreaRef.current
    if (field) {
      field.setAttribute('autofocus', '')
    }

    /**
     * 对话框打开时把焦点放进文案框。
     * @param {Event} event 对话框 toggle 事件
     * @returns {void}
     */
    function focusInputOnOpen(event) {
      if (!('newState' in event) || event.newState !== 'open') {
        return
      }
      textAreaRef.current?.focus()
    }

    dialog?.addEventListener('toggle', focusInputOnOpen)
    return () => {
      dialog?.removeEventListener('toggle', focusInputOnOpen)
    }
  }, [])

  useEffect(() => {
    /**
     * 响应复制命令。command 事件不冒泡，所以要在捕获阶段听。
     * @param {Event} event 命令事件
     * @returns {void}
     */
    function onCommand(event) {
      if (!('command' in event) || event.command !== '--copy') {
        return
      }
      const source = 'source' in event ? event.source : null
      if (!(source instanceof HTMLButtonElement)) {
        return
      }
      void copyColoredText(source, event.target)
    }

    document.addEventListener('command', onCommand, true)
    return () => {
      document.removeEventListener('command', onCommand, true)
    }
  }, [])

  /**
   * 记住文本框当前选区，供随后的上色按钮使用。
   * @returns {void}
   */
  function rememberSelection() {
    const field = textAreaRef.current
    if (!field) {
      return
    }
    const start = field.selectionStart ?? 0
    const end = field.selectionEnd ?? 0
    rangeRef.current = { start, end }
    setSelectionCount(Math.abs(end - start))
  }

  /**
   * 按文本框里的纯文本回写片段，输入法组字期间先不改。
   * @param {string} nextPlain 文本框当前全文
   * @returns {void}
   */
  function syncPlain(nextPlain) {
    setActionMessage('')
    setSegments((current) => updateSegmentsFromPlain(current, nextPlain))
  }

  /**
   * 处理文本框输入。组字未结束时不动片段，免得把拼音写进颜色码。
   * @param {React.ChangeEvent<HTMLTextAreaElement>} event 输入事件
   * @returns {void}
   */
  function handlePlainChange(event) {
    rememberSelection()
    if (composingRef.current) {
      return
    }
    syncPlain(event.target.value)
  }

  /**
   * 组字结束后再把全文写进片段。
   * @param {React.CompositionEvent<HTMLTextAreaElement>} event 组字结束事件
   * @returns {void}
   */
  function handleCompositionEnd(event) {
    composingRef.current = false
    rememberSelection()
    syncPlain(event.currentTarget.value)
  }

  /**
   * 读取要上色的区间。文本框仍聚焦时用它的实时选区，否则用离开前记住的区间。
   * @returns {{ start: number, end: number }} 选区两端，可能尚未排序
   */
  function readSelection() {
    const field = textAreaRef.current
    if (field && document.activeElement === field) {
      return { start: field.selectionStart ?? 0, end: field.selectionEnd ?? 0 }
    }
    return rangeRef.current
  }

  /**
   * 给当前选区上色。没有选区时只提示，不改文字。
   * @param {string | null} color 目标颜色；null 表示清除
   * @param {string} message 成功后的状态短句
   * @returns {void}
   */
  function applySelectionColor(color, message) {
    const { start, end } = readSelection()
    if (start === end) {
      setActionMessage('先选中要上色的文字')
      return
    }

    const from = Math.min(start, end)
    const to = Math.max(start, end)
    setSegments((current) => colorTextRange(current, from, to, color))
    setActionMessage(message)

    window.requestAnimationFrame(() => {
      const field = textAreaRef.current
      const pickerOpen = document.activeElement instanceof HTMLInputElement
        && document.activeElement.type === 'color'
      if (!field || pickerOpen) {
        return
      }
      field.focus()
      field.setSelectionRange(from, to)
      rangeRef.current = { start: from, end: to }
    })
  }

  return (
    <dialog ref={dialogRef} id={COLOR_TEXT_DIALOG_ID} aria-labelledby="color-text-title">
      <div className="dialog-head">
        <h2 id="color-text-title">文案着色</h2>
        <button type="button" command="close" commandFor={COLOR_TEXT_DIALOG_ID}>
          关闭
        </button>
      </div>

      <div className="field">
        <label htmlFor="color-text-input">文案</label>
        <textarea
          id="color-text-input"
          ref={textAreaRef}
          autoFocus
          rows={4}
          placeholder="例如：你好江湖再见"
          aria-describedby="color-text-hint"
          onChange={handlePlainChange}
          onSelect={rememberSelection}
          onKeyUp={rememberSelection}
          onMouseUp={rememberSelection}
          onBlur={rememberSelection}
          onCompositionStart={() => {
            composingRef.current = true
          }}
          onCompositionEnd={handleCompositionEnd}
        />
        <p id="color-text-hint">
          先写下文字，再选中要变色的一段。颜色码加在这段前面。
          <code className="sample">#87ceeb你好#7b68ee江湖#00ff00再见</code>
        </p>
      </div>

      <fieldset>
        <legend>给选中的文字上色</legend>
        <p id="color-text-selection">
          {selectionCount > 0 ? `已选中 ${selectionCount} 个字` : '尚未选中文字'}
        </p>
        <div className="swatches">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className="swatch"
              onMouseDown={keepTextSelection}
              onClick={() => applySelectionColor(preset.value, `已改为${preset.name}`)}
            >
              <span className="chip" style={{ background: preset.value }} aria-hidden="true" />
              {preset.name}
            </button>
          ))}
          <label className="custom-color" onPointerDown={rememberSelection}>
            自选
            <input
              type="color"
              defaultValue="#ff0000"
              onChange={(event) => applySelectionColor(event.currentTarget.value, '已改为自选颜色')}
            />
          </label>
          <button
            type="button"
            className="swatch"
            onMouseDown={keepTextSelection}
            onClick={() => applySelectionColor(null, '已清除选中文字的颜色')}
          >
            清除颜色
          </button>
        </div>
        <p role="status" className="action-status">
          {actionMessage}
        </p>
      </fieldset>

      <div className="field">
        <p id="color-text-preview-label">效果</p>
        <div
          className="preview"
          aria-labelledby="color-text-preview-label"
          role="group"
        >
          {plain ? (
            segments.map((segment, index) => (
              <span key={`${segment.color ?? 'plain'}-${index}`} style={segment.color ? { color: segment.color } : undefined}>
                {segment.text}
                {segment.color ? (
                  <span className="visually-hidden">
                    ，{COLOR_PRESETS.find((preset) => preset.value === segment.color)?.name ?? segment.color}
                  </span>
                ) : null}
              </span>
            ))
          ) : (
            <span className="preview-empty">写下文字后，这里按颜色显示</span>
          )}
        </div>
      </div>

      <div className="field">
        <label htmlFor={COLOR_CODE_ID}>颜色码</label>
        <textarea
          id={COLOR_CODE_ID}
          className="code-field"
          readOnly
          rows={2}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="none"
          value={colorCode}
        />
        <span className="copy">
          <button type="button" className="copy-button" command="--copy" commandFor={COLOR_CODE_ID}>
            复制颜色码
          </button>
          <span className="tip" role="status" />
        </span>
      </div>
    </dialog>
  )
}

export default ColorTextDialog
