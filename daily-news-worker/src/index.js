const TIME_ZONE = "Asia/Shanghai";
const USER_AGENT = "daily-news-worker/1.0";
const MAX_MARKDOWN_LENGTH = 18000;
const DEFAULT_FETCH_TIMEOUT_MS = 25000;

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      return htmlResponse(renderErrorPage(error), 500);
    }
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(refreshDaily(getShanghaiDate(), env));
  },
};

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = normalizePath(url.pathname);

  if (path === "/" || path === "/daily/") {
    return serveLatest(env);
  }

  const dailyMatch = path.match(/^\/daily\/(\d{4}-\d{2}-\d{2})$/);
  if (dailyMatch) {
    return serveDate(dailyMatch[1], env);
  }

  if (path === "/refresh") {
    const date = url.searchParams.get("date") || getShanghaiDate();
    if (!isValidDate(date)) {
      return textResponse("Invalid date. Expected YYYY-MM-DD.", 400);
    }
    const html = await refreshDaily(date, env);
    return htmlResponse(html, 200, { "Cache-Control": "no-store" });
  }

  return textResponse("Not Found", 404);
}

async function serveLatest(env) {
  const latestDate = await env.DAILY_NEWS.get("daily:latest");
  if (latestDate && isValidDate(latestDate)) {
    const cachedHtml = await env.DAILY_NEWS.get(`daily:${latestDate}`);
    if (cachedHtml) {
      return htmlResponse(cachedHtml);
    }
  }

  const html = await refreshDaily(getShanghaiDate(), env);
  return htmlResponse(html);
}

async function serveDate(date, env) {
  if (!isValidDate(date)) {
    return textResponse("Invalid date. Expected YYYY-MM-DD.", 400);
  }

  const cachedHtml = await env.DAILY_NEWS.get(`daily:${date}`);
  if (cachedHtml) {
    return htmlResponse(cachedHtml);
  }

  const html = await refreshDaily(date, env);
  return htmlResponse(html);
}

async function refreshDaily(date, env) {
  const html = await buildDailyPage(date);
  await env.DAILY_NEWS.put(`daily:${date}`, html);
  await putLatestDate(date, env);
  return html;
}

async function putLatestDate(date, env) {
  const latest = await env.DAILY_NEWS.get("daily:latest");
  if (!latest || date >= latest) {
    await env.DAILY_NEWS.put("daily:latest", date);
  }
}

async function buildDailyPage(date) {
  const sources = await Promise.all([
    fetchAiHot(date),
    fetchBuilderPulse(date),
    fetchHorizon(date),
    fetchGitHubTrending(),
  ]);

  return renderPage(date, {
    aihot: sources[0],
    builderPulse: sources[1],
    horizon: sources[2],
    githubTrending: sources[3],
  });
}

async function fetchAiHot(date) {
  const url = `https://aihot.virxact.com/daily/${date}`;
  return fetchTextSource("AI HOT 日报", url, async (text) => ({
    type: "stories",
    items: extractAiHotItems(text, 24),
  }), { timeoutMs: 35000, retries: 1 });
}

async function fetchBuilderPulse(date) {
  const year = date.slice(0, 4);
  const url = `https://raw.githubusercontent.com/BuilderPulse/BuilderPulse/main/zh/${year}/${date}.md`;
  return fetchTextSource("BuilderPulse", url, async (text) => ({
    type: "html",
    html: markdownToHtml(prepareBuilderPulseMarkdown(text)),
  }), { timeoutMs: 45000, retries: 1 });
}

async function fetchHorizon(date) {
  const [year, month, day] = date.split("-");
  const url = `https://thysrael.github.io/Horizon/${year}/${month}/${day}/summary-zh.html`;
  return fetchTextSource("Horizon 中文摘要", url, async (text) => ({
    type: "stories",
    items: extractHorizonItems(text, 20),
  }), { timeoutMs: 45000, retries: 1 });
}

async function fetchGitHubTrending() {
  const url = "https://github.com/trending?since=daily";
  return fetchTextSource("GitHub Trending", url, async (text) => ({
    type: "trending",
    repos: extractTrendingRepos(text, 20),
  }), {
    timeoutMs: 60000,
    retries: 1,
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
}

async function fetchTextSource(name, url, parse, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_FETCH_TIMEOUT_MS;
  const retries = options.retries || 0;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html, text/markdown, text/plain;q=0.9, */*;q=0.8",
          ...options.headers,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      const parsed = await parse(text);
      return { ok: true, name, url, ...parsed };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    ok: false,
    name,
    url,
    error: formatFetchError(lastError, timeoutMs),
  };
}

function formatFetchError(error, timeoutMs) {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return `请求超过 ${Math.round(timeoutMs / 1000)} 秒未完成`;
  }
  return error instanceof Error ? error.message : String(error);
}

function extractReadableLines(html, options = {}) {
  const limit = options.limit || 30;
  const maxLength = options.maxLength || 260;
  const text = htmlToText(html);
  const lines = text
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter((line) => isUsefulLine(line))
    .map((line) => truncateText(line, maxLength));

  return unique(lines).slice(0, limit);
}

function extractAiHotItems(html, limit) {
  const chunks = html.split('<div class="m-daily-entry">').slice(1);
  const items = [];

  for (const chunk of chunks) {
    const linkMatch = chunk.match(/<a\b([^>]*)>([\s\S]*?)<\/a>/i);
    const summaryMatch = chunk.match(/<p[^>]*class="m-daily-entry-sum"[^>]*>([\s\S]*?)<\/p>/i);
    const sourceMatch = chunk.match(/<div[^>]*class="m-daily-entry-src"[^>]*>([\s\S]*?)<\/div>/i);

    if (!linkMatch || !summaryMatch) {
      continue;
    }

    const hrefMatch = linkMatch[1].match(/\bhref="([^"]+)"/i);
    const title = normalizeWhitespace(htmlToText(linkMatch[2]));
    const summary = normalizeWhitespace(htmlToText(summaryMatch[1]));
    const meta = sourceMatch ? normalizeWhitespace(htmlToText(sourceMatch[1])) : "";

    if (!title || !summary || hasStory(items, title)) {
      continue;
    }

    items.push({
      title: truncateText(title, 96),
      summary: truncateText(summary, 220),
      meta: truncateText(meta, 56),
      url: hrefMatch ? hrefMatch[1] : "",
    });

    if (items.length >= limit) {
      break;
    }
  }

  if (items.length > 0) {
    return items;
  }

  return linesToStories(extractReadableLines(html, { limit, maxLength: 220 }));
}

function extractHorizonItems(html, limit) {
  const mainMatch = html.match(/<main\b[\s\S]*?<\/main>/i);
  const content = mainMatch ? mainMatch[0] : html;
  const chunks = content.match(/<h2\b[\s\S]*?(?=<hr\s*\/?>|<h2\b|<\/main>)/gi) || [];
  const items = [];

  for (const chunk of chunks) {
    const headingMatch = chunk.match(/<h2\b[\s\S]*?<\/h2>/i);
    const linkMatch = headingMatch ? headingMatch[0].match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i) : null;
    const summaryMatch = chunk.match(/<\/h2>[\s\S]*?<p>([\s\S]*?)<\/p>/i);
    const paragraphs = [...chunk.matchAll(/<p>([\s\S]*?)<\/p>/gi)].map((match) => normalizeWhitespace(htmlToText(match[1])));
    const source = paragraphs.find((line) => isSourceLine(line)) || "";
    const title = linkMatch
      ? normalizeWhitespace(htmlToText(linkMatch[2]))
      : headingMatch
        ? normalizeWhitespace(htmlToText(headingMatch[0]))
        : "";
    const summary = summaryMatch ? normalizeWhitespace(htmlToText(summaryMatch[1])) : "";

    if (!title || !summary || hasStory(items, title)) {
      continue;
    }

    items.push({
      title: truncateText(title.replace(/\s*⭐️\s*[0-9.]+\/10\s*$/, ""), 96),
      summary: truncateText(summary, 230),
      meta: truncateText(source, 64),
      url: linkMatch ? linkMatch[1] : "",
    });

    if (items.length >= limit) {
      break;
    }
  }

  if (items.length > 0) {
    return items;
  }

  return linesToStories(extractReadableLines(html, { limit, maxLength: 220 }));
}

function linesToStories(lines) {
  return lines
    .filter((line) => !isSourceLine(line))
    .map((line) => ({
      title: truncateText(line, 88),
      summary: "",
      meta: "",
      url: "",
    }));
}

function hasStory(items, title) {
  const key = normalizeStoryKey(title);
  return items.some((item) => normalizeStoryKey(item.title) === key);
}

function normalizeStoryKey(value) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function isSourceLine(line) {
  return /^(公众号|X|GitHub|TechCrunch|The Decoder|Cloudflare|LMSYS|MarkTechPost|telegram|github|lobsters|reddit|product hunt|arxiv|rss|hn)\s*[：·]/i.test(line)
    || /^[a-z]+ · .+ · \d+月\d+日/i.test(line);
}

function prepareBuilderPulseMarkdown(markdown) {
  const excerpt = markdown.split(/\n##\s+发现机会\b/)[0] || markdown;
  return excerpt
    .slice(0, MAX_MARKDOWN_LENGTH)
    .split("\n")
    .filter((line) => !line.trim().startsWith("|"))
    .join("\n");
}

function htmlToText(html) {
  return decodeHtmlEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav\b[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header\b[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer\b[\s\S]*?<\/footer>/gi, " ")
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
      .replace(/<\/(p|div|section|article|li|h1|h2|h3|h4|h5|h6|br)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
}

function isUsefulLine(line) {
  if (!line || line.length < 8) {
    return false;
  }

  const noise = [
    /^登录$/,
    /^注册$/,
    /^sign in$/i,
    /^sign up$/i,
    /^skip to content$/i,
    /^skip to the content\.?$/i,
    /^github$/i,
    /^github trending$/i,
    /^toggle navigation$/i,
    /^navigation menu$/i,
    /^search or jump to/i,
    /^product$/i,
    /^solutions$/i,
    /^resources$/i,
    /^open source$/i,
    /^enterprise$/i,
    /^pricing$/i,
    /^notifications$/i,
  ];

  return !noise.some((pattern) => pattern.test(line));
}

function extractTrendingRepos(html, limit) {
  const articles = html.match(/<article\b[\s\S]*?<\/article>/gi) || [];
  return articles
    .map(parseTrendingArticle)
    .filter((repo) => repo.name && repo.url)
    .slice(0, limit);
}

function parseTrendingArticle(article) {
  const linkMatch = article.match(/<h2[\s\S]*?<a[^>]+href="([^"]+)"[\s\S]*?<\/a>[\s\S]*?<\/h2>/i);
  const href = linkMatch ? linkMatch[1] : "";
  const name = linkMatch ? normalizeWhitespace(htmlToText(linkMatch[0]).replace(/\s*\/\s*/g, "/")) : "";
  const descriptionMatch = article.match(/<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/i)
    || article.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  const languageMatch = article.match(/itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\/span>/i);
  const articleText = normalizeWhitespace(htmlToText(article));
  const starsTodayMatch = articleText.match(/([0-9][0-9,.\s]*)\s+stars?\s+today/i);

  return {
    name,
    url: href.startsWith("http") ? href : `https://github.com${href}`,
    description: descriptionMatch ? normalizeWhitespace(htmlToText(descriptionMatch[1])) : "",
    language: languageMatch ? normalizeWhitespace(htmlToText(languageMatch[1])) : "",
    starsToday: starsTodayMatch ? `${normalizeWhitespace(starsTodayMatch[1])} stars today` : "",
  };
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let listTag = "";

  const closeList = () => {
    if (listTag) {
      html.push(`</${listTag}>`);
      listTag = "";
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level + 2}>${renderInlineMarkdown(heading[2])}</h${level + 2}>`);
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      if (listTag !== "ul") {
        closeList();
        html.push("<ul>");
        listTag = "ul";
      }
      html.push(`<li>${renderInlineMarkdown(bullet[1])}</li>`);
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      if (listTag !== "ol") {
        closeList();
        html.push("<ol>");
        listTag = "ol";
      }
      html.push(`<li>${renderInlineMarkdown(ordered[1])}</li>`);
      continue;
    }

    const quote = line.match(/^>\s*(.+)$/);
    if (quote) {
      closeList();
      html.push(`<blockquote>${renderInlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    closeList();
    html.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  closeList();

  return html.join("\n");
}

function renderInlineMarkdown(text) {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_match, label, url) => {
      return `<a href="${escapeAttr(url)}" target="_blank" rel="noreferrer">${label}</a>`;
    });
}

function renderPage(date, sources) {
  const title = `AI 每日雷达｜${date}`;
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0b0c0a;
      --panel: #151712;
      --panel-soft: #1c1f18;
      --text: #f1f0e8;
      --muted: #a8ad9d;
      --line: #303528;
      --accent: #f2b84b;
      --accent-2: #65d6ad;
      --danger: #ff8c7a;
      --shadow: rgba(0, 0, 0, 0.36);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 18% 0%, rgba(242, 184, 75, 0.11), transparent 31rem),
        linear-gradient(145deg, #0b0c0a 0%, #10130e 52%, #090a08 100%);
      color: var(--text);
      font-family: ui-sans-serif, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
      line-height: 1.72;
    }

    a {
      color: var(--accent-2);
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    .page {
      width: min(1120px, calc(100% - 32px));
      margin: 0 auto;
      padding: 44px 0 56px;
    }

    .hero {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 24px;
      align-items: end;
      padding: 28px 0 24px;
      border-bottom: 1px solid var(--line);
    }

    .kicker {
      margin: 0 0 10px;
      color: var(--accent);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-family: ui-serif, Georgia, "Songti SC", "SimSun", serif;
      font-size: clamp(40px, 8vw, 82px);
      line-height: 0.96;
      letter-spacing: 0;
    }

    .subtitle {
      max-width: 680px;
      margin: 18px 0 0;
      color: var(--muted);
      font-size: 17px;
    }

    .date-pill {
      min-width: 154px;
      padding: 14px 16px;
      border: 1px solid var(--line);
      background: rgba(28, 31, 24, 0.72);
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 16px 48px var(--shadow);
    }

    .date-pill span {
      display: block;
      color: var(--muted);
      font-size: 12px;
    }

    .date-pill strong {
      display: block;
      margin-top: 3px;
      font-size: 17px;
    }

    .toc {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 28px 0;
    }

    .toc a {
      min-height: 50px;
      padding: 13px 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(21, 23, 18, 0.82);
      color: var(--text);
      font-weight: 700;
    }

    .section {
      margin-top: 18px;
      padding: 24px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(21, 23, 18, 0.9);
      box-shadow: 0 18px 54px var(--shadow);
    }

    .section-head {
      display: flex;
      gap: 16px;
      justify-content: space-between;
      align-items: start;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--line);
      margin-bottom: 18px;
    }

    h2 {
      margin: 0;
      font-size: 24px;
      line-height: 1.25;
      letter-spacing: 0;
    }

    .source-link {
      flex: 0 0 auto;
      color: var(--accent);
      font-size: 14px;
      font-weight: 700;
    }

    .news-list {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .news-list li {
      padding: 13px 14px;
      border: 1px solid rgba(48, 53, 40, 0.78);
      border-radius: 8px;
      background: var(--panel-soft);
    }

    .story-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .story-card {
      min-width: 0;
      padding: 16px;
      border: 1px solid rgba(48, 53, 40, 0.78);
      border-radius: 8px;
      background: linear-gradient(180deg, rgba(28, 31, 24, 0.95), rgba(20, 22, 18, 0.95));
    }

    .story-topline {
      min-height: 20px;
      margin-bottom: 8px;
      color: var(--accent);
      font-size: 12px;
      font-weight: 700;
    }

    .story-topline span {
      display: inline-block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      vertical-align: top;
    }

    .story-title {
      display: block;
      color: var(--text);
      font-size: 17px;
      font-weight: 800;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }

    .story-summary {
      margin: 9px 0 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.65;
    }

    .markdown-body h3,
    .markdown-body h4,
    .markdown-body h5 {
      margin: 24px 0 10px;
      line-height: 1.35;
    }

    .markdown-body h3 {
      color: var(--accent);
      font-size: 21px;
    }

    .markdown-body h4 {
      font-size: 18px;
    }

    .markdown-body h5 {
      color: var(--muted);
      font-size: 16px;
    }

    .markdown-body p,
    .markdown-body ul {
      margin: 10px 0;
    }

    .markdown-body p {
      color: var(--muted);
    }

    .markdown-body ul {
      padding-left: 22px;
    }

    .markdown-body blockquote {
      margin: 14px 0;
      padding: 10px 14px;
      border-left: 3px solid var(--accent);
      background: rgba(242, 184, 75, 0.08);
      color: var(--text);
    }

    .markdown-body table {
      display: block;
      width: 100%;
      overflow-x: auto;
      border-collapse: collapse;
      color: var(--muted);
    }

    .markdown-body td,
    .markdown-body th {
      padding: 8px;
      border: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }

    .repo-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .repo-card {
      min-width: 0;
      padding: 16px;
      border: 1px solid rgba(48, 53, 40, 0.8);
      border-radius: 8px;
      background: var(--panel-soft);
    }

    .repo-name {
      display: block;
      overflow-wrap: anywhere;
      font-size: 17px;
      font-weight: 800;
    }

    .repo-desc {
      margin: 9px 0 12px;
      color: var(--muted);
      font-size: 14px;
    }

    .repo-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      color: var(--text);
      font-size: 12px;
    }

    .repo-meta span {
      padding: 4px 8px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(11, 12, 10, 0.55);
    }

    .empty,
    .failure {
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(11, 12, 10, 0.52);
      color: var(--muted);
    }

    .failure strong {
      display: block;
      color: var(--danger);
      margin-bottom: 8px;
    }

    footer {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 14px;
    }

    footer p {
      margin: 6px 0;
    }

    @media (max-width: 760px) {
      .page {
        width: min(100% - 22px, 1120px);
        padding-top: 24px;
      }

      .hero {
        grid-template-columns: 1fr;
      }

      .date-pill {
        width: 100%;
        text-align: left;
      }

      .toc,
      .story-list,
      .repo-grid {
        grid-template-columns: 1fr;
      }

      .section {
        padding: 18px;
      }

      .section-head {
        display: block;
      }

      .source-link {
        display: inline-block;
        margin-top: 8px;
      }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="hero">
      <div>
        <p class="kicker">Daily AI Intelligence</p>
        <h1>AI 每日雷达</h1>
        <p class="subtitle">自动聚合 AI 日报、Builder 动态、Horizon 摘要和 GitHub Trending。</p>
      </div>
      <div class="date-pill">
        <span>北京时间</span>
        <strong>${escapeHtml(date)}</strong>
      </div>
    </header>

    <nav class="toc" aria-label="日报目录">
      <a href="#aihot">AI HOT 日报</a>
      <a href="#builderpulse">BuilderPulse</a>
      <a href="#horizon">Horizon</a>
      <a href="#github-trending">GitHub Trending</a>
    </nav>

    ${renderStorySection("aihot", "AI HOT 日报", sources.aihot)}
    ${renderHtmlSection("builderpulse", "BuilderPulse", sources.builderPulse)}
    ${renderStorySection("horizon", "Horizon 中文摘要", sources.horizon)}
    ${renderTrendingSection("github-trending", "GitHub Trending", sources.githubTrending)}

    <footer>
      <p>本页面由 Cloudflare Worker 自动生成。</p>
      <p>内容仅做个人阅读聚合和索引。</p>
      <p>完整内容请访问原始来源。</p>
    </footer>
  </main>
</body>
</html>`;
}

function renderListSection(id, title, source) {
  return renderSection(id, title, source, () => {
    if (!source.items || source.items.length === 0) {
      return `<div class="empty">没有提取到可展示内容，请查看原始来源。</div>`;
    }
    return `<ul class="news-list">${source.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  });
}

function renderStorySection(id, title, source) {
  return renderSection(id, title, source, () => {
    if (!source.items || source.items.length === 0) {
      return `<div class="empty">没有提取到可展示内容，请查看原始来源。</div>`;
    }

    return `<div class="story-list">${source.items.map((item) => `
      <article class="story-card">
        <div class="story-topline">
          ${item.meta ? `<span>${escapeHtml(item.meta)}</span>` : `<span>来源条目</span>`}
        </div>
        ${item.url
          ? `<a class="story-title" href="${escapeAttr(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>`
          : `<h3 class="story-title">${escapeHtml(item.title)}</h3>`}
        ${item.summary ? `<p class="story-summary">${escapeHtml(item.summary)}</p>` : ""}
      </article>
    `).join("")}</div>`;
  });
}

function renderHtmlSection(id, title, source) {
  return renderSection(id, title, source, () => {
    if (!source.html) {
      return `<div class="empty">没有提取到可展示内容，请查看原始来源。</div>`;
    }
    return `<div class="markdown-body">${source.html}</div>`;
  });
}

function renderTrendingSection(id, title, source) {
  return renderSection(id, title, source, () => {
    if (!source.repos || source.repos.length === 0) {
      return `<div class="empty">没有提取到仓库信息，请查看原始来源。</div>`;
    }

    return `<div class="repo-grid">${source.repos.map((repo) => `
      <article class="repo-card">
        <a class="repo-name" href="${escapeAttr(repo.url)}" target="_blank" rel="noreferrer">${escapeHtml(repo.name)}</a>
        ${repo.description ? `<p class="repo-desc">${escapeHtml(truncateText(repo.description, 180))}</p>` : `<p class="repo-desc">暂无描述</p>`}
        <div class="repo-meta">
          ${repo.language ? `<span>${escapeHtml(repo.language)}</span>` : ""}
          ${repo.starsToday ? `<span>${escapeHtml(repo.starsToday)}</span>` : ""}
        </div>
      </article>
    `).join("")}</div>`;
  });
}

function renderSection(id, title, source, renderContent) {
  const sourceUrl = source && source.url ? source.url : "#";
  return `<section class="section" id="${escapeAttr(id)}">
    <div class="section-head">
      <h2>${escapeHtml(title)}</h2>
      <a class="source-link" href="${escapeAttr(sourceUrl)}" target="_blank" rel="noreferrer">查看原始来源</a>
    </div>
    ${source.ok ? renderContent() : renderFailure(source)}
  </section>`;
}

function renderFailure(source) {
  return `<div class="failure">
    <strong>${escapeHtml(source.name)}抓取失败</strong>
    <div>${escapeHtml(source.error || "未知错误")}</div>
    <a href="${escapeAttr(source.url)}" target="_blank" rel="noreferrer">查看原始来源</a>
  </div>`;
}

function renderErrorPage(error) {
  const message = error instanceof Error ? error.message : String(error);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Worker Error</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #0b0c0a;
      color: #f1f0e8;
      font-family: ui-sans-serif, "PingFang SC", "Microsoft YaHei", sans-serif;
    }
    main {
      width: min(720px, calc(100% - 32px));
      padding: 24px;
      border: 1px solid #303528;
      border-radius: 8px;
      background: #151712;
    }
    p { color: #ff8c7a; }
  </style>
</head>
<body>
  <main>
    <h1>日报生成失败</h1>
    <p>${escapeHtml(message)}</p>
  </main>
</body>
</html>`;
}

function htmlResponse(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...headers,
    },
  });
}

function textResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function normalizePath(pathname) {
  if (pathname === "/daily") {
    return "/daily/";
  }
  return pathname;
}

function getShanghaiDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function unique(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }
  return result;
}

function truncateText(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}…`;
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCharCode(parseInt(code, 16)));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
