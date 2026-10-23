/**
 * ai-tooltip —— 文字提示
 *
 * 与 Web 版 Tooltip 的差异（详见 docs/migration-from-react.md）：
 * - Web 版默认 `hover` 触发；小程序没有 hover（hover-class 只改样式、不抛事件），
 *   所以 `trigger` 只保留 `click`（默认）与 `longpress` 两种
 * - 关闭方式：点击提示气泡本身、或点一个全屏透明遮罩（替代 Web 版的 document 监听）
 * - `variant="island"` 的有机气泡在 Web 版用 SVG clip-path 实现，WXSS 里 clip-path 不可靠，
 *   这里降级为「大圆角气泡 + 圆点尾巴」，只保留柔和观感
 * - 触发器用默认 slot（Web 版靠 cloneElement 注入事件，小程序直接在包裹层上监听）
 */

const PLACEMENTS = [
    'top',
    'top-start',
    'top-end',
    'bottom',
    'bottom-start',
    'bottom-end',
    'left',
    'left-start',
    'left-end',
    'right',
    'right-start',
    'right-end',
];

Component({
    externalClasses: ['extClass'],

    properties: {
        /** 提示内容，可用 \n 换行 */
        title: {
            type: String,
            value: '',
        },
        /** 位置 */
        placement: {
            type: String,
            value: 'top',
        },
        /** 触发方式：click / longpress */
        trigger: {
            type: String,
            value: 'click',
        },
        /** 视觉风格：default 标准矩形 / island 治愈海岛气泡（降级实现） */
        variant: {
            type: String,
            value: 'default',
        },
        /** 是否显示边框 */
        bordered: {
            type: Boolean,
            value: true,
        },
        /** 追加到根节点的行内样式 */
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        visible: false,
        placementClass: 'ai-tooltip__panel--top',
    },

    observers: {
        placement(value: string) {
            const safe = PLACEMENTS.indexOf(value) >= 0 ? value : 'top';
            this.setData({ placementClass: `ai-tooltip__panel--${safe}` });
        },
    },

    lifetimes: {
        attached() {
            const safe = PLACEMENTS.indexOf(this.data.placement) >= 0 ? this.data.placement : 'top';
            this.setData({ placementClass: `ai-tooltip__panel--${safe}` });
        },
    },

    methods: {
        handleTrigger() {
            if (this.data.trigger === 'longpress') return;
            this.setData({ visible: !this.data.visible });
            if (!this.data.visible) this.triggerEvent('close');
            else this.triggerEvent('open');
        },

        handleLongPress() {
            if (this.data.trigger !== 'longpress') return;
            this.setData({ visible: true });
            this.triggerEvent('open');
        },

        close() {
            if (!this.data.visible) return;
            this.setData({ visible: false });
            this.triggerEvent('close');
        },

        /** 气泡内部点击不冒泡到遮罩 */
        noop() {
            // 故意留空
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
