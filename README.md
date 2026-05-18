# yongpeng-blog

用于管理与部署博客内容的仓库，后续可通过 Git 仓库方案发布 `blog/` 目录到 Cloudflare。

## 目录说明

- `blog/`：待部署的站点内容（核心目录）
- `article/`：文章原始或中间文件
- `scripts/`：脚本工具

## 本地 Git

```bash
git add .
git commit -m "chore: init blog repo"
```

## 部署到 Cloudflare（后续）

可选两种方式：

1. Cloudflare Pages：将构建输出目录指向 `blog/`
2. Wrangler/Workers：以静态资源方式发布 `blog/`

后续接入时，建议先确定你要用 Pages 还是 Workers，再补对应配置文件。
