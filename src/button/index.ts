/**
 * ai-button —— 按钮
 *
 * 与 Web 版 Button 的差异（详见 docs/migration-from-react.md）：
 * - children → 默认 slot，或 `content` 文字属性
 * - icon（ReactNode）→ `icon` 图标名 + `icon` 命名 slot
 * - onClick → `bind:click`（用 bindtap 触发，和 Web 一样会向上冒泡）
 * - :hover / :active → hover-class（触摸按下态）
 * - 不设置原生 disabled，避免被小程序默认 disabled 样式覆盖；改用 aria-disabled + JS 拦截，
 *   并在禁用时清空 form-type，防止表单被误提交。
 */

type ButtonType = 'primary' | 'default' | 'dashed' | 'text' | 'link';
type ButtonSize = 'small' | 'middle' | 'large';

Component({
    externalClasses: ['extClass'],
    options: {
        multipleSlots: true,
    },

    properties: {
        /** 按钮类型 */
        type: {
            type: String,
            value: 'default',
        },
        /** 按钮尺寸 */
        size: {
            type: String,
            value: 'middle',
        },
        /** 危险按钮 */
        danger: {
            type: Boolean,
            value: false,
        },
        /** 幽灵按钮（透明背景） */
        ghost: {
            type: Boolean,
            value: false,
        },
        /** 块级按钮 */
        block: {
            type: Boolean,
            value: false,
        },
        /** 加载态 */
        loading: {
            type: Boolean,
            value: false,
        },
        /** 禁用态 */
        disabled: {
            type: Boolean,
            value: false,
        },
        /** 图标名（见 ai-icon），也可用 name="icon" 的 slot 传自定义内容 */
        icon: {
            type: String,
            value: '',
        },
        /** 图标尺寸 */
        iconSize: {
            type: Number,
            value: 18,
        },
        /** 文字内容（也可直接用默认 slot） */
        content: {
            type: String,
            value: '',
        },
        /** 原生 button 的 form-type */
        formType: {
            type: String,
            value: '',
        },
        /** 原生 button 的 open-type */
        openType: {
            type: String,
            value: '',
        },
        /** 原生 button 的 lang */
        lang: {
            type: String,
            value: 'en',
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
        hoverClass: 'ai-btn--active-default',
    },

    observers: {
        'type, danger, ghost, loading, disabled'() {
            this.setData({ hoverClass: resolveHoverClass(this.data) });
        },
    },

    methods: {
        handleTap() {
            if (this.data.disabled || this.data.loading) return;
            this.triggerEvent('click', {});
        },
    },
});

interface ButtonData {
    type: string;
    danger: boolean;
    ghost: boolean;
    loading: boolean;
    disabled: boolean;
}

const KNOWN_TYPES: readonly string[] = ['primary', 'default', 'dashed', 'text', 'link'];

function resolveHoverClass(data: ButtonData): string {
    if (data.disabled || data.loading) return 'none';
    if (data.ghost && data.type === 'primary') return 'ai-btn--active-ghost-primary';
    if (data.danger) {
        if (data.type === 'primary') return 'ai-btn--active-danger-primary';
        if (data.type === 'default' || data.type === 'dashed') return 'ai-btn--active-danger-outline';
        return 'ai-btn--active-danger-text';
    }
    const known = KNOWN_TYPES.includes(data.type) ? data.type : 'default';
    return `ai-btn--active-${known}`;
}

export type { ButtonType, ButtonSize };
