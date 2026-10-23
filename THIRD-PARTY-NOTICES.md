# 三方声明

本项目以 MIT 协议发布（见 [LICENSE](LICENSE)）。以下是直接衍生或内嵌的三方作品及其授权：

## animal-island-ui

- 来源：https://github.com/guokaigdg/animal-island-ui
- 授权：MIT License，Copyright (c) 2026 guokaigdg
- 使用范围：设计 token（`src/common/style/tokens.wxss` 里的 `--animal-*` 变量）、组件视觉规格（配色、圆角、描边、阴影、动效曲线）、组件 API 命名。
- 说明：本项目是它的**微信小程序原生重写**，不是打包产物。Web 版的 React 代码没有被复制进产物，但组件结构、类名语义（`ai-*`）、属性名做了刻意对齐，便于两边迁移。

## naive-icons

- 来源：https://github.com/guokaigdg/naive-icons（v1.2.0）
- 授权：MIT License，Copyright (c) 2026 Naive Icons
- 使用范围：`vendor/icons/*.svg` 原样收录，经 `scripts/gen-icons.mjs` 转成 base64 内联进 `src/common/icons.wxss`。

## 字体

没有内嵌任何字体文件。全部使用系统字体栈（`-apple-system` / `PingFang SC` / `Microsoft YaHei` 等），不涉及字体授权。

## 图片来源

`examples/demo/assets/` 与 `preview/` 下的图片仅用于演示与预览，不随 npm 包分发（`package.json` 的 `files` 只包含 `miniprogram_dist`）。
