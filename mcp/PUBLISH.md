# 发布 cn-theories-mcp / Publishing checklist (for inkquest)

发布分两步：先发 npm 包，再把元数据发到官方 MCP Registry。Registry 只存元数据，所以 **npm 必须先发**。

Two stages: publish the npm package, then publish metadata to the official MCP Registry
(registry.modelcontextprotocol.io). The Registry only stores metadata, so **npm comes first**.

| 名称 | 值 |
| --- | --- |
| npm 包名 | `cn-theories-mcp`（2026-10-15 查过未被占用） |
| Registry 名称 | `io.github.grokkkkkk/cn-theories` |
| 版本 | `0.1.0`（`package.json` 与 `server.json` 两处的 `version` 都要一致） |
| server.json schema | `https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json` |

需要登录的步骤 / Steps needing a login: **步骤 3（npm）** 和 **步骤 6（GitHub，必须是 `grokkkkkk` 账号）**。

## 0. 先推送仓库 / Push the repo first

把整个仓库（含 `mcp/` 目录和最新的 `data/theories.json`、`theories/*.md`）推到 `main`。
服务器运行时读的是 `main` 上的数据，不推的话线上只有旧数据（目前线上 12 条，本地 14 条；新条目的 Markdown 会 404，只能回退到包内自带的那份）。

`mcp/.gitignore` 已排除 `node_modules/`、`dist/`、`data/`（`data/` 是构建时从仓库根目录复制的）。

## 1. 安装与构建 / Install & build

```bash
cd mcp
npm install
npm run build
npm test            # 应看到 ALL TESTS PASSED
```

## 2. 检查打包内容 / Check package contents

```bash
npm pack --dry-run   # 应有 dist/、data/theories.json、data/theories/**/*.md、README.md、LICENSE、package.json
```

## 3. 登录 npm 并发布 / npm login & publish  🔐 需要登录

```bash
npm login                     # 或 npm adduser；按提示在浏览器完成
npm whoami                    # 确认已登录
npm publish --access public   # prepublishOnly 会自动重新 build
```

- npm 账号若开了 2FA，发布时会要求输入一次性验证码。
- 发布后检查：`npm view cn-theories-mcp mcpName` 应输出 `io.github.grokkkkkk/cn-theories`。Registry 就是靠这个字段确认包归属的。
- 冒烟测试：`npx -y cn-theories-mcp`（会停在等待 stdio 输入，看到 stderr 输出 `running on stdio` 即正常，Ctrl+C 退出）。

## 4. 安装 mcp-publisher / Install mcp-publisher

```bash
# macOS / Linux
curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher && sudo mv mcp-publisher /usr/local/bin/
# 或 / or: brew install mcp-publisher
mcp-publisher --help
```

（Windows 见官方 quickstart：https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx）

## 5. 校验 server.json / Validate

```bash
cd mcp
mcp-publisher validate      # 应输出 ✅ server.json is valid（不需要登录）
```

## 6. 登录 Registry / Log in  🔐 需要 GitHub 登录

```bash
mcp-publisher login github
```

终端会显示一个设备码，打开 https://github.com/login/device 输入并授权。
**必须用 GitHub 账号 `grokkkkkk` 授权**，因为名称是 `io.github.grokkkkkk/...`，用别的账号会报 “You do not have permission to publish this server”。

## 7. 发布到 Registry / Publish

```bash
cd mcp
mcp-publisher publish
```

成功后验证：

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.grokkkkkk/cn-theories"
```

## 以后更新版本 / Releasing a new version

1. 只改了数据（`data/theories.json`、`theories/*.md`）：**不需要重新发布**，服务器运行时会从 GitHub 读最新数据，推送仓库即可。
2. 改了代码：同时把 `package.json` 和 `server.json` 里的版本号改成同一个新版本（`server.json` 里有两处：顶层 `version` 和 `packages[0].version`），然后重复步骤 1、3、5、7。
   Registry 里已发布的版本不能覆盖，每次都要用新版本号。

## 常见报错 / Troubleshooting

| 报错 | 处理 |
| --- | --- |
| Registry validation failed for package | npm 上的包缺 `mcpName`，或与 `server.json` 的 `name` 不一致；确认 npm 已发布成功 |
| Invalid or expired Registry JWT token | 重新 `mcp-publisher login github` |
| You do not have permission to publish this server | 登录的不是 `grokkkkkk` 这个 GitHub 账号 |
| npm 403 / name too similar | 包名被拒时可改成 `@grokkkkkk/cn-theories-mcp`（同时改 `package.json` 的 `name`、`server.json` 的 `identifier`、README 的 npx 命令），发布用 `npm publish --access public` |
