/**
 * ai-tag —— 标签
 *
 * 与 Web 版 Tag 的差异：
 * - children → `content` 属性或默认 slot
 * - onClick / onClose → `bind:click` / `bind:close`
 * - 色板与 Card / Title 共用同一套（app-pink / purple / app-blue …）
 */

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 文本内容（也可用默认 slot） */
        content: {
            type: String,
            value: '',
        },
        /** 尺寸：small / medium / large */
        size: {
            type: String,
            value: 'medium',
        },
        /** 风格：solid / outlined / dashed / soft */
        variant: {
            type: String,
            value: 'soft',
        },
        /** 颜色 */
        color: {
            type: String,
            value: 'default',
        },
        /** 可关闭 */
        closable: {
            type: Boolean,
            value: false,
        },
        /** 可点击（配合 bind:click） */
        clickable: {
            type: Boolean,
            value: false,
        },
        disabled: {
            type: Boolean,
            value: false,
        },
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        cls: 'ai-tag ai-tag--medium ai-tag--soft',
        interactive: false,
    },

    observers: {
        'size, variant, color, closable, clickable, disabled'() {
            this.setData({
                cls: resolveClass(this.data),
                interactive: this.data.clickable && !this.data.disabled,
            });
        },
    },

    lifetimes: {
        attached() {
            this.setData({ cls: resolveClass(this.data) });
        },
    },

    methods: {
        handleTap() {
            if (this.data.disabled) return;
            this.triggerEvent('click', {});
        },

        handleClose() {
            if (this.data.disabled) return;
            this.triggerEvent('close', {});
        },
    },
});

const COLORS = [
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

function resolveClass(data: {
    size: string;
    variant: string;
    color: string;
    disabled: boolean;
    clickable: boolean;
}): string {
    const list = ['ai-tag'];
    const size = ['small', 'medium', 'large'].includes(data.size) ? data.size : 'medium';
    const variant = ['solid', 'outlined', 'dashed', 'soft'].includes(data.variant) ? data.variant : 'soft';
    list.push(`ai-tag--${size}`, `ai-tag--${variant}`);
    if (COLORS.includes(data.color)) list.push(`ai-tag--c-${data.color}`);
    if (data.disabled) list.push('ai-tag--disabled');
    if (data.clickable && !data.disabled) list.push('ai-tag--clickable');
    return list.join(' ');
}

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
