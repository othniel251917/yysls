import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'

const port = readPort()
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist')

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
  app.use(express.static(clientDist))
  return app
}

/**
 * 读取监听端口。未设置或不是正整数时用 3001。
 * @returns {number} 端口
 */
function readPort() {
  const parsed = Number(process.env.PORT)
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed
  }
  return 3001
}

/**
 * 在指定端口启动 HTTP 服务，并对外网开放。
 * @param {number} listenPort 监听端口
 * @returns {void}
 */
function startServer(listenPort) {
  const app = createApp()
  app.listen(listenPort, '0.0.0.0', () => {
    console.log(`server listening on http://0.0.0.0:${listenPort}`)
  })
}

startServer(port)
