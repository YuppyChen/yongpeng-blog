---
target: blog/index.html
total_score: 24
p0_count: 0
p1_count: 2
timestamp: 2026-06-03T11-46-19Z
slug: blog-index-html
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | 静态站点本身简单，但外链、当前阅读路径和精选文章状态不够明确。 |
| 2 | Match System / Real World | 3 | 中文内容具体可信，但英文小标签和作品集语汇削弱普通 AI 用户的亲近感。 |
| 3 | User Control and Freedom | 2 | 文章列表很长，没有分类、筛选、搜索或回到顶部机制。 |
| 4 | Consistency and Standards | 2 | 首页是暗色品牌页，文章页仍像公众号导出稿，体验断裂。 |
| 5 | Error Prevention | 2 | 移动端 H1 溢出裁切；外链和本地文章入口没有清楚区分。 |
| 6 | Recognition Rather Than Recall | 2 | 读者需要自己从 29 篇标题里判断“工作流、复盘、工具、教程”的差别。 |
| 7 | Flexibility and Efficiency | 2 | 熟悉读者无法快速按主题定位文章；新读者也缺少推荐路径。 |
| 8 | Aesthetic and Minimalist Design | 3 | 首屏有强视觉记忆点，但更像作品集模板，内容任务被视觉压过。 |
| 9 | Error Recovery | 1 | 静态链接站几乎没有错误/空状态兜底；404、外链失效、图片失败没有设计。 |
| 10 | Help and Documentation | 2 | 联系入口存在，但“如何订阅、从哪里开始读”不够明确。 |
| **Total** | | **24/40** | **可用但目标错位明显** |

## Anti-Patterns Verdict

**LLM assessment**: 首页不是低质 AI 模板，但它落在“暗色编辑型个人作品集”的饱和美学里。Playfair Display + Inter、英文 tracked label、巨型 serif H1、右侧 featured card 的组合很完整，但对普通 AI 用户来说有点像“作者作品集”，不是“我能在这里解决具体 AI 问题”的博客入口。AI slop 最大风险不是廉价，而是过度风格化和模板语法。

**Deterministic scan**: 检测器发现 4 条问题：
- `overused-font` 2 条：`Inter` 在 `blog/index.html:10` 和 `blog/index.html:36`。
- `layout-transition` 1 条：`blog/index.html:290` 的 `transition: padding-left` 会触发布局重排。
- `numbered-section-markers` 1 条：文章序号 `01, 02, 03...` 被识别为模板化编号语法。

其中字体问题是低优先级，因为现有 `DESIGN.md` 已把 Inter 定为系统字体，身份保留优先；但编号和布局动画是有效问题。

**Visual overlays**: Browser 插件中的 `iab` 不可用，因此没有可靠的用户可见 overlay。已用本地 Chrome headless 作为 fallback 抓取桌面和移动截图。移动截图显示 H1 在 390px 宽度下横向溢出并被裁切，这是确定的视觉缺陷。

## Overall Impression

首屏有气质，但当前更像“一个会做 AI 的创作者主页”，不是“普通 AI 用户可以快速找到实用 AI 工作流的博客”。最大机会是把首页从作品集叙事改成读者任务导航：先让读者知道从哪里开始、每类文章解决什么问题，再保留现有暗色品牌气质。

## What's Working

- 暗色基调、暖金色和 serif 标题形成了清晰记忆点，和普通技术博客拉开了距离。
- 文章标题本身具体，有真实复盘和实用教程的味道，符合 `PRODUCT.md` 里的“踩坑复盘、具体可信”。
- 联系区的邮箱、GitHub、公众号入口完整，后续订阅和联系路径已经具备基础。

## Priority Issues

### [P1] 移动端首屏 H1 横向溢出

**Why it matters**: 390px 宽度下标题被裁切，读者第一眼看到的是未完成的页面，而不是品牌表达。移动端是中文博客的核心阅读场景，这个问题直接伤害信任。

**Fix**: 降低移动端 H1 最大字号，增加 `overflow-wrap` / `word-break` 策略，必要时重写标题换行。中文大标题不应依赖超大字号制造气势。

**Suggested command**: `$impeccable adapt blog/index.html`

### [P1] 首页叙事和目标读者错位

**Why it matters**: `PRODUCT.md` 定义的用户是普通 AI 用户，目标是实用工作流、个人思考和联系/订阅。但首屏的“Personal field notes / AI experiments”、巨型作品集标题和右侧 featured essay 更强调作者气质，读者不容易判断“我该从哪篇开始解决问题”。

**Fix**: 将首屏文案和下方列表改成读者任务入口，例如“AI 工具订阅 / AI 写作 / AI 音乐 / Claude Code / 自媒体复盘”等路径。保留品牌视觉，但让信息架构先服务读者。

**Suggested command**: `$impeccable clarify blog/index.html`

### [P2] 文章列表缺少分类和扫描机制

**Why it matters**: 29 篇文章按日期堆叠，只有编号和标题。新读者需要逐条读标题才能理解内容结构；老读者也不能快速找到教程、复盘、工具或项目类文章。

**Fix**: 给文章增加主题标签或分组，不一定需要复杂筛选。最小改法是在每行加入短标签，或在列表前放 4 个主题锚点。

**Suggested command**: `$impeccable layout blog/index.html`

### [P2] 首页和文章页视觉系统断裂

**Why it matters**: 首页是暗色个人品牌页，当前本地文章页仍是浅色公众号导出样式。用户从首页点“本地文章”后，会感觉进入了另一个站点。

**Fix**: 统一文章页阅读模板，至少统一导航、标题区、正文宽度、联系/订阅尾部和基础色彩。文章正文可以更安静，但不能像未整理的导出稿。

**Suggested command**: `$impeccable polish blog/article/chatgpt-plus-ios-turkey.html`

### [P3] hover 动画使用 `padding-left`

**Why it matters**: 文章行 hover 时改变 `padding-left` 会触发布局重排，列表越长越不稳。虽然影响不大，但这是容易修的质量问题。

**Fix**: 用 `transform: translateX(10px)` 替代 `padding-left`，并补 `prefers-reduced-motion`。

**Suggested command**: `$impeccable optimize blog/index.html`

## Persona Red Flags

**普通 AI 新手读者**: 进入首页后会被大标题吸引，但很难判断“我现在应该读哪篇”。导航只有文章、项目、联系，没有“从这里开始”或按需求划分的路径。长文章列表让他在第二屏开始放弃扫描。

**带着具体问题来的读者**: 如果他想解决 ChatGPT Plus 订阅、Claude Code 安装、NotebookLM 使用这类问题，需要在 29 篇标题里人工搜索。没有主题标签、没有教程入口、没有本地搜索。

**移动端读者**: 首屏标题溢出，GitHub 按钮占满一整行，顶部导航视觉权重偏高。读者还没看到文章列表，就已经经历一次横向裁切和较长的首屏滚动。

## Minor Observations

- `GitHub` CTA 在移动端占满整行，和“阅读最新文章”相比权重过高。
- “本地文章”这个按钮是内部开发语汇，用户不清楚它为什么重要。
- 右侧精选文章卡是纯 CSS 装饰，没有真实图像或内容摘要，信息价值偏低。
- 文章 `03` 标题里的 `chatgpt plus` 大小写不统一。
- 多个旧微信公众号链接是 `http://`，可能带来安全和信任问题。

## Questions to Consider

- 如果一个普通 AI 用户只给你 30 秒，他应该先看到“最新文章”，还是先看到“按问题找工作流”？
- 首页是否真的需要“项目”作为顶层导航，还是“工具流 / 教程 / 复盘”更符合读者任务？
- 这套暗色作品集气质要服务文章，还是文章在迁就这套视觉？
