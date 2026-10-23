# 变更日志

本文件记录所有对使用者有影响的变更，格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.2.1] - 2026-10-24

**无运行时变更**，组件 API 与 0.2.0 完全一致，升级不会影响任何既有代码。

### Changed

- 发布流程从「长期 token + 人工 2FA」切换到 npm Trusted Publishing（OIDC），推 `v*` 标签由 GitHub Actions 自动发布并自动附带 provenance 签名。仓库内不再存在任何 npm 凭据。
- 新增 `CHANGELOG.md` 并纳入发布包。

## [0.2.0] - 2026-10-23

### Added

- `ai-calendar` 日历：42 格月视图、跨天事项按自然周切片、每格最多 2 行、溢出折叠 `+N`、`compact` 紧凑模式、自定义日期内容插槽。
- `ai-countup` 数字滚动：5 种缓动、自动推导小数位、`island` 皮肤带光环与星芒庆祝动效、`repeat` / `repeatDelay` 循环播放。
- 首次发布到 npm（`animal-island-wx@0.2.0`）。

### Fixed

- 日历在窄屏下事项字号小于 7px 不可读，加入 `MIN_EVENT_FONT` / `MIN_BAR_HEIGHT` 可读下限。
- 单列宽事项条强制显示时间后只剩省略号，改为仅在 `span > 1` 时显示。
- `+N` 折叠提示被事项条遮挡，位置移到日期圆右侧。

### Note

- 组件数 41 → 43，完整覆盖上游 [animal-island-ui](https://github.com/guokaigdg/animal-island-ui) v2.3.0 的 40 个组件目录。

## [0.1.0] - 2026-10-23

### Added

- 首次开源：`animal-island-ui` 的微信小程序原生实现，41 个组件，WXML / WXSS / TypeScript，运行时零依赖。
- 全量组件支持 `ext-class` 外部样式类穿透。
- `miniprogram-automator` 冒烟测试与浏览器预览页（Shadow DOM 模拟样式隔离）。

[0.2.1]: https://github.com/lns567/animal-island-wx/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/lns567/animal-island-wx/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/lns567/animal-island-wx/releases/tag/v0.1.0
