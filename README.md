# yysls

燕云十六声常用工具。React 前端，Node.js 后端。界面为中古武侠风格，并包含 AI 功能。

## 开发

```bash
npm install
npm run dev
```

- 前端：http://localhost:5173
- 后端：http://localhost:3001
- 健康检查：http://localhost:3001/api/health

前端开发服务器会把 `/api` 代理到后端。

## 部署

线上用 Nginx 和 PM2。步骤见 [DEPLOY.md](DEPLOY.md)。

## 功能

### 1. 文案着色

在对话框中输入文字，选中其中一段并指定颜色，生成可复制的颜色码。

整段同一个颜色：

```text
#ff0000红色文字
```

一段里多种颜色：

```text
#87ceeb你好#7b68ee江湖#00ff00再见
```

上面这句里，你好是浅蓝，江湖是紫色，再见是绿色。颜色码写在对应文字前面。
