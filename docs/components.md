# 组件 API

所有组件的公共约定：

- 属性名在 WXML 里既可以用驼峰（`iconSize="20"`），也可以用连字符（`icon-size="20"`）。
- 布尔属性建议写 `{{true}}` / `{{false}}`，裸写属性名也能解析为 `true`。
- 事件一律 `bind:事件名`，数据在 `event.detail` 里。
- `ext-class` / `ext-style` 是唯一能穿透样式隔离的口子：前者加到组件最外层节点，后者内联到最外层节点。
  它走的是 `externalClasses`（不是普通属性），所以页面 WXSS 里的同名类能真正作用到组件最外层节点上。
- 颜色取值统一为 `default`、`app-pink`、`purple`、`app-blue`、`app-yellow`、`app-orange`、`app-teal`、`app-green`、`app-red`、`lime-green`、`yellow-green`、`brown`、`warm-peach-pink`。

## ai-button

手绘 3D 按钮，基于原生 `<button>`（因此支持 `open-type`、`form-type`）。禁用态没有用原生 `disabled`，而是自己拦点击，这样按下态、无障碍属性都还能表达。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `type` | `default` \| `primary` \| `dashed` \| `text` \| `link` | `default` | 视觉类型 |
| `size` | `small` \| `middle` \| `large` | `middle` | 高度 32 / 45 / 48 |
| `danger` | boolean | `false` | 危险色 |
| `ghost` | boolean | `false` | 幽灵按钮（透明底 + 主色文字） |
| `block` | boolean | `false` | 撑满父级宽度 |
| `loading` | boolean | `false` | 加载中，左侧转圈，自动拦截点击 |
| `disabled` | boolean | `false` | 禁用，半透明，拦截点击 |
| `icon` | string | `''` | 左侧图标名，见 [`ai-icon`](#ai-icon) |
| `icon-size` | number | `18` | 图标像素尺寸 |
| `content` | string | `''` | 文字内容（也可以直接用默认 slot） |
| `form-type` | `submit` \| `reset` \| `''` | `''` | 原生表单行为，`loading`/`disabled` 时自动置空 |
| `open-type` | string | `''` | 原生开放能力，如 `share`、`contact` |
| `lang` | string | `en` | 原生 `lang` 属性 |
| `aria-label` | string | `''` | 无障碍标签 |
| `ext-class` / `ext-style` | string | `''` | 外部样式 |

事件：`click`（`detail` 为空，参数在 `event` 上）。

插槽：`icon`（替换左侧图标）、默认插槽（替换文字）。

```html
<ai-button type="primary" content="开始冒险" bind:click="onStart" />
<ai-button type="primary" icon="star" content="收藏" />
<ai-button type="dashed" block="{{true}}">
    <text>自定义内容</text>
</ai-button>
<ai-button form-type="submit" type="primary" content="提交" />
```

## ai-card

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `type` | `default` \| `dashed` | `default` | 实线 / 虚线描边 |
| `color` | 颜色名 | `default` | 底色，`default` 为纸面色 |
| `pattern` | `none` \| 颜色名 | `none` | 点阵图案及其颜色 |
| `hoverable` | boolean | `false` | 可点击：按下缩放 + 阴影变化 |
| `aria-label` | string | `''` | 无障碍标签 |
| `ext-class` / `ext-style` | string | `''` | 外部样式 |

事件：`click`（仅 `hoverable` 为 `true` 时抛出）。

插槽：默认。

```html
<ai-card color="app-teal" pattern="app-teal" hoverable="{{true}}" bind:click="onPick">
    <text>今日天气：晴</text>
</ai-card>
```

## ai-input

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `size` | `small` \| `middle` \| `large` | `middle` | 高度 32 / 40 / 48 |
| `prefix` | string | `''` | 左侧图标名 |
| `suffix` | string | `''` | 右侧图标名 |
| `allow-clear` | boolean | `false` | 有内容时显示清除按钮 |
| `status` | `''` \| `error` \| `warning` | `''` | 状态色描边 + 阴影 |
| `shadow` | boolean | `false` | 底部 3px 立体阴影 |
| `disabled` | boolean | `false` | 禁用 |
| `value` | string | `''` | 受控值（传了就以它为准） |
| `default-value` | string | `''` | 非受控初始值 |
| `placeholder` | string | `''` | 占位文字 |
| `type` | `text` \| `number` \| `idcard` \| `digit` | `text` | 原生输入类型 |
| `password` | boolean | `false` | 密码输入 |
| `maxlength` | number | `140` | 最大长度 |
| `focus` | boolean | `false` | 自动聚焦 |
| `confirm-type` | `done` \| `send` \| `search` \| `next` \| `go` | `done` | 键盘右下角按钮 |
| `placeholder-style` | string | `''` | 占位文字样式字符串 |
| `aria-label` | string | `''` | 无障碍标签 |
| `ext-class` / `ext-style` | string | `''` | 外部样式 |

事件：

| 事件 | detail | 时机 |
| --- | --- | --- |
| `input` | `{ value }` | 每次按键 |
| `change` | `{ value }` | 失焦 |
| `focus` / `blur` | `{ value }` | 聚焦 / 失焦 |
| `confirm` | `{ value }` | 点键盘确认键 |
| `clear` | `{}` | 点清除按钮（同时会清空内部值） |

插槽：`prefix`、`suffix`（放自定义前后缀，比 `prefix`/`suffix` 属性更灵活）。

```html
<ai-input
    placeholder="搜索动物"
    prefix="search"
    allow-clear="{{true}}"
    shadow="{{true}}"
    value="{{keyword}}"
    bind:input="onInput"
    bind:change="onChange"
    bind:clear="onClear"
/>
```

## ai-switch

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `checked` | any | `null` | 受控开关；传了就以它为准，不传则内部自己维护 |
| `default-checked` | boolean | `false` | 非受控初始值 |
| `size` | `default` \| `small` | `default` | 尺寸 |
| `disabled` | boolean | `false` | 禁用 |
| `loading` | boolean | `false` | 加载态（显示转圈，不可切换） |
| `checked-children` | string | `''` | 打开时轨道内文字 |
| `un-checked-children` | string | `''` | 关闭时轨道内文字 |
| `aria-label` | string | `''` | 无障碍标签 |
| `ext-class` | string | `''` | 外部样式 |

事件：`change`，`detail: { checked, value }`。

```html
<ai-switch checked="{{musicOn}}" checked-children="开" un-checked-children="关" bind:change="onMusic" />
```

## ai-tag

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `content` | string | `''` | 文字（也可用默认 slot） |
| `size` | `small` \| `medium` \| `large` | `medium` | 字号/内边距 |
| `variant` | `solid` \| `outlined` \| `dashed` \| `soft` | `soft` | 形态 |
| `color` | 颜色名 | `default` | 颜色 |
| `closable` | boolean | `false` | 显示关闭按钮 |
| `clickable` | boolean | `false` | 可点击：按下缩放 |
| `disabled` | boolean | `false` | 禁用 |
| `ext-class` / `ext-style` | string | `''` | 外部样式 |

事件：`click`（`clickable` 时）、`close`（点关闭按钮）。

插槽：默认。

```html
<ai-tag content="森林" color="app-green" variant="soft" closable="{{true}}" bind:close="onRemove" />
<ai-tag content="可点击" color="app-orange" clickable="{{true}}" bind:click="onPick" />
```

## ai-divider

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `type` | `dashed-brown` \| `thin` \| `hairline` \| `wave-yellow` \| `squiggle` | `dashed-brown` | 样式 |
| `icon` | string | `''` | 传了图标名就切换成「两侧虚线 + 中间图标」 |
| `icon-size` | number | `24` | 图标像素尺寸 |
| `icon-gap` | number | `8` | 图标与虚线的间距 |
| `ext-class` / `ext-style` | string | `''` | 外部样式 |

没有事件和插槽。宽度自动铺满，波浪/虚线会按屏宽算出整数个循环，避免右端被截断成半个图形。

```html
<ai-divider type="dashed-brown" />
<ai-divider type="wave-yellow" />
<ai-divider icon="fish" icon-size="{{22}}" icon-gap="{{10}}" />
```

## ai-title

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `content` | string | `''` | 文字（也可用默认 slot） |
| `size` | `small` \| `middle` \| `large` | `middle` | 字号 14 / 20 / 28 |
| `color` | 颜色名 | `default` | 主色 |
| `variant` | `ribbon` \| `layer` \| `tab` | `ribbon` | 飘带 / 双层纸 / 折角便签 |
| `ext-class` / `ext-style` | string | `''` | 外部样式 |

插槽：默认。

> 飘带和双层纸的下缘（燕尾、第二层纸）会伸出布局盒，排在下面时记得留出下边距。

```html
<ai-title content="今日岛屿" variant="ribbon" size="large" color="app-teal" />
<ai-title content="任务" variant="tab" size="small" color="app-orange" />
```

## ai-avatar

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `shape` | `circle` \| `square` | `circle` | 形状（方形带圆角） |
| `size` | `small` \| `middle` \| `large` \| number | `middle` | 32 / 40 / 48 或直接给像素 |
| `src` | string | `''` | 图片地址；为空或加载失败回退到图标/文字 |
| `icon` | string | `''` | 占位图标名，缺省 `user` |
| `content` | string | `''` | 文字；超宽会自动缩小字号 |
| `gap` | number | `4` | 文字与左右边界的最小间距，用于算缩放比例 |
| `label` | string | `''` | 无障碍标签（也作为图片 alt） |
| `ext-class` / `ext-style` | string | `''` | 外部样式 |

事件：`error`（图片加载失败时抛出，组件已自动回退到占位）。

```html
<ai-avatar src="/assets/avatar.png" size="large" label="用户头像" />
<ai-avatar content="鱼" size="large" />
<ai-avatar icon="bell" size="{{56}}" shape="square" />
```

## ai-avatar-group

Web 版靠 `children` 塞一组 `<Avatar>`；小程序读不到子节点，所以改成数据驱动。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `items` | array | `[]` | 头像数据，元素结构同 `ai-avatar` 的属性：`{ src, content, icon, shape, size }` |
| `max-count` | number | `0` | 最多显示几个，超出显示 `+N`；`0` 表示不折叠 |
| `size` | `small` \| `middle` \| `large` \| number | `middle` | 统一的头像尺寸 |
| `shape` | `circle` \| `square` | `circle` | 统一形状 |
| `gap` | number | `8` | 相邻头像的重叠间距（负 margin 的绝对值） |
| `ext-class` / `ext-style` | string | `''` | 外部样式 |

事件：`more`，`detail: { total, hidden }`（点了 `+N` 时抛出）。

```html
<ai-avatar-group items="{{members}}" max-count="{{3}}" size="middle" bind:more="onMore" />
```

## ai-badge

数字角标，可以包裹一个头像/图标（角标落在右上角），也可以单独使用。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `count` | number \| string | `''` | 展示内容，纯数字超过 `overflow-count` 时显示 `99+` |
| `overflow-count` | number | `99` | 封顶值 |
| `show-zero` | boolean | `false` | 数值为 0 时是否展示 |
| `dot` | boolean | `false` | 只显示 10×10 的小圆点 |
| `size` | `small` \| `medium` | `medium` | 尺寸（仅数字角标生效） |
| `color` | string | `app-red` | 与 Card / Tag 同一套调色板：`app-red` `app-pink` `app-orange` `app-yellow` `app-teal` `app-green` `app-blue` `purple` `lime-green` `yellow-green` `brown` `warm-peach-pink` |
| `standalone` | boolean | `false` | 强制「独立使用」形态；默认自动探测（量 slot 是否有尺寸） |
| `aria-label` | string | `''` | 无障碍标签 |
| `ext-class` / `ext-style` | string | `''` | 外部样式 |

```html
<!-- 包裹：角标钉在头像右上角，带奶油色描边 -->
<ai-badge count="{{3}}">
    <ai-avatar icon="user" size="middle" />
</ai-badge>

<!-- 独立：没有描边和位移，直接排在流里 -->
<ai-badge count="99+" color="app-teal" />
```

> Web 版用 `children === undefined` 判断是否独立使用；小程序组件拿不到「slot 里有没有东西」，改为在 `ready` 里量一次 `.ai-badge__content` 的尺寸，为 0 就切到独立形态。如果 slot 内容是绝对定位的（量出来也是 0），显式传 `standalone="{{true}}"`。

## ai-progress

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `percent` | number | `0` | 0–100，超出自动裁剪 |
| `size` | `small` \| `middle` \| `large` | `middle` | 轨道高度 14 / 24 / 32px |
| `show-info` | boolean | `true` | 是否显示右侧百分比 |
| `info-text` | string | `''` | 自定义文案（如 `4/9 关`），不传则显示 `xx%` |
| `duration` | number | `0.6` | 宽度过渡时长（秒），传 `0` 关闭 |
| `ext-class` / `ext-style` | string | `''` | 外部样式 |

轨道是「奶油底 + 14px 网格波点 + 2px 描边」，填充是薄荷竖向渐变；到 100% 会切成更亮的完成态。

```html
<ai-progress percent="{{64}}" size="middle" />
<ai-progress percent="{{45}}" info-text="4/9 关" />
<ai-progress percent="{{80}}" show-info="{{false}}" />
```

> Web 版的 `variant`（场景照片填充）没有移植：小程序里 `background-image` 不能引用包内图片，把照片转 base64 会让包体翻几倍。需要时自己用 `ext-style` 叠一张网络图。
> `infoFormat`（函数）改成了 `info-text` 字符串 —— 属性传不了函数。

## ai-skeleton

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `loading` | boolean | `true` | `false` 时渲染 slot 内容 |
| `variant` | `text` \| `circle` \| `rect` \| `paragraph` | `text` | 形态 |
| `active` | boolean | `true` | 银白流光动画 |
| `rows` | number | `3` | 行数（paragraph） |
| `width` | number \| string | `''` | 宽度（text），数字按 px |
| `width-value` | number \| string | `''` | 宽度（circle / rect） |
| `height-value` | number \| string | `''` | 高度 |
| `row-widths` | array | `[]` | 每行宽度（paragraph），不传是 100/92/84/76/68% |
| `radius` | number \| string | `''` | 圆角，数字按 px |
| `ext-class` / `ext-style` | string | `''` | 外部样式 |

```html
<ai-skeleton variant="text" width="60%" />
<ai-skeleton variant="circle" width-value="{{44}}" />
<ai-skeleton variant="paragraph" rows="{{3}}" />
<ai-skeleton variant="paragraph" rows="{{2}}" row-widths="{{['100%', '55%']}}" />

<!-- 加载完成后直接显示内容 -->
<ai-skeleton loading="{{loading}}">
    <view class="content">真实内容</view>
</ai-skeleton>
```

> Web 版的 `Skeleton.Button` / `Skeleton.Input` / `Skeleton.Avatar` 三个预设合并进来了：用 `variant="rect"` + `width-value` / `height-value` / `radius` 就能摆出按钮骨架（`100×45 / radius 50`）、输入框骨架（`200×40 / radius 50`）。

## ai-checkbox

复选框组，数据驱动。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `options` | array | `[]` | `[{ label, value, disabled }]` |
| `value` | array | `null` | 受控值数组；`null` = 非受控 |
| `default-value` | array | `[]` | 非受控时的初始选中值 |
| `size` | `small` \| `middle` \| `large` | `middle` | 18 / 22 / 28px 圆框 |
| `disabled` | boolean | `false` | 禁用整组 |
| `direction` | `horizontal` \| `vertical` | `horizontal` | 排列方向 |
| `ext-class` / `ext-style` | string | `''` | 外部样式 |

事件：`change`，`detail: { value: [...] }`（选中值的数组，每次都是新数组）。

```html
<ai-checkbox options="{{options}}" value="{{checked}}" bind:change="onCheckboxChange" />
```

> 勾选时的「小圆点爆开」动画完整保留；勾本身在 Web 版是 `<svg>` 描边动画，小程序里换成了 data URI 背景图 + 缩放弹出。

## ai-radio

单选框组，视觉与 `ai-checkbox` 完全一致（Web 版就是复用同一套样式）。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `options` | array | `[]` | `[{ label, value, disabled }]` |
| `value` | string \| number | `null` | 受控值；`null` = 非受控 |
| `default-value` | string \| number | `null` | 非受控时的初始选中值 |
| `size` | `small` \| `middle` \| `large` | `middle` | 尺寸 |
| `disabled` | boolean | `false` | 禁用整组 |
| `direction` | `horizontal` \| `vertical` | `horizontal` | 排列方向 |

事件：`change`，`detail: { value }`。

> 想受控又要求「初始不选中」，请传 `value="{{''}}"`——`null` 在小程序里表示「这个属性没传」，会被当成非受控。

## ai-collapse

FAQ 折叠卡片：圆形 +/- 图标 + 鱼形装饰 + 展开动画。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `question` | string | `''` | 标题（纯文本） |
| `answer` | string | `''` | 内容（纯文本） |
| `default-expanded` | boolean | `false` | 默认展开 |
| `disabled` | boolean | `false` | 禁用 |
| `ext-class` / `ext-style` | string | `''` | 外部样式 |

事件：`change`，`detail: { expanded }`。

```html
<ai-collapse question="营业时间？" answer="每天早上 8:00 到 22:00。" default-expanded="{{true}}" />
```

> Web 版用 `grid-template-rows: 0fr → 1fr` 做展开，小程序的 WKWebView 不插值 `fr`，这里改成量出内容真实高度后过渡 `max-height`，观感一致且两端都稳。
> `question` / `answer` 只收纯文本 —— 要富文本（链接、列表）请自己用 `ai-card` 拼。

## ai-tabs

标签页。**面板内容由页面自己渲染**：`ai-tabs` 负责标签条和切换事件，内容放进默认 slot，用 `wx:if` 跟着 `active-key` 切。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `items` | array | `[]` | `[{ key, label }]` |
| `active-key` | string | `null` | 受控激活项；`null` = 非受控 |
| `default-active-key` | string | `null` | 非受控时的默认项，不传用第一个 |
| `shadow` | boolean | `true` | 激活块下方是否带投影 |
| `aria-label` | string | `''` | 无障碍标签 |

事件：`change`，`detail: { key }`。

```html
<ai-tabs items="{{tabs}}" active-key="{{tabKey}}" bind:change="onTabChange">
    <view wx:if="{{tabKey === 'a'}}">A 的内容</view>
    <view wx:elif="{{tabKey === 'b'}}">B 的内容</view>
</ai-tabs>
```

```js
onTabChange(event) {
    this.setData({ tabKey: event.detail.key });
},
```

> Web 版的 `items[i].children` 是 ReactNode，组件自己挑内容渲染；小程序只有一个默认 slot，没法按 key 取不同节点，所以把内容留给页面。这不是妥协——小程序里页面本来就要自己管理 activeKey。

## ai-modal

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `open` | boolean | `false` | 是否可见 |
| `variant` | `game` \| `default` | `game` | `game` 异形自然外框，`default` 22px 圆角矩形 |
| `title` | string | `''` | 标题 |
| `width` | number | `520` | 宽度（px），会被 `max-width: calc(100% - 32px)` 收住 |
| `mask-closable` | boolean | `true` | 点遮罩是否关闭 |
| `footer` | `default` \| `slot` \| `none` | `default` | 底部：内置取消/确定、footer 具名插槽、不渲染 |
| `cancel-text` / `ok-text` | string | `取消` / `确定` | 内置按钮文案 |
| `aria-label` | string | `''` | 无障碍标签 |

事件：`close`（`detail: { source: 'mask' | 'cancel' }`）、`ok`。

```html
<ai-modal open="{{open}}" title="狸克的来信" bind:close="onClose" bind:ok="onOk">
    <view>今天的萝卜价格是 92 铃钱。</view>
</ai-modal>
```

> `game` 变体那条异形外框在 Web 版是内联 `<svg>` + `clip-path`。WXML 没有 `<svg>`，这里把同一条 blob 路径转成 SVG data URI 当 `mask-image` 用（`-webkit-mask-*` 在两端 WebView 都支持），形状一模一样。

## ai-drawer

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `open` | boolean | `false` | 是否可见 |
| `title` | string | `''` | 标题（空则不渲染头部和关闭按钮） |
| `placement` | `right` \| `left` \| `top` \| `bottom` | `right` | 弹出方向 |
| `width` | number | `378` | 宽度（left / right 生效，px） |
| `height` | number | `300` | 高度（top / bottom 生效，px） |
| `mask-closable` | boolean | `true` | 点遮罩是否关闭 |
| `footer` | `none` \| `slot` | `none` | 底部区域 |

事件：`close`（`detail: { source: 'mask' | 'button' }`）。

> Web 版的 `pushBackground`（打开时页面缩到 0.94 + 模糊 1px 的下沉景深）没做：组件拿不到页面节点。要这个效果，页面自己在 `onClose` / 打开时给自己的根容器加 `transform: scale(.94)` 就行。

## ai-loading

全屏夜空 + 50 片随机雪花，加载结束时整体淡出。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `active` | boolean | `true` | 是否加载中；`false` 时淡出再移除 |
| `tip` | string | `''` | 中央提示文字 |
| `delay` | number | `0` | 延迟多少毫秒再出现（避免闪一下） |
| `fade-duration` | number | `0.6` | 淡出时长（秒） |
| `z-index` | number | `3000` | 层级 |

```html
<ai-loading active="{{loading}}" tip="正在连接动物岛…" />
```

> 雪花在 `attached` 时用 JS 生成一次（尺寸 1–6px、水平位置随机、下落 6–12s、负延迟让首屏就有分布），和 Web 版一次性 `useMemo` 等价。

## 弹层的两个共性约束

1. **盖不住原生导航栏和 tabBar**：`position: fixed` 相对的是 webview 视口，原生导航栏在它上面。要真正全屏，页面得配 `"navigationStyle": "custom"` 自己画导航栏。
2. **关闭态留在树里**：三个弹层都用 `opacity` / `transform` / `visibility` 过渡，所以退场动画两端都看得到（Web 版 Modal 是直接 `return null`，其实没有退场）。

## ai-rate

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `value` | number | `null` | 受控评分；`null` = 非受控 |
| `default-value` | number | `0` | 非受控初始值 |
| `count` | number | `5` | 星星总数 |
| `size` | `small` \| `middle` \| `large` | `middle` | 20 / 26 / 34px |
| `readonly` | boolean | `false` | 只读 |
| `allow-clear` | boolean | `true` | 再点同一颗星清空（回调给 0） |

事件：`change`，`detail: { value }`。

```html
<ai-rate value="{{score}}" size="large" bind:change="onRateChange" />
```

> Web 版是内联 `<svg>` 直接改 `stroke` / `fill` 做「空心 → 金色填充」过渡。小程序里图标是 `background-image`，改不了色，所以内置了**两张图**（空心 `#c4b89e` / 金色填充带眼睛）叠在一起用 `opacity` 交叉淡入——观感和 Web 版一致。悬停预览和键盘导航没有（touch 设备上没有 hover）。
>
> 受控用法要注意：页面回写 `value` 会再触发一次渲染，组件内部会比对「点亮数量」是否变化，没变就不重建节点，否则刚点出来的弹跳和六点扩散会被立刻覆盖掉。

## ai-pagination

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `total` | number | `0` | 数据总数 |
| `current` | number | `null` | 受控当前页；`null` = 非受控 |
| `default-current` | number | `1` | 非受控初始页 |
| `page-size` | number | `null` | 受控每页条数 |
| `default-page-size` | number | `10` | 非受控每页条数 |
| `show-size-changer` | boolean | `false` | 显示每页条数切换器 |
| `page-size-options` | array | `[10,20,50,100]` | 可选条数 |
| `show-total` | boolean | `true` | 显示「共 N 条」 |
| `disabled` | boolean | `false` | 禁用 |
| `variant` | `orange` \| `teal` | `orange` | 配色 |

事件：`change`（`detail: { page, pageSize }`）、`showSizeChange`（`detail: { current, size }`）。

> 容器默认 `flex-wrap: wrap`：390px 屏上「共 N 条 + 7 个页码 + 每页条数」一行放不下，Web 版会溢出到屏幕外，这里直接换行。
> `showQuickJumper`（跳页输入框）没做——小程序里键盘弹起会顶起页面，需要跳页时页面自己放个 `ai-input` 更合适。

## ai-countdown

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `value` | number | `0` | 结束时间（毫秒时间戳） |
| `format` | string | `HH:mm:ss` | 支持 `DD` / `HH` / `mm` / `ss`，字面量原样输出 |
| `prefix` | string | `''` | 倒计时前的说明文字 |
| `size` | `small` \| `middle` \| `large` | `middle` | 尺寸 |
| `variant` | `default` \| `island` | `default` | 白底卡片 / 虚线岛屿卡片 |
| `bordered` | boolean | `false` | 数字块是否带边框 |

事件：`change`（`detail: { remaining }`）、`finish`。

```html
<ai-countdown value="{{endTime}}" prefix="距离大甩卖" variant="island" bind:finish="onFinish" />
```

> 数字是 20 面数字条（0-9 两轮）纵向滚动，里程表式**永远向下滚**，和 Web 版同一套逻辑；`9 → 0` 回绕时先关掉过渡瞬移到下一循环的同数字位再滚。小程序里没有强制回流（`void el.offsetHeight`），所以回绕用「两次 `setData`」实现：第一帧 `transition: none` 瞬移，32ms 后第二帧把过渡打开。

## ai-image

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `src` | string | `''` | 图片地址 |
| `alt` | string | `''` | 替代文本（无障碍） |
| `width` / `height` | number | `0` | 相框尺寸（px），不传由内容撑开 |
| `variant` | `default` \| `bordered` \| `stamp` | `default` | 卡片大阴影 / 白衬板 / 邮票齿孔 |
| `color` | string | `white` | `bordered` 下的底色（13 种 Card 同款） |
| `stamp-year` | string | `''` | `stamp` 下印在右上角的年份 |
| `mode` | string | `aspectFill` | 图片裁切方式 |
| `lazy` | boolean | `false` | 懒加载 |
| `preview` | boolean | `true` | 点击预览大图 |

事件：`load`、`error`。

```html
<ai-image src="/assets/photo.jpg" width="{{150}}" height="{{100}}" variant="stamp" stamp-year="2026" />
```

> 预览直接用 `wx.previewImage`——原生大图查看器（支持双指缩放、保存到相册），比 Web 版自绘的遮罩 + 关闭按钮体验更好。
> 邮票齿孔沿用 Web 版的 mask-composite 写法（四条贴边条带的半圆缺口求交），老 WebView 不支持时会退化成无齿孔的实心边框，形状不受影响。

## ai-table

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `columns` | array | `[]` | `[{ title, dataIndex, align, width }]` |
| `rows` | array | `[]` | 数据源 |
| `row-key` | string | `key` | 行 key 字段名 |
| `striped` | boolean | `true` | 斑马纹 |
| `show-header` | boolean | `true` | 显示表头 |
| `loading` | boolean | `false` | 加载中遮罩 |
| `empty-text` | string | `暂无数据` | 空状态文案 |

```html
<ai-table columns="{{cols}}" rows="{{list}}" />
```

> 注意属性叫 `rows` 而不是 `data-source`：WXML 里 `data-*` 会被框架当成 `dataset`，永远传不到同名 property 上（踩过一次，表格一直显示「暂无数据」）。
> `column.render` / `onRow` / `rowClassName` 是函数属性，小程序传不进来——单元格直接取 `record[dataIndex]` 并 `String()`，需要自定义渲染就在数据源里预处理成字符串。

## ai-footer

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `text` | string | `All Rights Reserved.` | 版权文案 |
| `year` | number | 当前年份 | 年份 |

```html
<ai-footer text="animal-island-wx · MIT License" />
```

## ai-backtop

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `visible` | boolean | `false` | 是否显示 |
| `visibility-height` | number | `400` | 参考阈值（显隐由页面判断） |
| `duration` | number | `300` | 回顶动画时长（ms） |

事件：`click`。

```html
<ai-backtop visible="{{showBackTop}}" bind:click="onBackTop" />
```

```js
onPageScroll(event) {
    const visible = event.scrollTop > 400;
    if (visible !== this.data.showBackTop) this.setData({ showBackTop: visible });
},
```

> **组件拿不到页面滚动事件**——这是小程序的能力边界，不是偷懒。Web 版自己监听 `scroll` 决定显隐，这里必须由页面在 `onPageScroll` 里判断后传 `visible`。记得只在布尔值变化时 `setData`，否则滚动会疯狂触发渲染。

## ai-carousel

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `items` | array | `[]` | 幻灯片 `[{ src, title, desc }]` |
| `active-index` | number | `0` | 当前索引（受控） |
| `default-active-index` | number | `0` | 非受控初始索引 |
| `autoplay` | boolean | `false` | 自动播放 |
| `interval` | number | `3000` | 自动播放间隔（ms） |
| `loop` | boolean | `true` | 首尾循环 |
| `show-arrows` | boolean | `true` | 左右箭头 |
| `show-dots` | boolean | `true` | 圆点指示器 |
| `height` | number | `220` | 视口高度（px） |

事件：`change`（`detail.index`）、`toggleplay`（`detail.paused`）。

```html
<ai-carousel items="{{slides}}" autoplay="{{true}}" interval="{{4000}}" height="{{200}}" bind:change="onSlideChange" />
```

> Web 版用 `children` 当幻灯片，小程序一个默认 slot 只能给一个节点，所以这里改成数据驱动。
> 手势 / 惯性 / 循环交给原生 `<swiper>`——比手搓 `touchstart/touchmove` 稳得多，也不会和页面纵向滚动打架。

## ai-time

无属性，挂载即走秒；脱离页面时自动清理定时器。

```html
<ai-time />
```

## ai-background

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `type` | string | `default` | `default` / `grid` / `sprinkles` / `dots-*`（12 色） |
| `image` | string | `''` | 自定义背景图（优先级高于 type） |
| `height` | number | `0` | 高度（px），不传由内容撑开 |

```html
<ai-background type="dots-teal" height="{{110}}">
    <text>内容</text>
</ai-background>
```

> 波点 / 网格 / 针糖全是纯 CSS 渐变 + 内联 SVG，从 Web 版样式一比一搬过来。
> Web 版的 `sweet-corner` / `coffee-break` 场景图依赖包内图片，小程序 `background-image` 引不了本地图，改用 `image` 传网络地址或 base64。

## ai-icon

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `name` | string | `''` | 图标名，完整列表见 `ICON_NAMES` |
| `size` | number \| string | `24` | 像素数，或任意 CSS 长度（`1em`、`40rpx`） |
| `label` | string | `''` | 传入后被读屏播报（不传按装饰性图标处理） |

共 31 个图标：

```
arrow-down arrow-left arrow-right arrow-up bell calendar check chevron-down
clock close copy donut donut-light download edit eye file fish heart home
image mail minus plus search settings star tag trash upload user
```

```js
// 需要校验图标名时可以直接引这个常量
const { ICON_NAMES } = require('animal-island-wx/index');
```

图标名写错会在控制台告警，不会静默渲染成空白。

---

# 第 12~15 批新增（11 个）

## ai-codeblock

带极简关键字着色的代码块。按行渲染（`<text space="nbsp">` 保住缩进），外面套 `scroll-view` 横向滚动。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `code` | string | `''` | 要高亮的源码 |
| `copyable` | boolean | `true` | 显示右上角复制按钮（`wx.setClipboardData`） |
| `show-line-numbers` | boolean | `false` | 显示行号 |
| `language` | string | `''` | 左上角语言角标，只影响文案，不参与着色 |
| `ext-class` / `ext-style` | string | `''` | 外部样式 |

事件：`copy`（`detail.code`）。

```html
<ai-codeblock code="{{snippet}}" language="wx" show-line-numbers="{{true}}" />
```

> 着色规则照搬 Web 版那套正则（注释 / 字符串 / 关键字 / 数字 / 组件名 / 函数名 / 属性名 / 操作符），
> 不是真正的 parser，装饰性够用。深浅两套配色没做，只有 Web 版那套深色奶油底。

## ai-typewriter

逐字显示。`text` 一变或 `trigger` 一变就从头重播。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `text` | string | `''` | 要显示的文本，支持 `\n` |
| `speed` | number | `90` | 每字间隔（ms） |
| `auto-play` | boolean | `true` | `false` 时直接全量显示 |
| `trigger` | any | `null` | 值变化即重播 |
| `cursor` | boolean | `false` | 显示闪烁光标 |
| `cursor-text` | string | 竖线字符 | 光标符号 |
| `ext-class` / `ext-style` | string | `''` | 外部样式 |

事件：`done`（`detail.text`）。定时器在 `detached` 里清理。

```html
<ai-typewriter text="{{story}}" speed="{{70}}" cursor="{{true}}" trigger="{{replayKey}}" bind:done="onDone" />
```

> Web 版接收 `children: ReactNode` 并保留原有元素结构；小程序读不到 slot 的文本长度，所以改成 `text` 属性。

## ai-cursor

「跟随手指的装饰光标」。**小程序没有 CSS `cursor`，这是降级实现**。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `type` | `default` \| `raindrop` | `default` | 指针图形（箭头 / 蓝色雨滴） |
| `follow` | boolean | `true` | 是否跟随手指 |
| `hide-delay` | number | `600` | 松手后停留多久消失（ms） |
| `ext-class` / `ext-style` | string | `''` | 外部样式 |

插槽：默认（被包裹的内容）。

```html
<ai-cursor type="raindrop"><view class="card">按住我拖动</view></ai-cursor>
```

> 触摸事件绑在包裹层上，指针用 `position: fixed` 跟着 `touch.clientX/Y` 走，`pointer-events: none` 不拦点击。

## ai-tooltip

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | string | `''` | 提示内容，可用 `\n` 换行 |
| `placement` | `top` / `top-start` / `top-end` / `bottom` / `bottom-start` / `bottom-end` / `left` / `left-start` / `left-end` / `right` / `right-start` / `right-end` | `top` | 位置 |
| `trigger` | `click` \| `longpress` | `click` | 触发方式 |
| `variant` | `default` \| `island` | `default` | `island` 为治愈海岛气泡（大圆角近似，不是 SVG clip-path） |
| `bordered` | boolean | `true` | 是否描边（含箭头描边） |

事件：`open` / `close`。插槽：默认（触发器）。

```html
<ai-tooltip title="改一下试试" placement="top-start">
    <ai-button type="default" size="small" content="悬停我" />
</ai-tooltip>
```

> 点击气泡本身或点全屏透明遮罩都会关闭。Web 版的 `hover` 触发在小程序里无法等价实现。

## ai-select

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `options` | `Array<{key,label}>` | `[]` | 选项 |
| `value` | string | `''` | 受控值 |
| `default-value` | string | `''` | 非受控初始值 |
| `placeholder` | string | `请选择` | 占位文案 |
| `disabled` | boolean | `false` | 禁用 |
| `aria-label` | string | `''` | 无障碍标签 |

事件：`change`（`detail: { key, label, value }`）、`open`、`close`。

```html
<ai-select options="{{options}}" value="{{value}}" bind:change="onSelect" />
```

> 面板默认贴在触发器右侧（与 Web 版一致），右侧放不下自动翻到左侧，上下空间不够则改成顶部/底部对齐。
> Web 版没有多选与搜索，这里也没有。

## ai-timepicker

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `value` / `default-value` | string | `''` | `HH:mm:ss`（受控 / 非受控） |
| `placeholder` | string | `请选择时间` | 占位文案 |
| `disabled` | boolean | `false` | 禁用 |
| `allow-clear` | boolean | `false` | 一键清空 |
| `size` | `small` \| `middle` \| `large` | `middle` | 高度 32 / 40 / 48 |
| `status` | `''` \| `error` \| `warning` | `''` | 校验状态 |
| `format` | string | `HH:mm:ss` | 含 `ss` 才显示秒列 |
| `hour-step` / `minute-step` / `second-step` | number | `1` | 步进 |

事件：`change`（`detail.value`）、`clear`、`open`、`close`。

> 三列 `scroll-view`，打开时把选中项滚到偏上位置；**不做滚动吸附**（WXSS 没有 scroll-snap，手写吸附会和惯性打架）。

## ai-datepicker

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `value` / `default-value` | string | `''` | `YYYY-MM-DD`；`picker="month"` 时为 `YYYY-MM` |
| `picker` | `date` \| `month` | `date` | 选择粒度 |
| `placeholder` | string | `请选择日期` | 占位文案 |
| `disabled` | boolean | `false` | 禁用 |
| `allow-clear` | boolean | `false` | 一键清空 |
| `size` | `small` \| `middle` \| `large` | `middle` | 尺寸 |
| `status` | `''` \| `error` \| `warning` | `''` | 校验状态 |
| `format` | string | 按 `picker` 推导 | 支持 `YYYY` / `MM` / `DD` / `M` / `D` |
| `min-date` / `max-date` | string | `''` | 可选范围（`YYYY-MM-DD`） |
| `show-today` | boolean | `true` | 底部「今天」按钮 |

事件：`change`（`detail.value`）、`clear`、`open`、`close`。

> 点标题可在「日期网格」和「月份网格」之间切换；‹‹ ›› 按年翻，‹ › 按月翻。
> **范围选择（`range`）留到二期**：Web 版是 600px 双面板，390px 屏塞不下。

## ai-form / ai-form-item

表单容器 + 字段。字段通过小程序官方的 `relations: descendant/ancestor` 挂到 `ai-form` 上。

### ai-form

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `layout` | `horizontal` \| `vertical` | `horizontal` | 布局 |
| `label-width` | string | `88px` | 横向布局下 label 宽度 |
| `colon` | boolean | `true` | label 后是否加冒号 |
| `disabled` | boolean | `false` | 全局禁用 |
| `size` | `small` \| `middle` \| `large` | `middle` | 尺寸 |
| `initial-values` | object | `{}` | 初始值，按字段名分发 |

实例方法（`this.selectComponent('#form')` 调用）：

| 方法 | 说明 |
| --- | --- |
| `validate()` | 校验全部字段，resolve `{ ok, values, errors }` |
| `getFieldsValue()` | 取全部字段值 |
| `setFieldsValue(obj)` | 批量写值 |
| `resetFields()` | 全部重置到 `initial-values` |

事件：`finish`（校验通过，`detail.values`）、`finishFailed`（`detail.errors`）、`valueschange`（`detail: { name, value, values }`）、`reset`。

### ai-form-item

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `name` | string | `''` | 字段名 |
| `label` | string | `''` | 标签 |
| `rules` | `Array<RuleObject>` | `[]` | 校验规则（见下） |
| `required` | boolean | `false` | 只控制星号，校验仍看 `rules.required` |
| `help` | string | `''` | 帮助文本（有错误时优先显示错误） |
| `control` | `input` \| `switch` \| `custom` | `custom` | 内置控件 / 用 slot |
| `value` | any | `''` | `custom` 模式的受控值 |
| `placeholder` | string | `''` | 内置控件的占位文案 |
| `layout` / `label-width` / `colon` / `disabled` / `size` | —— | 继承父级 | 覆盖 `ai-form` 上的同名配置 |

`RuleObject` 只接受可序列化字段（WXML 传不了函数）：

```js
{ required: true, message: '请输入昵称' }
{ min: 2, max: 8, message: '昵称 2~8 个字符' }
{ len: 6, message: '必须是 6 位' }
{ type: 'email' | 'url' | 'number' | 'integer' | 'array' | 'boolean' }
{ pattern: '^[a-z]+$', message: '只能小写字母' }   // 正则用字符串
{ whitespace: true }                                // 纯空白也算空
```

```html
<ai-form id="demoForm" initial-values="{{formInitial}}" bind:finish="onFinish">
    <ai-form-item name="nick" label="昵称" control="input" required rules="{{nickRules}}" />
    <ai-form-item name="email" label="邮箱" control="input" rules="{{emailRules}}" help="用于接收通知" />
    <ai-form-item name="notify" label="订阅" control="switch" />
    <ai-form-item name="bio" label="简介" help="slot 模式：控件自己写">
        <ai-input value="{{bio}}" bind:input="onBioInput" />
    </ai-form-item>
</ai-form>
```

```js
onSubmit() {
    this.selectComponent('#demoForm').validate().then(({ ok, values }) => {
        if (ok) wx.showToast({ title: '校验通过' });
    });
}
```

> 校验时机：内置 input 失焦时校验一次、switch 切换即校验、值变化先清掉旧错误；`validate()` 时强制全量校验。
> `custom` 模式的字段，值以 `value` 属性为准（slot 里的控件由页面自己维护）。

## ai-upload

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `action` | string | `''` | 上传地址，空则只做本地选择 |
| `name` | string | `file` | 文件字段名 |
| `accept` | `image` \| `video` \| `all` \| `file` | `image` | 选择类型（image/video 走 `chooseMedia`，其余走 `chooseMessageFile`） |
| `multiple` | boolean | `false` | 多选 |
| `max-count` | number | `0` | `1` 表示替换，`>1` 表示超出丢弃，`0` 不限 |
| `disabled` | boolean | `false` | 禁用 |
| `list-type` | `text` \| `picture` \| `picture-card` | `text` | 列表形态 |
| `show-upload-list` | boolean | `true` | 是否显示列表 |
| `tip` | string | `''` | 触发区下方提示 |
| `text` | string | `点击上传` | 触发区文案 |
| `default-file-list` | array | `[]` | 初始列表 |
| `form-data` / `headers` | object | `{}` | 附加字段 / 请求头 |

事件：`change`（`detail: { file, fileList }`，新增/进度/完成/删除都会触发）、`remove`、`preview`、`exceed`。

```html
<ai-upload list-type="picture-card" accept="image" max-count="{{3}}" bind:change="onUploadChange" />
```

> `wx.uploadFile` 只支持 POST，所以 Web 版的 `method` 属性没有移植；拖拽、`beforeUpload`、`customRequest` 都不支持。

## ai-notification

通知提醒，6 个停靠位置 × 4 种类型。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `open` | boolean | `false` | 声明式打开 |
| `message` | string | `''` | 标题 |
| `description` | string | `''` | 正文 |
| `type` | `success` \| `info` \| `warning` \| `error` | `info` | 类型 |
| `position` | `top` \| `topLeft` \| `topRight` \| `bottom` \| `bottomLeft` \| `bottomRight` | `top` | 停靠位置 |
| `duration` | number | `4.5` | 自动关闭秒数，`0` 不自动关 |

实例方法：

| 方法 | 说明 |
| --- | --- |
| `open(config)` | 通用打开 |
| `success` / `info` / `warning` / `error(config)` | 快捷打开 |
| `close(key)` | 关闭指定通知 |
| `destroy()` | 清空全部 |

`config`：`{ message, description, duration, position, type, key }`。同 `key` 再次打开是更新而不是新增。

事件：`open` / `close` / `click`（`detail.key`）。

```html
<ai-notification id="notice" />
```

```js
this.selectComponent('#notice').success({ message: '保存成功', description: '已同步', position: 'top' });
```

> 没有 portal，所以必须在页面里放一个组件占位；`pointer-events` 只在卡片上开启，不会挡住页面其它交互。

---

# 第 16 批新增（2 个，对齐 upstream v2.3.0）

## ai-countup

数字滚动计分。数字块、前后缀、结束时的弹跳 + 光环 + 星芒。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `start` | number | `0` | 起始值 |
| `end` | number | `0` | 目标值 |
| `duration` | number | `2` | 动画时长（秒），`0` 直接到位 |
| `is-counting` | boolean | `false` | 是否计数；改回 `false` 暂停并保留当前值，再改 `true` 从暂停处继续 |
| `decimal-places` | number | `-1` | 小数位数，`-1` 取 `start`/`end` 中较大的 |
| `decimal-separator` | string | `.` | 小数点符号 |
| `thousands-separator` | string | `''` | 千分位符号，如 `,` |
| `easing` | string | `easeOutCubic` | `linear` / `easeInCubic` / `easeOutCubic` / `easeInOutCubic` / `easeOutExpo` |
| `update-interval` | number | `0` | 取值间隔（秒），`0` 表示按 ~30fps 连续取值 |
| `prefix` / `suffix` | string | `''` | 数字前后缀，如 `¥` / `分` |
| `size` | `small` \| `middle` \| `large` | `middle` | 尺寸 |
| `variant` | `default` \| `island` | `default` | 皮肤 |
| `bordered` | boolean | `false` | 数字块描边 |
| `celebrate` | boolean | `false` | 结束后播庆祝动效 |
| `celebrate-text` | string | `''` | 庆祝贴纸文案，留空不弹贴纸 |
| `repeat` / `repeat-delay` | boolean / number | `false` / `0` | 结束后自动重播 / 重播前等待秒数 |

实例方法：`reset(newStartAt?)` 从起始值（或指定值）重播，`freeze()` 立刻跳到终值。

事件：`update`（`detail.value`，每帧触发）、`complete`（`detail.elapsed`，秒）。

```html
<ai-countup
    id="score"
    start="{{0}}"
    end="{{2680}}"
    is-counting="{{counting}}"
    prefix="¥"
    thousands-separator=","
    celebrate="{{true}}"
    celebrate-text="全场最佳"
    bind:complete="onDone"
/>
```

```js
onReplay() {
    this.selectComponent('#score').reset(0);
}
```

> 小程序没有 `requestAnimationFrame`，动画由 `setTimeout` 循环 + 时间轴量化驱动（默认 33ms 一跳）。
> 每帧只在「格式化后的文案真的变了」时 `setData`，长时长动画不会白跑几十次渲染。
> Web 版的 `formatter` 与 render prop 传不了函数，未移植；`onComplete` 的 `shouldRepeat` 返回值改成 `repeat` 属性。

## ai-calendar

月历 + 事项。6×7 固定网格，跨天事项自动按周切片成连续事项条。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `value` | string | `''` | 受控选中日期 `YYYY-MM-DD` |
| `default-value` | string | `''` | 非受控初始选中日期，不传默认今天 |
| `panel-value` | string | `''` | 受控面板月份 `YYYY-MM` 或 `YYYY-MM-DD` |
| `default-panel-value` | string | `''` | 非受控初始面板月份 |
| `events` | array | `[]` | 事项列表，见下 |
| `show-event-time` | boolean | `true` | 事项条上是否展示起始时间 |
| `width` | number | `0` | 面板宽度（px），不传则按容器宽度自动缩放 |
| `aria-label` | string | `日历` | 无障碍标签 |

`events` 单项：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `title` | string | 事项文案 |
| `start` | string | `YYYY-MM-DD` 或 `YYYY-MM-DD HH:mm` |
| `end` | string | 结束日期，省略时等同 `start`；跨天会渲染成连续条 |
| `color` | `teal` \| `amber` \| `coral` \| `green` \| `purple` | 配色，默认 `teal` |
| `show-time` | boolean | 是否在这条事项上展示时间，`false` 可单独关掉 |

事件：`change`（`detail.date`）、`panelChange`（`detail.month`，翻月/翻年/点补位格时触发）。

实例方法：`goToMonth('YYYY-MM')`、`selectDate('YYYY-MM-DD')`。

```html
<ai-calendar value="{{date}}" events="{{events}}" bind:change="onPick" bind:panelChange="onPanel" />
```

```js
events: [
    { title: '钓鱼大赛', start: '2026-11-02 09:30', end: '2026-11-04', color: 'teal' },
    { title: '生日会', start: '2026-11-05 18:00', color: 'coral' },
]
```

> **布局**：同一天最多平铺 2 条事项，放不下的折叠成 `+N`；跨天事项按自然周切成不超过 7 列的片段，
> 续接片段不重复展示起始时间。算法与 Web 版逐行一致。
> **尺寸**：所有行高/字号由面板宽度推导（基准 750px，缩放系数 0.6~2），不需要 size 档位。
> **改动事项请整体换新数组**：小程序不会深度监听数组内对象的就地修改。
> **未移植**：`draggableEvents` / `onEventCreate`（Web 版走鼠标拖拽，小程序里 `touchmove` 会和页面滚动抢手势）、
> 键盘无障碍（roving tabindex / 方向键，小程序没有 Tab 焦点模型）。
