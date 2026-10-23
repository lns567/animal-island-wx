/**
 * ai-modal —— 模态对话框
 *
 * 与 Web 版 Modal 的差异（详见 docs/migration-from-react.md）：
 * - 没有 createPortal：直接 `position: fixed` 铺满视口，层级 z-index: 1000
 * - 关闭态也留在节点树里，靠 opacity / transform 过渡（Web 版关闭时直接 return null，
 *   所以 Web 版其实没有退场动画）
 * - game 变体的异形外框：WXML 没有 <svg>，把那条 blob 路径转成 SVG data URI 当 mask-image
 *   用，形状和 Web 版完全一致；`-webkit-mask-*` 在 iOS / Android 的 WebView 上都支持
 * - Cursor / Typewriter 包裹层没有移植（小程序没有自定义光标，slot 里的内容也没法逐字打）
 * - footer 用三态：`default` 内置取消/确定、`slot` 用 footer 具名插槽、`none` 不渲染
 */

Component({
    externalClasses: ['extClass'],
    options: {
        multipleSlots: true,
    },

    properties: {
        /** 是否可见 */
        open: {
            type: Boolean,
            value: false,
        },
        /** 弹窗类型：default 常规圆角 / game 异形外框 */
        variant: {
            type: String,
            value: 'game',
        },
        /** 标题 */
        title: {
            type: String,
            value: '',
        },
        /** 宽度（px） */
        width: {
            type: Number,
            value: 520,
        },
        /** 点遮罩是否关闭 */
        maskClosable: {
            type: Boolean,
            value: true,
        },
        /** 底部区域：default / slot / none */
        footer: {
            type: String,
            value: 'default',
        },
        /** 取消按钮文案 */
        cancelText: {
            type: String,
            value: '取消',
        },
        /** 确定按钮文案 */
        okText: {
            type: String,
            value: '确定',
        },
        /** 无障碍标签 */
        ariaLabel: {
            type: String,
            value: '',
        },
        /** 追加到根节点的行内样式 */
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        dialogStyle: '',
    },

    observers: {
        width(value: number) {
            const px = Number(value) > 0 ? Number(value) : 520;
            this.setData({ dialogStyle: `width:${px}px;` });
        },
    },

    lifetimes: {
        attached() {
            const px = Number(this.data.width) > 0 ? Number(this.data.width) : 520;
            this.setData({ dialogStyle: `width:${px}px;` });
        },
    },

    methods: {
        handleMaskTap() {
            if (!this.data.maskClosable) return;
            this.triggerEvent('close', { source: 'mask' });
        },

        handleCancel() {
            this.triggerEvent('close', { source: 'cancel' });
        },

        handleOk() {
            this.triggerEvent('ok', {});
        },

        /** 面板内的点击不要冒泡到遮罩 */
        noop() {
            // 故意留空：只在 WXML 上挂 catchtap 阻止冒泡
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
