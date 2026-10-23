/**
 * ai-drawer —— 抽屉
 *
 * 与 Web 版 Drawer 的差异（详见 docs/migration-from-react.md）：
 * - 没有 createPortal，直接 fixed 定位；关闭态留在树里，靠 transform 过渡（和 Web 版一致，
 *   退场动画两端都能看到）
 * - pushBackground（打开时把页面缩到 0.94 + 模糊 1px 的下沉景深）没做：组件拿不到页面节点，
 *   要这个效果得由页面自己在 onDrawerOpen 里给自己的根容器加类
 * - footer 用三态：`default` 用 footer 具名插槽，`none` 不渲染
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
        /** 标题 */
        title: {
            type: String,
            value: '',
        },
        /** 弹出位置：right / left / top / bottom */
        placement: {
            type: String,
            value: 'right',
        },
        /** 宽度（left / right 生效，px） */
        width: {
            type: Number,
            value: 378,
        },
        /** 高度（top / bottom 生效，px） */
        height: {
            type: Number,
            value: 300,
        },
        /** 点遮罩是否关闭 */
        maskClosable: {
            type: Boolean,
            value: true,
        },
        /** 底部区域：none / slot */
        footer: {
            type: String,
            value: 'none',
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
        panelStyle: '',
    },

    observers: {
        'placement, width, height'() {
            this.buildStyle();
        },
    },

    lifetimes: {
        attached() {
            this.buildStyle();
        },
    },

    methods: {
        buildStyle() {
            const { placement, width, height } = this.data;
            const horizontal = placement === 'left' || placement === 'right';
            const size = horizontal ? Number(width) || 378 : Number(height) || 300;
            this.setData({ panelStyle: horizontal ? `width:${size}px;` : `height:${size}px;` });
        },

        handleMaskTap() {
            if (!this.data.maskClosable) return;
            this.triggerEvent('close', { source: 'mask' });
        },

        handleClose() {
            this.triggerEvent('close', { source: 'button' });
        },

        /** 面板内的点击不要冒泡到遮罩 */
        noop() {
            // 故意留空：只在 WXML 上挂 catchtap 阻止冒泡
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
