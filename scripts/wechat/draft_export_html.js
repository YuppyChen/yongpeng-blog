#!/usr/bin/env bun
import path from "node:path";
import { writeFileSync } from "node:fs";
import { parseArgValue, postWeChatJson } from "./common.js";

function printHelp() {
  console.log(`用法:\n  npx -y bun scripts/wechat/draft_export_html.js --media_id=MEDIA_ID [--index=0] [--out=output.html]\n\n参数:\n  --media_id  草稿 media_id（必填）\n  --index     多图文时导出第几篇，默认 0\n  --out       输出 HTML 路径（可选）\n\n说明:\n  自动修复微信正文图片懒加载：将 data-src 补成 src，导出后可直接在浏览器查看图片。`);
}

function toInt(value, fieldName) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`${fieldName} 必须是大于等于 0 的整数`);
  }
  return n;
}

function sanitizeFileName(name) {
  return (name || "wechat-draft")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function normalizeWeChatImages(html) {
  return html.replace(/<img([^>]*?)data-src=("[^"]*"|'[^']*')([^>]*)>/gi, (m, a, ds, c) => {
    const attrs = `${a}${c}`;
    if (/\ssrc\s*=/.test(attrs)) return m;
    return `<img${a}src=${ds} data-src=${ds}${c}>`;
  });
}

function buildPage(title, bodyHtml) {
  return `<!doctype html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${title}</title>\n  <style>\n    body {\n      max-width: 900px;\n      margin: 40px auto;\n      padding: 0 16px;\n      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;\n      line-height: 1.75;\n      color: #222;\n    }\n    img { max-width: 100%; height: auto; }\n  </style>\n</head>\n<body>\n  <h1>${title}</h1>\n  ${bodyHtml}\n</body>\n</html>\n`;
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  const mediaId = parseArgValue("media_id");
  if (!mediaId) {
    throw new Error("缺少参数 --media_id");
  }

  const index = toInt(parseArgValue("index", "0"), "index");
  const out = parseArgValue("out");

  const data = await postWeChatJson("/cgi-bin/draft/get", { media_id: mediaId });
  const newsItems = Array.isArray(data.news_item) ? data.news_item : [];
  if (newsItems.length === 0) {
    throw new Error("草稿详情中没有 news_item");
  }
  if (index >= newsItems.length) {
    throw new Error(`index 超出范围：当前共有 ${newsItems.length} 篇，index 最大为 ${newsItems.length - 1}`);
  }

  const item = newsItems[index] || {};
  const title = item.title || `wechat-draft-${mediaId}`;
  const content = item.content || "";
  const normalized = normalizeWeChatImages(content);

  const outputPath = out
    ? path.resolve(process.cwd(), out)
    : path.resolve(process.cwd(), `${sanitizeFileName(title)}.html`);

  const page = buildPage(title, normalized);
  writeFileSync(outputPath, page, "utf8");

  console.log(JSON.stringify({
    ok: true,
    media_id: mediaId,
    index,
    title,
    output: outputPath,
  }, null, 2));
}

main().catch((err) => {
  console.error(`执行失败: ${err.message}`);
  process.exit(1);
});
