#!/usr/bin/env bun
import { postWeChatJson, printJson, readJsonInput } from "./common.js";

function printHelp() {
  console.log(`用法:\n  npx -y bun scripts/wechat/draft_add.js --json='{"articles":[...]}'\n  npx -y bun scripts/wechat/draft_add.js --json_file=payload.json\n\n说明:\n  对应接口: /cgi-bin/draft/add\n  请求体需包含 articles 数组`);
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
  if (!Array.isArray(payload.articles) || payload.articles.length === 0) {
    throw new Error("请求体缺少 articles 数组，或 articles 为空");
  }

  const data = await postWeChatJson("/cgi-bin/draft/add", payload);
  printJson(data);
}

main().catch((err) => {
  console.error(`执行失败: ${err.message}`);
  process.exit(1);
});
