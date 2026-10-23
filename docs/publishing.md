# 发布流程

包通过 **npm Trusted Publishing（OIDC）** 发布，仓库里不存任何 npm token，也不依赖某个人的 2FA 设备。推一个 `v*` 标签就发。

## 一次性配置（只需做一次）

打开 <https://www.npmjs.com/package/animal-island-wx/access>，在 **Trusted Publisher** 区块选 **GitHub Actions**，填：

| 字段                 | 值                 |
| -------------------- | ------------------ |
| Organization or user | `lns567`           |
| Repository           | `animal-island-wx` |
| Workflow filename    | `publish.yml`      |
| Environment name     | 留空               |

**还要勾上 `Allow npm publish`。** npm 默认只给 `npm stage publish`（暂存）权限 —— 走暂存还得有人去网页点批准，等于没自动化。勾了才是直接发布。

> 所有字段都区分大小写，`Workflow filename` 只写文件名，不带 `.github/workflows/` 前缀。npm 保存时**不校验**这些值，配错了只会在发布那一刻报 `ENEEDAUTH`。

同时建议去 <https://www.npmjs.com/settings/lns567/profile> 把之前那个 bypass-2FA 的 Granular Access Token 吊销掉 —— 现在用不上了，留着一个长期写权限令牌反而是风险。

## 日常发布

```bash
# 1. 改版本号（不要手改 package.json，让 npm 同步改 lockfile）
npm version patch   # 或 minor / major

# 2. 跑一遍本地 CI，全绿再推
npm run ci

# 3. 推提交和标签，workflow 自动接管
git push origin main --follow-tags
```

`v*` 标签一推，`.github/workflows/publish.yml` 会依次：

1. 校验 npm CLI ≥ 11.5.1（OIDC 的硬性要求，低于就自动升到 npm@11）
2. `npm ci` → `npm run build` → `npm run check` → 生成预览页 → 校验产物
3. **版本一致性检查**：标签版本必须等于 `package.json` 版本；且该版本在 npm 上必须还不存在
4. `npm pack --dry-run` 打印文件清单
5. `npm publish --access public` —— OIDC 自动换取短期令牌，**自动附带 provenance 签名**

## 试跑而不发布

Actions 页面手动触发 `Publish` workflow，`dry_run` 保持默认勾选 → 只跑构建和全部校验，不执行 publish。

## 为什么不用 token

npm 从 2026-07 起收紧了两件事，让长令牌这条路彻底走不通：

- bypass-2FA 的 Granular Access Token **不能再直接 publish**，只能打进 staging 区，而 staging 的 `approve` 必须有人在浏览器里点一次 Passkey —— 每次发版都要人守着；
- 同一个改动也让这类 token **连 `npm unpublish` 都不允许**（0.2.0 发布时 registry 里残留的 `0.0.0-stage` 占位版本就是这么卡住的，只能去网页删）。

OIDC 没有令牌可泄露、没有过期时间、不绑具体人的设备，也是 npm 官方现在的推荐做法。

## 出问题看这里

| 报错                                   | 原因                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `ENEEDAUTH` / `Unable to authenticate` | trusted publisher 字段填错（大小写、文件名），或 workflow 里缺 `id-token: write` |
| `403 ... may not perform this action`  | 忘了勾 `Allow npm publish`，只授予了 stage 权限                                  |
| `E404` / `404 Not Found`               | `package.json` 的 `repository.url` 与 GitHub 仓库不是同一个，npm 用来校验来源    |
| `EPUBLISHCONFLICT`                     | 该版本已存在 —— 版本一致性检查本该提前拦住，说明检查被跳过了                     |
| provenance 缺失                        | 只在公开仓库 + 公开包 + GitHub Actions 三个条件同时成立时才自动生成              |
