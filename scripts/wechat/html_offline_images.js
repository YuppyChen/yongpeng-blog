#!/usr/bin/env bun
import path from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

function printHelp() {
  console.log(`用法:\n  npx -y bun scripts/wechat/html_offline_images.js --html=article.html [--assets=assets] [--out=article.offline.html]\n\n参数:\n  --html    输入 HTML 文件路径（必填）\n  --assets  图片保存目录（相对 html 所在目录，默认 assets）\n  --out     输出 HTML 文件（默认 <原名>.offline.html）\n\n说明:\n  该脚本会下载 HTML 中 img 的 src/data-src 到本地，并重写为相对路径。\n  注意：若源站有防盗链（如微信图床），下载可能失败。`);
}

function parseArg(name, fallback = undefined) {
  const p = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(p));
  return arg ? arg.slice(p.length) : fallback;
}

function sanitizeExt(url) {
  const clean = url.split("?")[0].split("#")[0];
  const ext = path.extname(clean).toLowerCase();
  if (ext && ext.length <= 8) return ext;
  return "";
}

function toFileNameBase(url, idx) {
  const h = createHash("sha1").update(url).digest("hex").slice(0, 12);
  return `${String(idx).padStart(3, "0")}_${h}`;
}

function extractImgUrls(html) {
  const urls = [];
  const re = /<img\b[^>]*>/gi;
  const attrRe = /\b(?:src|data-src)=("([^"]+)"|'([^']+)')/i;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const a = tag.match(attrRe);
    const u = a?.[2] || a?.[3];
    if (!u) continue;
    const decoded = u.replace(/&amp;/g, "&");
    if (!/^https?:\/\//i.test(decoded)) continue;
    urls.push(decoded);
  }
  return [...new Set(urls)];
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function htmlEncodeAmp(s) {
  return s.replace(/&/g, "&amp;");
}

function extFromContentType(contentType) {
  const t = (contentType || "").toLowerCase();
  if (t.includes("image/png")) return ".png";
  if (t.includes("image/jpeg")) return ".jpg";
  if (t.includes("image/jpg")) return ".jpg";
  if (t.includes("image/webp")) return ".webp";
  if (t.includes("image/gif")) return ".gif";
  if (t.includes("image/svg+xml")) return ".svg";
  if (t.includes("image/bmp")) return ".bmp";
  return "";
}

async function downloadFile(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://mp.weixin.qq.com/",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const ab = await res.arrayBuffer();
  if (!ab.byteLength) throw new Error("empty body");
  return {
    buffer: Buffer.from(ab),
    contentType: res.headers.get("content-type") || "",
  };
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  const htmlArg = parseArg("html");
  if (!htmlArg) throw new Error("缺少参数 --html");

  const htmlPath = path.resolve(process.cwd(), htmlArg);
  if (!existsSync(htmlPath)) throw new Error(`HTML 文件不存在: ${htmlArg}`);

  const assetsDirName = parseArg("assets", "assets");
  const outArg = parseArg("out");

  const htmlDir = path.dirname(htmlPath);
  const htmlBase = path.basename(htmlPath, path.extname(htmlPath));
  const outPath = outArg
    ? path.resolve(process.cwd(), outArg)
    : path.join(htmlDir, `${htmlBase}.offline.html`);

  const assetsDir = path.resolve(htmlDir, assetsDirName);
  mkdirSync(assetsDir, { recursive: true });

  let html = readFileSync(htmlPath, "utf8");
  const urls = extractImgUrls(html);

  const report = [];
  let idx = 1;
  for (const url of urls) {
    const filenameBase = toFileNameBase(url, idx++);

    try {
      const dl = await downloadFile(url);
      const ext = sanitizeExt(url) || extFromContentType(dl.contentType) || ".bin";
      const filename = `${filenameBase}${ext}`;
      const absFile = path.join(assetsDir, filename);
      const relFile = path.relative(path.dirname(outPath), absFile).split(path.sep).join("/");
      writeFileSync(absFile, dl.buffer);
      const candidates = [url, htmlEncodeAmp(url)];
      html = html
        .replace(
          new RegExp(`src=(\"|')(${candidates.map(escapeRegExp).join("|")})(\"|')`, "g"),
          `src="${relFile}"`,
        )
        .replace(
          new RegExp(`data-src=(\"|')(${candidates.map(escapeRegExp).join("|")})(\"|')`, "g"),
          `data-src="${relFile}"`,
        );
      report.push({ url, file: relFile, status: "ok" });
    } catch (err) {
      report.push({ url, status: "failed", error: err.message });
    }
  }

  writeFileSync(outPath, html, "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        input: htmlPath,
        output: outPath,
        assets_dir: assetsDir,
        total_images: urls.length,
        success: report.filter((x) => x.status === "ok").length,
        failed: report.filter((x) => x.status === "failed").length,
        report,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(`执行失败: ${err.message}`);
  process.exit(1);
});
