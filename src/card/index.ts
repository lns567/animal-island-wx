/**
 * ai-card —— 卡片
 *
 * 对应 Web 版 Card。children → 默认 slot；className/style → extClass/extStyle。
 * hoverable 的 -2px 位移在小程序里用 hover-class（按下态）实现。
 */

const COLORS = [
    'default',
    'app-pink',
    'purple',
    'app-blue',
    'app-yellow',
    'app-orange',
    'app-teal',
    'app-green',
    'app-red',
    'lime-green',
    'yellow-green',
    'brown',
    'warm-peach-pink',
];

const PATTERNS = COLORS.filter((color) => color !== 'default');

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 卡片类型：default / dashed */
        type: {
            type: String,
            value: 'default',
        },
        /** 背景颜色 */
        color: {
            type: String,
            value: 'default',
        },
        /** 背景花纹，none 表示无花纹 */
        pattern: {
            type: String,
            value: 'none',
        },
        /** 是否启用按下位移效果（可点击卡片） */
        hoverable: {
            type: Boolean,
            value: false,
        },
        /** 无障碍标签 */
        ariaLabel: {
            type: String,
            value: '',
        },
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        cls: 'ai-card',
        hoverClass: 'none',
    },

    observers: {
        'type, color, pattern, hoverable'() {
            this.setData({
                cls: resolveClass(this.data),
                hoverClass: this.data.hoverable ? 'ai-card--hover' : 'none',
            });
        },
    },

    methods: {
        handleTap() {
            this.triggerEvent('click', {});
        },
    },
});

function resolveClass(data: { type: string; color: string; pattern: string; hoverable: boolean }): string {
    const list = ['ai-card'];
    if (data.type === 'dashed') list.push('ai-card--dashed');
    if (data.color !== 'default' && COLORS.includes(data.color)) {
        list.push(`ai-card--${data.color}`);
    }
    if (data.pattern !== 'none' && PATTERNS.includes(data.pattern)) {
        list.push(`ai-card--pattern-${data.pattern}`);
    }
    if (data.hoverable) list.push('ai-card--hoverable');
    return list.join(' ');
}

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
