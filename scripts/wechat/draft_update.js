#!/usr/bin/env bun
import { postWeChatJson, printJson, readJsonInput } from "./common.js";

function printHelp() {
  console.log(`用法:\n  npx -y bun scripts/wechat/draft_update.js --json='{"media_id":"xx","index":0,"articles":{...}}'\n  npx -y bun scripts/wechat/draft_update.js --json_file=payload.json\n\n说明:\n  对应接口: /cgi-bin/draft/update\n  请求体需包含: media_id, index, articles`);
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  const payload = readJsonInput({ jsonArgName: "json", jsonFileArgName: "json_file" });
  if (!payload || typeof payload !== "object") {
    throw new Error("请求体必须是 JSON 对象");
  }
  if (!payload.media_id) {
    throw new Error("请求体缺少 media_id");
  }
  if (!Number.isInteger(payload.index)) {
    throw new Error("请求体缺少合法的 index（整数）");
  }
  if (!payload.articles || typeof payload.articles !== "object") {
    throw new Error("请求体缺少 articles 对象");
  }

  const data = await postWeChatJson("/cgi-bin/draft/update", payload);
  printJson(data);
}

main().catch((err) => {
  console.error(`执行失败: ${err.message}`);
  process.exit(1);
});
