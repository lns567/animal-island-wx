# 参与贡献

感谢愿意帮忙。这个仓库的定位很明确：**把 animal-island-ui 的视觉与 API 一比一搬到微信小程序**，所以「Web 版长什么样」是唯一的设计基准，不接受凭感觉改样式。

## 本地跑起来

```bash
npm install
npm run build      # tsc + 拷 wxml/wxss/json + 同步到 examples/demo/miniprogram_npm
npm run check      # 平台安全静态检查
npm run preview    # 生成单文件浏览器预览（不用登录开发者工具）
```

提交前请确认 `npm run check` 零报错——CI 也只跑这一套。

## 改一个组件

1. 读上游源码 `animal-island-ui/src/components/<Name>/`（组件 + `*.module.less`）。
2. 改 `src/<name>/index.{ts,wxml,wxss,json}`，类名用 `ai-<name>__<part>` 的 BEM 风格（没有哈希，因为样式隔离已经够用）。
3. 新版 `preview.runtime.js` 里验证过效果，再在 `examples/demo/pages/index/` 里加一块示例。
4. 更新 `docs/components.md` 的 API 表（属性、事件、插槽、降级说明）。

## 硬性约定

| 约定 | 原因 |
| --- | --- |
| 每个组件的 `index.wxss` 首行 `@import '../common/style/base.wxss';` | 页面级样式进不到组件内部，重置得自带 |
| 颜色/圆角/阴影只用 `var(--animal-*)` | 换主题才能一处生效 |
| 禁止 `:hover` / `::placeholder` / `document.*` / `ResizeObserver` | 小程序没有，`check.mjs` 会直接拦 |
| 组件根节点挂 `class="{{...}} extClass"` 并声明 `externalClasses: ['extClass']` | 否则页面的 `ext-class` 静默失效 |
| `wx:for` 必须有 `wx:key` | 不然 diff 会复用错节点 |
| 定时器在 `detached` 里清 | 小程序页面不销毁就不回收 |

## 已知的坑（踩过，别再踩）

- `relations` 的销毁回调叫 `unlinked`，不是 `unlink`。
- WXML 同一标签里重复写属性，开发者工具静默覆盖、浏览器预览直接白屏——已在 `check.mjs` 里拦截。
- automator（`miniprogram-automator`）**选不到自定义组件内部节点**，`page.$('.ai-select__trigger')` 恒为 null；测试要么在宿主节点加 class，要么在 `mp.evaluate()` 里 `selectComponent('.x').方法()`。

## Issue / PR

- 报 bug 请带上：基础库版本、机型/系统、最小复现代码、报错截图。
- PR 请一个组件一个 PR，说明「Web 版怎么做的」和「小程序为什么这么改」。
- 不接受的改动：给仓库加运行时依赖、把设计 token 换成写死色值、跳过 `ext-class` 支持。

## 发布

维护者流程见 [docs/publishing.md](docs/publishing.md)：推 `v*` 标签触发 GitHub Actions，走 npm Trusted Publishing（OIDC），不需要任何 npm token。

## License

提交即表示同意以 [MIT](LICENSE) 协议发布。上游 animal-island-ui 与 naive-icons 均为 MIT，署名与授权细节见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。
