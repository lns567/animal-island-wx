/**
 * ai-collapse —— 可展开的问答卡片
 *
 * 与 Web 版 Collapse 的差异（详见 docs/migration-from-react.md）：
 * - Web 版用 `grid-template-rows: 0fr → 1fr` 做展开动画；小程序的 WKWebView 不插值 fr，
 *   这里改成量出内容真实高度后过渡 max-height（等价观感，iOS / Android 都稳）
 * - question / answer 只支持纯文本（Web 版是 ReactNode）；要富文本请自己用 ai-card 拼
 * - 叶子装饰用内置 fish 图标，展开时旋转 45°
 */

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 标题 */
        question: {
            type: String,
            value: '',
        },
        /** 内容 */
        answer: {
            type: String,
            value: '',
        },
        /** 是否默认展开 */
        defaultExpanded: {
            type: Boolean,
            value: false,
        },
        /** 是否禁用 */
        disabled: {
            type: Boolean,
            value: false,
        },
        /** 追加到根节点的行内样式 */
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        expanded: false,
        /** 展开高度，喂给 max-height 过渡 */
        panelHeight: 0,
        /** 用户是否手动操作过（操作后不再跟随 defaultExpanded） */
        touched: false,
    },

    observers: {
        defaultExpanded(value: boolean) {
            if (!this.data.touched) this.setData({ expanded: Boolean(value) });
        },
    },

    lifetimes: {
        ready() {
            if (this.data.expanded) this.measure((height) => this.setData({ panelHeight: height }));
        },
    },

    methods: {
        /** 量一次内容真实高度（收起状态下也能量到，overflow:hidden 不影响子元素高度） */
        measure(callback: (height: number) => void) {
            this.createSelectorQuery()
                .select('.ai-collapse__content')
                .boundingClientRect((rect) => {
                    const height = rect && rect.height ? Math.ceil(rect.height) : 0;
                    callback(height > 0 ? height : 500);
                })
                .exec();
        },

        handleToggle() {
            if (this.data.disabled) return;
            const next = !this.data.expanded;
            if (!next) {
                this.setData({ expanded: false, panelHeight: 0, touched: true });
                this.triggerEvent('change', { expanded: false });
                return;
            }
            this.measure((height) => {
                this.setData({ expanded: true, panelHeight: height, touched: true });
                this.triggerEvent('change', { expanded: true });
            });
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
