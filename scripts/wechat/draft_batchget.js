#!/usr/bin/env bun
import { parseArgValue, postWeChatJson, printJson, toInt } from "./common.js";

function printHelp() {
  console.log(`用法:\n  npx -y bun scripts/wechat/draft_batchget.js [--offset=0] [--count=10] [--no_content=0] [--raw=1]\n\n参数:\n  --offset      起始偏移（默认 0）\n  --count       返回数量 1-20（默认 10）\n  --no_content  1=不返回 content 字段, 0=返回（默认 0）\n  --raw         1=输出接口完整原始响应；默认仅输出标题和 media_id`);
}

function toTitleMediaList(data) {
  const rows = [];
  for (const item of data.item || []) {
    const mediaId = item.media_id || "";
    const newsItems = item?.content?.news_item || [];
    if (newsItems.length === 0) {
      rows.push({ media_id: mediaId, title: "" });
      continue;
    }
    for (const n of newsItems) {
      rows.push({ media_id: mediaId, title: n.title || "" });
    }
  }
  return rows;
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  const offset = toInt(parseArgValue("offset", "0"), "offset");
  const count = toInt(parseArgValue("count", "10"), "count");
  const noContent = toInt(parseArgValue("no_content", "0"), "no_content");
  const raw = parseArgValue("raw", "0");

  if (offset < 0) throw new Error("offset 不能小于 0");
  if (count < 1 || count > 20) throw new Error("count 取值范围必须是 1 到 20");
  if (noContent !== 0 && noContent !== 1) throw new Error("no_content 只能是 0 或 1");
  if (raw !== "0" && raw !== "1") throw new Error("raw 只能是 0 或 1");

  const data = await postWeChatJson("/cgi-bin/draft/batchget", {
    offset,
    count,
    no_content: noContent,
  });

  if (raw === "1") {
    printJson(data);
    return;
  }

  printJson({
    total_count: data.total_count || 0,
    item_count: data.item_count || 0,
    list: toTitleMediaList(data),
  });
}

main().catch((err) => {
  console.error(`执行失败: ${err.message}`);
  process.exit(1);
});
