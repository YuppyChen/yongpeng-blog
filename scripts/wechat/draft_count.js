#!/usr/bin/env bun
import { getWeChatJson, printJson } from "./common.js";

function printHelp() {
  console.log(`用法:\n  npx -y bun scripts/wechat/draft_count.js\n\n说明:\n  获取草稿总数（不返回内容）`);
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  const data = await getWeChatJson("/cgi-bin/draft/count");
  printJson(data);
}

main().catch((err) => {
  console.error(`执行失败: ${err.message}`);
  process.exit(1);
});
