# 从 React 版迁移

假设你已经用着 Web 版的 `animal-island-ui`，想把同一套界面搬到小程序里。这份文档只讲「怎么换」和「换不了的地方怎么办」。

## 一、先理解为什么不能直接编译

Web 版是标准 React 组件：`children` 是任意 ReactNode，样式是 Less Modules 生成的哈希类名，图标是内联 `<svg>`，弹层靠 `createPortal` 挂到 `document.body`。小程序的自定义组件是另一套模型：

| | Web 版 | 小程序 |
| --- | --- | --- |
| 运行时 | 浏览器 DOM | 逻辑层 JS + 渲染层（无 DOM API） |
| 组件输入 | props，任意类型 | properties，JSON 可序列化的类型 |
| 组件内容 | `children: ReactNode` | 固定结构的 `<slot>`，读不到子节点 |
| 样式作用域 | CSS Modules 哈希类名 | 编译期样式隔离（默认 `isolated`） |
| 布局测量 | 同步 `getBoundingClientRect()` | 异步 `createSelectorQuery()` |
| 事件 | 合成事件、冒泡可控 | `bind` / `catch`，`detail` 传数据 |
| 图标 | 内联 SVG（可换色） | base64 背景图（不可换色，只能整体反色/裁剪） |

所以移植不是「把 tsx 翻成 wxml」，而是**保留视觉与 API 语义，重写实现**。这个仓库做的就是这件事。

## 二、心智模型映射

| React | 小程序 | 备注 |
| --- | --- | --- |
| `<Button type="primary" />` | `<ai-button type="primary" />` | 标签名统一 `ai-*` |
| `className="x"` | `class="x"` | 但**只能作用到最外层节点** |
| `style={{ marginTop: 8 }}` | `style="margin-top:8px"` | 同上 |
| `onClick={fn}` | `bind:click="fn"` | 函数名是字符串 |
| `onChange={(v) => ...}` | `bind:change` + `event.detail.value` | 回调参数走 detail |
| `children` | `content` 属性或 `<slot>` | slot 结构固定 |
| `visible={open}` | `wx:if="{{open}}"` | 没有 portal |
| `useState` | `data` + `setData` | 异步更新 |
| `useEffect` | `lifetimes.attached/ready` | —— |
| `props.x` 变化触发重算 | `observers: { x() {} }` | 一次可观察多个属性 |

## 三、样式迁移

### 1. Less Modules → WXSS

Web 版每个组件一个 `*.module.less`，类名被哈希化，天然隔离。小程序里**组件样式默认就是隔离的**，所以：

- 类名直接写语义化的 `.ai-btn`、`.ai-btn__icon`（BEM 风格），不需要哈希。
- 全局重置要在**每个组件里** `@import '../common/style/base.wxss';`——页面级的 `view {}` 进不到组件内部。
- 页面想微调组件外层，只能用 `ext-class`。**注意它必须是 `externalClasses`，不能是一个 String 属性**：
  ```js
  Component({ externalClasses: ['extClass'] })   // ✅ 编译器会给这个 token 打穿隔离的标记
  Component({ properties: { extClass: String } })  // ❌ 拼进 class 也没用，页面样式进不来
  ```
  WXML 里写成字面量 token：`<view class="ai-btn extClass">`（不是 `class="ai-btn {{extClass}}"`）。
  这是本项目第 11 批发现并全量修掉的问题：改之前 25 个组件的 `ext-class` 全是静默失效的。

### 2. 伪类

| Web | 小程序 |
| --- | --- |
| `:hover` | `hover-class="ai-btn--hover"`（触摸按下态） |
| `:active` | 同上 |
| `:focus-visible` | 没有，用 `focus-class` 或 JS 状态类 |
| `::placeholder` | `placeholder-class="ai-input__placeholder"` |
| `<button>` 默认样式 | 必须重置，包括 `button::after { border: none }` |
| `:root` | 用 `page` |

### 3. 单位

Web 版直接用 `px`，这里也保留 `px`，比例和设计稿一致；页面布局可以混用 `rpx`（`1rpx = 屏宽/750`）。别把组件里的 `px` 批量换成 `rpx`，否则大屏上按钮会变得夸张。

### 4. 变量

`--animal-*` 全量保留，Web 版的主题覆盖可以整段搬过来：

```css
page {
    --animal-primary-color: #ff8a65;
}
```

变量是**继承**的，`page` 上设一次，所有组件内部都能读到（样式隔离不影响 CSS 自定义属性的继承）。

## 四、逐组件对照

### Button

```tsx
<Button type="primary" icon={<StarIcon />} onClick={start}>开始冒险</Button>
```

```html
<ai-button type="primary" icon="star" content="开始冒险" bind:click="start" />
```

- 图标从 ReactNode 变成图标名（31 个内置图标），要自定义就传 `icon` slot。
- 没有 `htmlType`，改用原生小程序的 `form-type` / `open-type`。
- `disabled` 是软禁用（拦点击 + `aria-disabled`），按下态仍然正常。

### Card

```tsx
<Card color="app-teal" pattern="dots" hoverable onClick={pick}>...</Card>
```

```html
<ai-card color="app-teal" pattern="app-teal" hoverable="{{true}}" bind:click="pick">...</ai-card>
```

`pattern` 在小程序版里直接复用颜色名（点阵的颜色），不需要额外的枚举。

### Input

```tsx
<Input value={kw} onChange={setKw} allowClear prefix={<SearchIcon />} status="error" />
```

```html
<ai-input value="{{kw}}" bind:input="onKw" allow-clear="{{true}}" prefix="search" status="error" />
```

- `onChange` 拆成了 `input`（每次按键）和 `change`（失焦）两个事件。
- `prefix` 从 ReactNode 变成图标名，复杂内容用 `prefix` slot。
- 文字宽度、清除按钮的位置都按小程序输入框重新实现，视觉一致但内部结构不同。

### Switch

```tsx
<Switch checked={on} onChange={setOn} checkedChildren="开" unCheckedChildren="关" />
```

```html
<ai-switch checked="{{on}}" checked-children="开" un-checked-children="关" bind:change="onSwitch" />
```

`change` 的 detail 里同时给了 `checked` 和 `value`。

### Tag

```tsx
<Tag color="app-green" closable onClose={remove}>森林</Tag>
```

```html
<ai-tag content="森林" color="app-green" closable="{{true}}" bind:close="remove" />
```

### Divider

```tsx
<Divider type="wave-yellow" />
<Divider icon={<FishIcon />} iconSize={22} />
```

```html
<ai-divider type="wave-yellow" />
<ai-divider icon="fish" icon-size="{{22}}" />
```

Web 版用 ResizeObserver 算波浪个数；小程序版一次性用 `wx.getWindowInfo().windowWidth` 算好，再靠 `overflow: hidden` 收口——横屏切换后不会重算，这是有意的简化。

### Title

```tsx
<Title variant="ribbon" size="large" color="app-teal">Animal Island</Title>
```

```html
<ai-title variant="ribbon" size="large" color="app-teal" content="Animal Island" />
```

Web 版 hover 时飘带会轻微放大，小程序版没有（触摸屏没有 hover）。

### Avatar / AvatarGroup

```tsx
<Avatar src={me} size="large" />
<AvatarGroup maxCount={3}>{items.map(...)}</AvatarGroup>
```

```html
<ai-avatar src="{{me}}" size="large" />
<ai-avatar-group items="{{members}}" max-count="{{3}}" bind:more="onMore" />
```

这是 API 变化最大的地方：`children` 换成 `items` 数组。文字头像的超宽缩字号改成了 `createSelectorQuery` 量宽后按比例缩小。

### Badge / Progress / Skeleton

```tsx
<Badge count={120} />
<Progress percent={64} size="middle" />
<Skeleton variant="paragraph" rows={3} />
```

```html
<ai-badge count="{{120}}" />
<ai-progress percent="{{64}}" />
<ai-skeleton variant="paragraph" rows="{{3}}" />
```

这三个几乎是一比一搬过来的，只有三处要改：Skeleton 的 `Skeleton.Button` / `Skeleton.Input` / `Skeleton.Avatar` 三个预设合并成 `variant` + `width-value` + `height-value` + `radius`；Progress 的 `variant`（场景照片填充）没做，因为小程序 `background-image` 引不了包内图片（转 base64 会让包体翻几倍）；`infoFormat` 这种函数属性改成 `info-text` 字符串。

### Checkbox / Radio

```tsx
<Checkbox options={opts} value={checked} onChange={setChecked} />
<Radio options={opts} value={pick} onChange={setPick} />
```

```html
<ai-checkbox options="{{opts}}" value="{{checked}}" bind:change="onCheckboxChange" />
<ai-radio options="{{opts}}" value="{{pick}}" bind:change="onRadioChange" />
```

`options` 的结构原样保留，`onChange` 变成 `bind:change`。两处要留意：勾选标记在 Web 版是内联 `<svg>` + `stroke-dashoffset` 描边动画，小程序换成 data URI 背景图 + 缩放弹出（描边画出来的那 0.5s 没了）；`value` 的默认值必须是 `null` 才能表达「非受控」，受控又要空值时传 `''`。

### Collapse

```tsx
<Collapse question="营业时间？" answer="8:00 - 22:00" defaultExpanded />
```

```html
<ai-collapse question="营业时间？" answer="8:00 - 22:00" default-expanded="{{true}}" />
```

展开动画从 `grid-template-rows: 0fr → 1fr` 换成「量高度 + 过渡 max-height」——`fr` 插值在 WKWebView 上不生效（会直接跳变）。`question` / `answer` 从 ReactNode 降级为纯文本。

### Tabs

```tsx
<Tabs items={[{ key: 'a', label: 'A', children: <div>A</div> }]} />
```

```html
<ai-tabs items="{{tabs}}" active-key="{{tabKey}}" bind:change="onTabChange">
    <view wx:if="{{tabKey === 'a'}}">A</view>
</ai-tabs>
```

这是 API 变化最明显的一处：`children` 被拆成「组件管标签条 + 页面管面板内容」。小程序一个组件只有一个默认 slot，没有按 key 取不同节点的能力，所以页面本来也得自己维护 activeKey——这样反而更直白。

### Modal / Drawer / Loading

```tsx
<Modal open={open} variant="game" title="提示" onClose={close} onOk={ok}>内容</Modal>
<Drawer open={open} placement="right" title="档案">内容</Drawer>
<Loading active={loading} tip="加载中" />
```

```html
<ai-modal open="{{open}}" variant="game" title="提示" bind:close="close" bind:ok="ok">内容</ai-modal>
<ai-drawer open="{{open}}" placement="right" title="档案">内容</ai-drawer>
<ai-loading active="{{loading}}" tip="加载中" />
```

这三个是唯一真正要重新设计 API 的：

- **没有 `createPortal`**。直接用 `position: fixed` + `z-index`，关闭态留在节点树里靠 `opacity` / `transform` 过渡——反而比 Web 版多出了退场动画（Web 版 Modal 关闭时是 `return null`，直接就没了）。
- **`game` 变体的异形外框**。Web 版内联 `<svg>` + `clip-path`，WXML 没有 `<svg>`；把那条 709 字符的 blob 路径转成 SVG data URI，用 `mask-image` 实现，`-webkit-mask-*` 在 iOS / Android WebView 上都能跑。
- **`Cursor` / `Typewriter` 包裹层砍掉**。没有自定义光标；slot 里的内容也没法像 ReactNode 那样逐字打出来。
- **`pushBackground` 砍掉**。组件拿不到页面节点，下沉景深要页面自己加。
- 三条共性约束：fixed 盖不住原生导航栏和 tabBar（要 `navigationStyle: custom`）；`footer` 从 `ReactNode | null` 改成三态字符串（`default` / `slot` / `none`）；`onClose` 带上 `source`，方便区分是点遮罩还是点按钮。

### Rate / Pagination / Countdown

```tsx
<Rate value={v} onChange={setV} />
<Pagination total={128} current={p} onChange={(page, size) => setP(page)} />
<Countdown value={endTime} prefix="距离结束" onFinish={done} />
```

```html
<ai-rate value="{{v}}" bind:change="onRateChange" />
<ai-pagination total="{{128}}" current="{{p}}" bind:change="onPageChange" />
<ai-countdown value="{{endTime}}" prefix="距离结束" bind:finish="done" />
```

三处细节值得单独记：

- **Rate 的星星不能变色**。Web 版内联 `<svg>` 直接改 `stroke` / `fill` 做空心→填充的过渡；小程序里图标是 `background-image`，只能换图。这里内置两张（空心 / 金色填充带眼睛），叠在一起 `opacity` 交叉淡入，等价于 Web 版的 `fill-opacity` 过渡。
- **Pagination 会换行**。`共 128 条 + 7 个页码 + 10 条/页` 在 390px 屏上一行放不下，Web 版会溢出到屏幕外。容器加了 `flex-wrap: wrap`。
- **Countdown 的回绕要两次 `setData`**。里程表式单向滚动需要「瞬移到下一循环再滚」，Web 版靠 `void el.offsetHeight` 强制回流；小程序没有回流 API，改成第一帧 `transition: none` 瞬移、32ms 后第二帧打开过渡。

### Image / Table / Footer / BackTop

```tsx
<Image src="/a.jpg" variant="stamp" stampYear="2026" />
<Table columns={cols} dataSource={list} />
<Footer text="MIT" />
<BackTop visibilityHeight={400} />
```

```html
<ai-image src="/a.jpg" variant="stamp" stamp-year="2026" />
<ai-table columns="{{cols}}" rows="{{list}}" />
<ai-footer text="MIT" />
<ai-backtop visible="{{showBackTop}}" />
```

四个「看着简单、各有各的坑」的组件：

- **Image 的预览不用自己画**。Web 版 portal 出一个遮罩 + 关闭按钮 + ESC + 焦点陷阱；小程序一行 `wx.previewImage({ urls })` 就是原生大图查看器，还自带双指缩放和保存到相册。
- **`<image>` 的加载事件叫 `bindload` 不是 `binderload`**。我一开始按 error 的命名习惯写成 `binderload`，结果是**既不加载也不报错**——图片永远是 `opacity: 0`，连错误占位都不出现，只能靠肉眼看出相框是空的。
- **Table 的数据属性绝不能叫 `dataSource`**。WXML 里 `data-*` 一律被当成 `dataset`，`data-source="{{list}}"` 永远传不到 `dataSource` property 上，表格稳定显示「暂无数据」。改叫 `rows` 立刻正常。
- **BackTop 拿不到页面滚动**。组件里没有 `onPageScroll`，必须页面自己判断后传 `visible`；`wx.pageScrollTo({ duration })` 提供原生平滑回顶，替代 Web 版的 rAF 缓动。

## 五、能力降级清单（41 个组件全覆盖）

上游 38 个组件目录（`Form` 拆成 `ai-form` + `ai-form-item`，`Icon` 有自己的 31 个内联图标）已经全部移植，但下面这些**能力**在小程序里确实换了一种做法，用之前要知道：

| 组件 | Web 版有、这里没有 | 这里的替代做法 |
| --- | --- | --- |
| Cursor | 真正的 CSS `cursor` 指针（含 `url()` 自定义光标） | 小程序没有 `cursor` 属性，降级成「跟随手指的装饰指针」 |
| Upload | 拖拽上传、`beforeUpload` / `customRequest` 函数钩子、进度事件 | 点击选择（`wx.chooseMedia` / `wx.chooseMessageFile`）+ `wx.uploadFile` 的 `onProgressUpdate` |
| DatePicker | 范围选择（左右双面板）、`disabledDate` 函数 | 只做单日 + 月份选择；`disabledDate` → `minDate` / `maxDate` |
| Form | 24 栅格 `labelCol` / `wrapperCol`、`dependencies`、异步 `validator`、`normalize` | `labelWidth` 单属性；校验规则全部可序列化（`pattern` 用字符串） |
| Notification | 全局单例 + Portal，`Notification.success()` 一行调用 | 先放一个 `<ai-notification id="notice" />`，再 `selectComponent('#notice').success({...})` |
| Tooltip | `hover` 触发、`island` 变体的 SVG clip-path 有机轮廓 | 点击 / 长按触发；`island` 用大圆角 + 圆点尾巴近似 |
| Select / TimePicker / DatePicker | 键盘导航（↑↓ / Enter / Esc）、点外部关闭靠 `document` 监听 | 触屏点击；全屏透明遮罩关闭 |
| Typewriter | `children: ReactNode`（保留原有元素结构） | `text` 属性（拿不到 slot 的文本长度） |
| CodeBlock | 完整语法高亮 | 保留上游那套正则的「关键字 / 字符串 / 注释 / 数字 / JSX」着色 |
| Carousel | 拖拽切换 | 原生 `<swiper>`（行为更接近原生手感） |
| Table | `dataSource` | `rows`（WXML 里 `data-*` 会被当 dataset） |

这些不是「做不了」，是「做法和 Web 版完全不同」，所以在组件文档里都单独说明了。

## 六、几个容易踩的坑

1. **`setData` 是异步的**：改完 `this.data` 后立刻读可能是旧值；需要 DOM 尺寸时放到 `setData` 的回调里。
2. **`observers` 会重复触发**：属性初始值也会走一次，别忘了在 `attached` 里兜底（本仓库的组件都做了幂等处理）。
3. **组件样式隔离**：页面写的 `.ai-btn { ... }` 不会生效，只能通过 `ext-class` / `ext-style`。
4. **slot 结构固定**：`<slot name="icon">` 只能塞一个节点，别指望像 children 那样随意嵌套。
5. **图片路径**：`src` 用包内绝对路径（`/assets/x.png`）或网络地址，不支持 `~` 别名。
6. **WXSS 里的 `url()`** 只能 `data:` 或 `https:`，引用包内图片会静默失败——图标因此全部内联成 base64。
7. **不要用 `wx:if` 包住有状态的组件再指望它保留状态**：会真的销毁重建。
8. **原生 `<button>` 自带 `width: 184px`**（基础库注入的样式，优先级高于组件里的 `button { width: auto }` 重置）。不压掉的话，所有按钮会变成 184px 宽、在一行里各占一行——这是本项目在模拟器里实际踩到的坑，`src/button/index.wxss` 用 `.ai-btn { width: auto !important }` + `.ai-btn--block { width: 100% !important }` 解决。同理 `height`、`border` 也建议写在类选择器上。
9. **给 `String` 属性传 `null` 会刷警告**：`[Component] property "src" ... received type-uncompatible value`。数据驱动渲染子组件前，先把缺省字段补成 `''`（见 `src/avatar-group/index.ts` 的 `asText`）。
10. **`miniprogram_npm` 不会被文件监听**：改完组件源码后，开发者工具里点「编译」或者重开工程才会生效，只改页面文件时才会热更新。改库的时候记得别把"没生效"当成"样式没写对"。
11. **弹层的水平位置要自己夹到视口里**：`position: absolute; left: 0` 是相对触发器的，触发器挨着屏幕左边时（280px 宽的面板）会被切掉一截。`ai-datepicker` / `ai-timepicker` 现在都在 `place()` 里算一个 `offsetX` 把面板夹在视口内。
12. **`relations` 的回调字段是 `unlinked`**，不是 `unlink`（写错 TS 会报 `RelationOption` 类型错误，JS 里则是静默不触发）。
13. **`relations` + `selectAllComponents` 双保险**：`ai-form` 用 `relations: descendant` 收集字段，但同时也会 `selectAllComponents('.ai-form-item')` 兜底，因为 slot 内容的 linked 时机和 DOM 顺序不一定一致。
14. **`setData` 之后 `this.data` 已是新值**，但视图渲染是异步的；量尺寸要等 `createSelectorQuery` 回调。
15. **WXSS 里没有 `cursor` / `:hover` / `scroll-snap`**：滚动吸附得自己算（`ai-timepicker` 只做预置 `scroll-top`，不做吸附）。
16. **别用 `__` 开头命名实例字段**：`preview/runtime.js` 内部有 `__ready` / `__render` / `__attached` 等方法，`this.__ready = true` 会把它覆盖成布尔值，然后运行时调 `instance.__ready()` 直接抛错。自定义字段请起有业务含义的名字。
17. **页面方法是序列化成源码再还原的**：预览页整份数据走 `JSON.stringify`，函数会被静默丢掉，所以 `build-preview.mjs` 把 `Page({})` 上的方法转成字符串，运行时用 `({ ... })` 包一层还原。加了页面方法后如果「点了没反应」，先确认它在 `page.methods` 里。
18. **重渲染前必须 `detached`**：预览模式下 `page.innerHTML = ''` 等价于组件销毁，运行时会统一调 `detached()`。少这一步，`ai-countdown` / `ai-countup` 这类定时器组件会在每次重渲染后多跑一份，表现为「数字跳得飞快」或 `complete` 事件触发多次。

## 七、怎么确认迁移结果是对的

```bash
npm run build      # 编译 + 同步到 examples/demo
npm run check      # 平台安全静态检查
npm run preview    # 浏览器里跑一遍真实组件代码
npm run preview:shot
```

`examples/demo` 里有一页把所有组件都摆了一遍，可以拿来对照设计稿改。真机验证还是建议用微信开发者工具，开发者工具的模拟器对 `hover-class`、原生 `<button>` 的表现最接近线上。