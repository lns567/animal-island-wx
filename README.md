# animal-island-wx

[![CI](https://github.com/lns567/animal-island-wx/actions/workflows/ci.yml/badge.svg)](https://github.com/lns567/animal-island-wx/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/animal-island-wx?color=cb3837)](https://www.npmjs.com/package/animal-island-wx)
[![组件](https://img.shields.io/badge/%E7%BB%84%E4%BB%B6-43-1f6feb.svg)](#组件一览)
[![基础库](https://img.shields.io/badge/%E5%9F%BA%E7%A1%80%E5%BA%93-%E2%89%A52.20.1-07c160.svg)](#已知限制)

[animal-island-ui](https://github.com/guokaigdg/animal-island-ui) 的**微信小程序原生组件库**——原项目是 React 18 + Less Modules 的 Web 组件库，这里把它的视觉语言（暖米色纸面、圆润描边、手绘 3D 按钮、飘带标题）用 WXML / WXSS / TypeScript 重新实现了一遍，可以直接在原生小程序、Taro、uni-app 的小程序端里用。

> 43 个组件，完整覆盖上游 v2.3.0 的 40 个组件目录（不是「挑几个好做的」）。移植过程中遇到的小程序限制（没有 `:hover`、没有 portal、读不到 slot 里的 DOM、样式隔离、automator 选不中自定义组件内部节点）都写在 [迁移指南](docs/migration-from-react.md) 里，附带各自的降级做法。

- 无运行时依赖：图标以 base64 内联进 WXSS，字体用系统字体栈，不需要 `naive-icons`、不需要网络请求。
- 与 Web 版共享同一套 CSS 变量（`--animal-*`），颜色/圆角/阴影/动效改一处即可全局生效。
- 组件内部样式隔离，每个组件自带重置样式，不会被业务页面的 `view{}` 影响。

![组件总览](preview/preview.png)

## 目录

- [快速开始](#快速开始)
- [组件一览](#组件一览)
- [主题定制](#主题定制)
- [和 Web 版的差异](#和-web-版的差异)
- [在开发者工具里跑 demo](#在开发者工具里跑-demo)
- [仓库结构](#仓库结构)
- [已知限制](#已知限制)

## 快速开始

### 1. 安装

```bash
npm i animal-island-wx
```

> 不想走 npm？把本仓库 `miniprogram_dist/` 整个目录拷进项目的自定义组件目录也能用，用法一致（跳过下一步）。

### 2. 构建 npm

微信开发者工具里：**工具 → 构建 npm**（勾选「使用 npm 模块」）。构建后 `miniprogram_npm/animal-island-wx/` 就绪。

`package.json` 已经声明了 `"miniprogram": "miniprogram_dist"`，所以只会打包产物目录，不会把 `src/`、`scripts/` 带进包体。

### 3. 引入样式变量

组件里的颜色都来自 CSS 变量，需要先在页面级挂载一次（`app.wxss` 里即可，变量会继承进组件内部）：

```css
/* app.wxss */
@import './miniprogram_npm/animal-island-wx/common/style/tokens.wxss';
```

想换主题就在 `page` 上覆盖同名变量，见[主题定制](#主题定制)。

### 4. 注册并使用

```json
// pages/index/index.json
{
    "usingComponents": {
        "ai-button": "animal-island-wx/button/index",
        "ai-card": "animal-island-wx/card/index"
    }
}
```

> 没走「构建 npm」、而是把 `miniprogram_dist/` 手动拷进项目的话，用绝对路径更稳：`"/miniprogram_npm/animal-island-wx/button/index"`（`examples/demo` 就是这么写的）。

```html
<!-- pages/index/index.wxml -->
<ai-card color="app-teal" pattern="app-teal">
    <ai-button type="primary" content="开始冒险" bind:click="onStart" />
    <ai-button type="dashed" content="稍后再说" />
</ai-card>
```

```js
// pages/index/index.js
Page({
    onStart() {
        wx.showToast({ title: '出发！', icon: 'none' });
    },
});
```

布尔属性有两种写法，`{{true}}` 最稳（裸写属性名依赖基础库解析）：

```html
<ai-button disabled="{{true}}" content="禁用" />
<ai-button disabled content="禁用" />
```

### 事件

小程序事件统一走 `bind:` 前缀，`detail` 里是组件抛出的数据：

```html
<ai-input value="{{keyword}}" bind:input="onInput" bind:change="onChange" bind:clear="onClear" />
```

```js
Page({
    data: { keyword: '' },
    onInput(event) {
        // 每次输入都触发，event.detail.value 是最新值
        this.setData({ keyword: event.detail.value });
    },
    onChange(event) {
        // 失焦时触发
    },
    onClear() {
        this.setData({ keyword: '' });
    },
});
```

## 组件一览

| 组件 | 标签 | 说明 | API |
| --- | --- | --- | --- |
| Button | `ai-button` | 5 种类型 × 3 种尺寸，支持图标、幽灵、危险、加载、块级 | [文档](docs/components.md#ai-button) |
| Card | `ai-card` | 13 种配色、点阵图案、虚线描边、可点击 | [文档](docs/components.md#ai-card) |
| Input | `ai-input` | 前后缀、可清空、错误/警告态、3 种尺寸 | [文档](docs/components.md#ai-input) |
| Switch | `ai-switch` | 开关，支持内部文字、加载、禁用、受控/非受控 | [文档](docs/components.md#ai-switch) |
| Tag | `ai-tag` | 4 种形态 × 8 种颜色，可关闭、可点击 | [文档](docs/components.md#ai-tag) |
| Divider | `ai-divider` | 虚线/细线/波浪/波浪线/图标分隔，自动铺满宽度 | [文档](docs/components.md#ai-divider) |
| Title | `ai-title` | 飘带 / 双层纸 / 折角便签 三种标题 | [文档](docs/components.md#ai-title) |
| Avatar | `ai-avatar` | 图片/文字/图标头像，5 种尺寸、圆形方形、文字自适应缩字号 | [文档](docs/components.md#ai-avatar) |
| AvatarGroup | `ai-avatar-group` | 头像组，超出数量折叠成 `+N` | [文档](docs/components.md#ai-avatar-group) |
| Badge | `ai-badge` | 数字角标 / 封顶 `99+` / 小红点，可包裹头像图标，也可独立使用 | [文档](docs/components.md#ai-badge) |
| Progress | `ai-progress` | 3 种尺寸、渐变填充、可自定义文案与过渡时长 | [文档](docs/components.md#ai-progress) |
| Skeleton | `ai-skeleton` | text / circle / rect / paragraph 四种骨架，银白流光 | [文档](docs/components.md#ai-skeleton) |
| Checkbox | `ai-checkbox` | 复选框组，3 种尺寸、横竖排、禁用态 | [文档](docs/components.md#ai-checkbox) |
| Radio | `ai-radio` | 单选框组，视觉与 Checkbox 一致 | [文档](docs/components.md#ai-radio) |
| Collapse | `ai-collapse` | FAQ 折叠卡片，+/- 图标与鱼形装饰 | [文档](docs/components.md#ai-collapse) |
| Tabs | `ai-tabs` | 标签页，面板内容交给页面渲染 | [文档](docs/components.md#ai-tabs) |
| Modal | `ai-modal` | 模态框，game 异形外框 / default 圆角，可自定义底部 | [文档](docs/components.md#ai-modal) |
| Drawer | `ai-drawer` | 四向抽屉，带浅黑遮罩与滑入动画 | [文档](docs/components.md#ai-drawer) |
| Loading | `ai-loading` | 全屏夜空落雪加载层，支持延迟出现与淡出 | [文档](docs/components.md#ai-loading) |
| Rate | `ai-rate` | 星级评分，弹跳 + 六点扩散动画 | [文档](docs/components.md#ai-rate) |
| Pagination | `ai-pagination` | 分页，orange / teal 两套配色 | [文档](docs/components.md#ai-pagination) |
| Countdown | `ai-countdown` | 倒计时，20 面数字条里程表式滚动 | [文档](docs/components.md#ai-countdown) |
| CountUp | `ai-countup` | 数字滚动计分，5 种缓动 + 千分位 + 结束庆祝 | [文档](docs/components.md#ai-countup) |
| Calendar | `ai-calendar` | 月历 + 事项，跨天条按周切片、每格 2 行折叠 +N | [文档](docs/components.md#ai-calendar) |
| Image | `ai-image` | 相框图片，default / bordered / stamp 邮票齿孔 | [文档](docs/components.md#ai-image) |
| Table | `ai-table` | 表格，斑马纹、空状态、加载中 | [文档](docs/components.md#ai-table) |
| Footer | `ai-footer` | 版权栏 | [文档](docs/components.md#ai-footer) |
| BackTop | `ai-backtop` | 右下角火箭，点击平滑回顶 | [文档](docs/components.md#ai-backtop) |
| Carousel | `ai-carousel` | 轮播，基于原生 swiper，圆点 + 箭头 + 自动播放 | [文档](docs/components.md#ai-carousel) |
| Time | `ai-time` | 实时时钟卡片，冒号按秒闪烁 | [文档](docs/components.md#ai-time) |
| Background | `ai-background` | 16 种壁纸：波点 / 网格 / 针糖 | [文档](docs/components.md#ai-background) |
| CodeBlock | `ai-codeblock` | 代码块，正则着色 + 行号 + 一键复制 | [文档](docs/components.md#ai-codeblock) |
| Typewriter | `ai-typewriter` | 打字机，逐字显示 + 闪烁光标 + 重播触发 | [文档](docs/components.md#ai-typewriter) |
| Cursor | `ai-cursor` | 跟随手指的装饰指针（降级实现） | [文档](docs/components.md#ai-cursor) |
| Tooltip | `ai-tooltip` | 12 个方位、点击/长按触发、海岛气泡变体 | [文档](docs/components.md#ai-tooltip) |
| Select | `ai-select` | 下拉选择，自动翻边定位 | [文档](docs/components.md#ai-select) |
| TimePicker | `ai-timepicker` | 时/分/秒三列滚动，可「此刻」与清空 | [文档](docs/components.md#ai-timepicker) |
| DatePicker | `ai-datepicker` | 日历 / 月份网格，年↔月翻页，可选范围限制 | [文档](docs/components.md#ai-datepicker) |
| Form | `ai-form` | 表单容器，`validate()` / `resetFields()` / `setFieldsValue()` | [文档](docs/components.md#ai-form--ai-form-item) |
| FormItem | `ai-form-item` | 字段：内置 input/switch 或 slot，规则校验 | [文档](docs/components.md#ai-form--ai-form-item) |
| Upload | `ai-upload` | 图片/文件上传，三种列表形态 + 进度 | [文档](docs/components.md#ai-upload) |
| Notification | `ai-notification` | 通知提醒，6 方位 × 4 类型，可队列 | [文档](docs/components.md#ai-notification) |
| Icon | `ai-icon` | 31 个内置图标，跟随字号缩放 | [文档](docs/components.md#ai-icon) |

上游 v2.3.0 的 40 个组件目录已全部移植（`Form` 拆成 `ai-form` + `ai-form-item`，`AvatarGroup` 独立成 `ai-avatar-group`，另有自带的 `ai-icon`），共 **43 个组件**。少数能力在小程序里换了做法（Cursor 的真实光标、Upload 的拖拽、DatePicker 的范围选择、Form 的异步 validator 等），逐条列在[差异](#和-web-版的差异)与 `docs/migration-from-react.md` 里。

## 主题定制

所有 token 都在 `common/style/tokens.wxss`，在 `page`（或任意祖先节点）上覆盖即可，组件内部自动生效：

```css
page {
    /* 主色：按钮、链接、聚焦态 */
    --animal-primary-color: #19c8b9;
    /* 纸面色：卡片、输入框底 */
    --animal-bg-color: #f8f8f0;
    /* 描边与文字 */
    --animal-border-color: #e0d7c6;
    --animal-text-color: #4a3f35;
    /* 圆角、间距、动效 */
    --animal-border-radius-lg: 20px;
    --animal-motion-duration-base: 0.2s;
}
```

完整变量清单见 [`src/common/style/tokens.wxss`](src/common/style/tokens.wxss)，分色板、文字、边框、背景、间距、圆角、阴影、动效、控件高度几组。

## 和 Web 版的差异

移植不是「翻译 CSS」这么简单，下面这些是小程序平台决定的、必须改变的写法：

| Web 版 | 小程序版 | 原因 |
| --- | --- | --- |
| `:hover` / `:active` / `:focus-visible` | `hover-class` 按下态 + JS 状态类 | 触摸屏没有 hover；`:focus-visible` 不存在 |
| `::placeholder` | `placeholder-class="ai-input__placeholder"` | WXSS 不支持 `::placeholder` |
| `ReactNode children` | `content` 属性 / `<slot>` | 组件只能接收固定结构的 slot |
| `className` / `style` | `ext-class` / `ext-style` | 组件样式隔离，只有 externalClasses 声明的 `extClass` 能被打穿 |
| 内联 `<svg>` 图标 | base64 背景图（`ai-icon`） | WXML 没有 `<svg>` 标签 |
| `ResizeObserver` 算分隔线循环次数 | `wx.getWindowInfo().windowWidth` 一次性计算 + `overflow: hidden` 裁切 | 小程序没有 ResizeObserver，横向拖动窗口不常见 |
| `createPortal` + `document.body` | 移除（Modal/Drawer 未移植） | 没有 portal，弹层需要写进页面结构或用 `wx:if` |
| `getBoundingClientRect` 量文字 | `createSelectorQuery().select().boundingClientRect()` | 小程序没有同步布局 API |
| woff2 自定义字体 | 系统字体栈（PingFang / HarmonyOS / 微软雅黑） | 小程序 `@font-face` 只支持网络字体，会引入额外请求 |
| `px` + 媒体查询适配 | 保留 `px`（1:1 还原），业务可用 `rpx` | 组件内部按设计稿像素走，页面布局用 rpx 混排没问题 |

另外两个 API 层面的取舍：

- **AvatarGroup 是数据驱动的**：Web 版用 `children` 传一组 `<Avatar>`，小程序里做不到「读取子节点」，所以改成 `items` 数组（`[{ src, content, icon }]`）。
- **Input 的错误/警告阴影**：Web 版里尺寸规则的优先级意外盖掉了状态阴影，这里按「状态优先」实现，颜色能正常显示（这是有意的修正，不是回归）。

完整的迁移对照见 [docs/migration-from-react.md](docs/migration-from-react.md)。

## 在开发者工具里跑 demo

仓库自带一个可直接运行的示例小程序：

```bash
npm install
npm run build          # 编译 TS + 同步产物到 examples/demo/miniprogram_npm
```

然后用微信开发者工具「导入项目」选择 `examples/demo`（AppID 用测试号即可）。`app.json` 已配置 `"style": "v2"`，示例页把 43 个组件都摆了一遍。

### 不登录也能看效果

开发者工具的自动化接口需要登录态，所以仓库里内置了一套**浏览器预览运行时**（`preview/runtime.js`）：它真的会执行编译后的 `miniprogram_dist/*/index.js`，并用 Shadow DOM 模拟小程序的样式隔离，把 WXML 子集（`{{}}`、`wx:if/elif/else`、`wx:for`、`slot`、`bind*`）渲染成网页。

```bash
npm run preview        # 生成 preview/index.html（单文件，直接双击可开）
npm run preview:shot   # 用本机 Chrome 无头模式截整页图到 preview/preview.png
```

它同时是个**回归工具**：页面渲染不出来或者组件逻辑抛错，截图脚本会把 `window.__MP_ERRORS__` 打出来。

### 检查

```bash
npm run check
```

静态扫描平台不安全的写法：`:hover` / `::placeholder` / `document.` / `ResizeObserver`、WXML 里的 Web 标签、未闭合标签、`wx:for` 缺 `wx:key`、WXSS 里引用本地图片、组件漏了基础重置、图标名拼错、组件没注册等。`npm run ci` = 构建 + 检查 + 生成预览。

## 仓库结构

```
src/
  <组件>/index.{ts,wxml,wxss,json}   组件源码（扁平结构，产物同名目录）
  common/style/tokens.wxss          设计 token（CSS 变量）
  common/style/base.wxss            组件内基础重置（样式隔离必需）
  common/icons.{wxss,ts}            图标 sprite + 图标名（脚本生成）
  index.ts                          库入口（导出 ICON_NAMES / IconName / VERSION）
scripts/
  build.mjs                         tsc + 拷贝 .wxml/.wxss/.json + 同步 demo
  gen-icons.mjs                     从 vendor/icons/*.svg 生成 base64 sprite
  build-preview.mjs                 生成单文件浏览器预览页
  screenshot.mjs                    CDP 无头截图
  check.mjs                         平台安全静态检查
examples/demo/                      可直接导入开发者工具的示例小程序
preview/                            预览页与预览图
docs/                               组件 API、迁移指南
vendor/icons/                       图标源文件（naive-icons, MIT）
```

## 已知限制

- **基础库版本**：用到 `observers`（2.6.1+）和 `wx.getWindowInfo`（2.20.1+），建议基础库 ≥ 2.20.1（demo 用的是 3.5.5）。
- **flex `gap`**：组件内部大量使用 `gap`，iOS 14.5+ / 新版 XWeb 原生支持；极老的安卓 WebView 会退化成无间距。要兼容它们可以改成 `margin`（会牺牲一点可维护性）。
- **没有 SSR / 单元测试**：小程序组件不好在 Node 里跑，仓库用的是「浏览器预览 + 截图」做视觉回归。
- **没有暗色模式**：Web 版也没做，跟随系统的话建议在 `page` 上用 `@media (prefers-color-scheme: dark)` 覆盖变量。

## License

MIT。视觉与 API 源自 [animal-island-ui](https://github.com/guokaigdg/animal-island-ui)（MIT, Copyright © 2026 guokaigdg），图标源自 [naive-icons](https://github.com/guokaigdg/naive-icons)（MIT），详见 [LICENSE](LICENSE) 与 [三方声明](THIRD-PARTY-NOTICES.md)。
