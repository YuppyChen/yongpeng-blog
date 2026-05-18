# WeChat 脚本使用说明（10个）

## 前置条件

在项目根目录创建 `.env`：

```bash
WECHAT_APP_ID=你的appid
WECHAT_APP_SECRET=你的appsecret
```

## 脚本总览

### 1) `draft_switch.js`（草稿开关设置）

```bash
# 查询开关状态
npx -y bun scripts/wechat/draft_switch.js --checkonly=1

# 开启开关（不可逆）
npx -y bun scripts/wechat/draft_switch.js
```

### 2) `draft_update.js`（更新草稿）

```bash
# 推荐：用 json 文件
npx -y bun scripts/wechat/draft_update.js --json_file=payload.update.json

# 或直接传 json
npx -y bun scripts/wechat/draft_update.js --json='{"media_id":"MEDIA_ID","index":0,"articles":{"title":"标题","content":"<p>正文</p>"}}'
```

必填字段：`media_id`、`index`、`articles`

### 3) `draft_batchget.js`（获取草稿列表）

```bash
npx -y bun scripts/wechat/draft_batchget.js --offset=0 --count=10 --no_content=0
# 如需完整原始返回：
npx -y bun scripts/wechat/draft_batchget.js --offset=0 --count=10 --no_content=0 --raw=1
```

参数说明：
- `offset`：起始偏移，>=0
- `count`：1-20
- `no_content`：`1` 不返回 content 字段，`0` 返回（默认 0）
- `raw`：`1` 输出微信接口完整原始响应，默认仅输出标题和 `media_id`

### 4) `draft_add.js`（新增草稿）

```bash
# 推荐：用 json 文件
npx -y bun scripts/wechat/draft_add.js --json_file=payload.add.json

# 或直接传 json
npx -y bun scripts/wechat/draft_add.js --json='{"articles":[{"article_type":"news","title":"标题","content":"<p>正文</p>","thumb_media_id":"THUMB_MEDIA_ID"}]}'
```

必填字段：`articles`（数组）

### 5) `draft_count.js`（获取草稿总数）

```bash
npx -y bun scripts/wechat/draft_count.js
```

### 6) `draft_delete.js`（删除草稿）

```bash
npx -y bun scripts/wechat/draft_delete.js --media_id=MEDIA_ID
```

### 7) `draft_get.js`（获取草稿详情）

```bash
npx -y bun scripts/wechat/draft_get.js --media_id=MEDIA_ID
```

### 8) `get_current_autoreply_info.js`（获取自动回复规则）

```bash
npx -y bun scripts/wechat/get_current_autoreply_info.js
```

### 9) `draft_export_html.js`（导出草稿为可打开 HTML）

```bash
# 默认导出第 1 篇（index=0）
npx -y bun scripts/wechat/draft_export_html.js --media_id=MEDIA_ID

# 多图文导出第 N 篇
npx -y bun scripts/wechat/draft_export_html.js --media_id=MEDIA_ID --index=1

# 指定输出文件
npx -y bun scripts/wechat/draft_export_html.js --media_id=MEDIA_ID --out=article.html
```

说明：自动把微信正文图片的 `data-src` 修复为 `src`，导出后图片可直接显示。

### 10) `html_offline_images.js`（从 HTML 下载图片到本地并离线化）

```bash
# 基础用法：生成 <原文件名>.offline.html
npx -y bun scripts/wechat/html_offline_images.js --html=article.html

# 指定图片目录和输出文件
npx -y bun scripts/wechat/html_offline_images.js --html=article.html --assets=assets --out=article.offline.html
```

说明：扫描 HTML 中的 `img src/data-src`，下载图片到本地并重写为相对路径，便于离线打开。

## 常用调用顺序

```bash
# 1) 看总数
npx -y bun scripts/wechat/draft_count.js

# 2) 拉列表
npx -y bun scripts/wechat/draft_batchget.js --offset=0 --count=10 --no_content=1

# 3) 取某条详情
npx -y bun scripts/wechat/draft_get.js --media_id=xxx

# 4) 修改后更新
npx -y bun scripts/wechat/draft_update.js --json_file=payload.update.json

# 5) 不要的就删
npx -y bun scripts/wechat/draft_delete.js --media_id=xxx
```

## 快速查看帮助

```bash
npx -y bun scripts/wechat/<脚本名>.js --help
```
