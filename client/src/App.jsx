import ColorTextDialog, { COLOR_TEXT_DIALOG_ID } from './ColorTextDialog.jsx'
import './App.css'

/**
 * 工具首页。文案着色在对话框里完成。
 * @returns {import('react').JSX.Element} 页面
 */
function App() {
  return (
    <main className="hall">
      <h1 className="masthead">燕云十六声</h1>
      <section className="tool-card" aria-labelledby="color-tool-title">
        <p className="tool-kicker">常用工具</p>
        <h2 id="color-tool-title">文案着色</h2>
        <p>
          写下想用的句子，选中其中一段，再点一种颜色。
          <span className="nowrap">复制颜色码，贴进游戏即可。</span>
        </p>
        <button type="button" command="show-modal" commandFor={COLOR_TEXT_DIALOG_ID}>
          打开文案着色
        </button>
      </section>
      <ColorTextDialog />
    </main>
  )
}

export default App
