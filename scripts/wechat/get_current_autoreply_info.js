#!/usr/bin/env bun
import { getWeChatJson, printJson } from "./common.js";

function printHelp() {
  console.log(`用法:\n  npx -y bun scripts/wechat/get_current_autoreply_info.js\n\n说明:\n  获取公众号当前自动回复规则（关注后自动回复、消息自动回复、关键词自动回复）`);
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  const data = await getWeChatJson("/cgi-bin/get_current_autoreply_info");
  printJson(data);
}

main().catch((err) => {
  console.error(`执行失败: ${err.message}`);
  process.exit(1);
});
