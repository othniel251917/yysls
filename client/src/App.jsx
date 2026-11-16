import { useEffect, useState } from 'react'
import './App.css'

/**
 * 拉取后端健康检查结果。
 * @returns {Promise<{ ok: boolean, service: string }>} 健康检查数据
 */
async function fetchHealth() {
  const response = await fetch('/api/health')
  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`)
  }
  return response.json()
}

/**
 * 应用首页，展示与后端的连接状态。
 * @returns {import('react').JSX.Element} 页面
 */
function App() {
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    fetchHealth()
      .then((data) => {
        if (cancelled) {
          return
        }
        setStatus('ok')
        setMessage(data.service)
      })
      .catch((error) => {
        if (cancelled) {
          return
        }
        setStatus('error')
        setMessage(error instanceof Error ? error.message : '无法连接后端')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main>
      <h1>yysls</h1>
      {status === 'loading' ? (
        <p>
          正在连接后端
          <progress aria-label="正在连接后端" />
        </p>
      ) : null}
      <p role="status">{status === 'ok' ? `后端已连接（${message}）` : ''}</p>
      <p role="alert">{status === 'error' ? message : ''}</p>
    </main>
  )
}

export default App
