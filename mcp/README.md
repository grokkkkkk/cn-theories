# cn-theories-mcp

<!-- mcp-name: io.github.grokkkkkk/cn-theories -->

中文互联网理论库的 MCP 服务器。让 Claude、Cursor 等 AI 助手直接查询 [cn-theories](https://github.com/grokkkkkk/cn-theories) 收录的网络“理论”：大水理论、薄肌理论、黄毛思维、苹果安卓相对论……每条都带出处、原话和中英文简介。

An MCP server for [cn-theories](https://github.com/grokkkkkk/cn-theories), a sourced catalog of viral Chinese-internet "theories" (The Big Water Theory, The Lean Muscle Theory, iPhone vs Android Relativity…). Every entry has sources, the original quote, and summaries in Chinese and English.

## 安装 / Install

需要 Node.js 18+。Requires Node.js 18+.

**Claude Desktop** — `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cn-theories": {
      "command": "npx",
      "args": ["-y", "cn-theories-mcp"]
    }
  }
}
```

**Cursor** — `~/.cursor/mcp.json`（或项目里的 `.cursor/mcp.json`）:

```json
{
  "mcpServers": {
    "cn-theories": {
      "command": "npx",
      "args": ["-y", "cn-theories-mcp"]
    }
  }
}
```

**Claude Code**:

```bash
claude mcp add cn-theories -- npx -y cn-theories-mcp
```

## 工具 / Tools

| 工具 Tool | 参数 Arguments | 作用 What it does |
| --- | --- | --- |
| `search_theories` | `query`, `lang?`, `limit?` | 按中英文关键词搜索（名称、别名、标签、提出者、简介、原话）/ Keyword search in Chinese or English |
| `get_theory` | `id_or_name`, `include_markdown?`, `lang?` | 查看一条理论的含义、出处、原话；可附带完整条目 / One entry in full, optionally with its markdown write-up |
| `list_theories` | `year?`, `generation?`, `tag?`, `lang?` | 按年份、批次、标签列出 / Browse by year, generation or tag |
| `latest_theories` | `limit?`, `lang?` | 最近走红的理论 / Most recently viral theories |

`lang` 可选 `zh`、`en`、`both`（默认）。`lang` is `zh`, `en` or `both` (default).

资源 / Resources:

- `cn-theories://theories.json`：完整数据集 / the full dataset
- `cn-theories://theory/{id}`：单条理论的 Markdown 全文 / one entry's markdown

## 示例 / Example

> 大水理论是什么？/ What is the Big Water Theory?

```
## 大水理论 / The Big Water Theory
- **ID**: dashui-lilun
- **别名 / Aliases**: 喝大水
- **首次走红 / First viral**: 2026-10-05
- **简介**: 奶茶戒了，拎一瓶两升的白开水出门。
- **Summary**: Ditch the bubble tea. Carry a 2-liter bottle of water instead.
- **原话**: “弱者喝饮料，强者喝大水。”
...
```

## 数据 / Data

服务器运行时读取 GitHub 上最新的 `data/theories.json`（缓存 10 分钟），所以仓库一更新，查到的内容就跟着更新。网络不通时使用安装包里自带的那份。

At runtime the server reads the latest `data/theories.json` from GitHub (cached for 10 minutes), so new entries show up as soon as the repo is updated. If GitHub can't be reached, it falls back to the copy bundled in the package.

| 环境变量 Env var | 作用 Effect |
| --- | --- |
| `CN_THEORIES_OFFLINE=1` | 只用自带数据，不联网 / Use bundled data only |
| `CN_THEORIES_BRANCH` | 读取的分支，默认 `main` / Branch to read (default `main`) |
| `CN_THEORIES_RAW_BASE` | 自定义数据地址 / Custom raw base URL |

## 开发 / Development

```bash
npm install
npm run build   # 同步 ../data 与 ../theories 到 data/，然后编译 / syncs data, then compiles
npm test        # 用官方 SDK 客户端调用所有工具 / calls every tool via the SDK client
OFFLINE=1 npm test
```

## 许可 / License

代码 MIT；数据与文字 CC BY-SA 4.0。Code: MIT. Data and text: CC BY-SA 4.0. See [LICENSE](./LICENSE).
