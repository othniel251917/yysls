import express from 'express'

const port = 3001

/**
 * 返回服务健康状态。
 * @param {import('express').Request} _req 请求对象
 * @param {import('express').Response} res 响应对象
 * @returns {void}
 */
function sendHealth(_req, res) {
  res.json({ ok: true, service: 'yysls' })
}

/**
 * 创建 Express 应用并注册接口。
 * @returns {import('express').Express} Express 应用
 */
function createApp() {
  const app = express()
  app.get('/api/health', sendHealth)
  return app
}

/**
 * 在指定端口启动 HTTP 服务。
 * @param {number} listenPort 监听端口
 * @returns {void}
 */
function startServer(listenPort) {
  const app = createApp()
  app.listen(listenPort, () => {
    console.log(`server listening on http://localhost:${listenPort}`)
  })
}

startServer(port)
