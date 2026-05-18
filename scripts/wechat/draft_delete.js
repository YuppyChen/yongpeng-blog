#!/usr/bin/env bun
import { parseArgValue, postWeChatJson, printJson } from "./common.js";

function printHelp() {
  console.log(`用法:\n  npx -y bun scripts/wechat/draft_delete.js --media_id=MEDIA_ID\n\n说明:\n  删除草稿（不可撤销）`);
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

  const data = await postWeChatJson("/cgi-bin/draft/delete", {
    media_id: mediaId,
  });
  printJson(data);
}

main().catch((err) => {
  console.error(`执行失败: ${err.message}`);
  process.exit(1);
});
