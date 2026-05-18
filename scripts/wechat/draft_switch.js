#!/usr/bin/env bun
import { parseArgValue, postWeChatJson, printJson } from "./common.js";

function printHelp() {
  console.log(`用法:\n  npx -y bun scripts/wechat/draft_switch.js [--checkonly=1]\n\n说明:\n  不传 --checkonly 时执行开启草稿箱开关\n  传 --checkonly=1 时仅查询开关状态`);
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  const checkonly = parseArgValue("checkonly");
  if (checkonly !== undefined && checkonly !== "1") {
    throw new Error("checkonly 只支持 1");
  }

  const data = await postWeChatJson("/cgi-bin/draft/switch", undefined, {
    checkonly,
  });
  printJson(data);
}

main().catch((err) => {
  console.error(`执行失败: ${err.message}`);
  process.exit(1);
});
