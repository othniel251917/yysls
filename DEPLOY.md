# 部署

线上机器是 Ubuntu，已经装好 Node.js 22、Nginx 和 PM2。站点由 Nginx 对外，Node 只听本机 3001。

- 代码目录：`/opt/yysls`
- 进程名：`yysls`
- 启动文件：`server/src/index.js`
- 端口：`3001`，可用环境变量 `PORT` 覆盖
- Nginx 配置：`/etc/nginx/conf.d/yysls.conf`，把 80 端口转到 `http://127.0.0.1:3001`
- 网站：http://8.159.136.130/
- 健康检查：http://8.159.136.130/api/health

服务端会托管 `client/dist`。这个目录由本机 `npm run build` 生成，不要在服务器上现编。

## 更新

在本机构建前端，把项目同步到 `/opt/yysls`。同步时带上 `client/dist`，不要带 `node_modules`。然后在服务器上执行：

```bash
cd /opt/yysls
npm ci --omit=dev
pm2 restart yysls
pm2 save
```

第一次启动、进程还不存在时，把 `pm2 restart` 换成：

```bash
pm2 start server/src/index.js --name yysls --cwd /opt/yysls
pm2 save
```

`pm2 save` 会写入开机恢复列表。Nginx 配置不用改。

## 检查

```bash
pm2 list
pm2 logs yysls
curl -fsS http://127.0.0.1:3001/api/health
curl -fsS -o /dev/null -w "%{http_code}\n" http://127.0.0.1/
```

本机再打开 http://8.159.136.130/ ，应看到文案着色首页。
