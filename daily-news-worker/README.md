# AI 每日资讯聚合 Worker

这是一个基于 Cloudflare Worker + KV 的「AI 每日雷达」最小可用项目。Worker 每天通过 Cron Trigger 抓取 4 个来源，生成完整 HTML 页面并写入 KV。用户访问页面时直接读取 KV，不会每次实时抓取源站。

聚合来源：

- AI HOT 日报
- BuilderPulse 中文日报
- Horizon 中文摘要
- GitHub Trending

## 安装依赖

```bash
npm install
```

## 创建 KV Namespace

在项目目录执行：

```bash
npx wrangler kv namespace create DAILY_NEWS
```

命令会输出类似：

```txt
[[kv_namespaces]]
binding = "DAILY_NEWS"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

## 配置 KV id

打开 `wrangler.jsonc`，把占位符：

```jsonc
"id": "00000000000000000000000000000000"
```

替换为你创建 KV namespace 后得到的真实 `id`。

## 本地开发

```bash
npm run dev
```

默认本地地址：

```txt
http://localhost:8787
```

可访问：

- `http://localhost:8787/`
- `http://localhost:8787/daily/`
- `http://localhost:8787/daily/2026-06-16`
- `http://localhost:8787/refresh?date=2026-06-16`

本地开发会使用 Wrangler 的本地 KV 模拟环境。

## 部署

确认 `wrangler.jsonc` 中 KV id 已替换后执行：

```bash
npm run deploy
```

部署后，Cloudflare 会按配置的 Cron Trigger 执行：

```txt
30 0 * * *
```

Cloudflare Cron 使用 UTC 时间，`00:30 UTC` 对应北京时间 `08:30`。

## 手动刷新日报

刷新当天日报：

```txt
/refresh
```

刷新指定日期日报：

```txt
/refresh?date=YYYY-MM-DD
```

例如：

```txt
/refresh?date=2026-06-16
```

## 路由说明

- `/`：展示最新日报
- `/daily/`：展示最新日报
- `/daily/YYYY-MM-DD`：展示指定日期日报
- `/refresh`：强制刷新当天日报
- `/refresh?date=YYYY-MM-DD`：强制刷新指定日期日报

## KV Key 设计

最新日期：

```txt
daily:latest
```

指定日期 HTML：

```txt
daily:YYYY-MM-DD
```

例如：

```txt
daily:2026-06-16
```

## 绑定自定义域名

可以在 Cloudflare Dashboard 中绑定：

1. 进入 Workers & Pages
2. 选择 `daily-news-worker`
3. 打开 Settings
4. 进入 Domains & Routes
5. 添加自定义域名或 Route

常见方式：

- 独立子域名：`daily.example.com`
- 博客路径 Route：`example.com/daily/*`

如果绑定到博客路径，注意不要和现有博客路由冲突。

## 常见问题

### 为什么访问时不实时抓取？

项目设计是 Cron 预生成 + KV 缓存。这样页面访问更快，也能减少对源站的重复请求。

### 某个来源失败会怎样？

单个来源失败不会影响整页生成。失败模块会显示抓取失败、错误原因和原始来源链接。

### 为什么 GitHub Trending 解析不完整？

GitHub Trending 是 HTML 页面，不是稳定 API。当前实现用轻量 HTML 规则提取仓库名、地址、描述、语言和今日 stars，适合作为第一版 MVP。

### BuilderPulse 为什么不用完整 Markdown 解析器？

为了保持 Worker 原生、无复杂依赖，当前只实现了简易 Markdown 转换，支持标题、列表和 Markdown 链接。

### 如何查看 KV 内容？

可以使用 Wrangler 命令查看：

```bash
npx wrangler kv key list --binding DAILY_NEWS
```

也可以在 Cloudflare Dashboard 的 KV 管理页面查看。
