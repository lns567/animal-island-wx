/**
 * ai-input —— 输入框
 *
 * 与 Web 版 Input 的差异：
 * - `::placeholder` → `placeholder-class`（小程序不支持伪元素）
 * - React 的受控/非受控：小程序 input 由 JS 驱动，这里用 `value` 属性同步 + 内部 current 兜底；
 *   首次传 value 时以 value 为准，之后父级再次传值会覆盖内部状态。
 * - onChange（每次输入）→ `bind:input`；失焦 → `bind:change`；另有 focus / blur / confirm / clear
 * - prefix / suffix（ReactNode）→ 图标名属性 + `prefix` / `suffix` 命名 slot
 */

Component({
    externalClasses: ['extClass'],
    options: {
        multipleSlots: true,
    },

    properties: {
        /** 尺寸：small / middle / large */
        size: {
            type: String,
            value: 'middle',
        },
        /** 前缀图标名（见 ai-icon） */
        prefix: {
            type: String,
            value: '',
        },
        /** 后缀图标名（见 ai-icon） */
        suffix: {
            type: String,
            value: '',
        },
        /** 允许一键清除 */
        allowClear: {
            type: Boolean,
            value: false,
        },
        /** 状态：'' | error | warning */
        status: {
            type: String,
            value: '',
        },
        /** 是否显示下沉阴影 */
        shadow: {
            type: Boolean,
            value: false,
        },
        disabled: {
            type: Boolean,
            value: false,
        },
        /** 受控值 */
        value: {
            type: String,
            value: '',
        },
        /** 非受控初始值 */
        defaultValue: {
            type: String,
            value: '',
        },
        placeholder: {
            type: String,
            value: '',
        },
        /** 键盘类型：text / number / idcard / digit / safe-password / nickname */
        type: {
            type: String,
            value: 'text',
        },
        /** 密码框 */
        password: {
            type: Boolean,
            value: false,
        },
        /** 最大长度，-1 表示不限制 */
        maxlength: {
            type: Number,
            value: 140,
        },
        focus: {
            type: Boolean,
            value: false,
        },
        /** 键盘右下角按钮文案：done / send / search / next / go */
        confirmType: {
            type: String,
            value: 'done',
        },
        /** 自定义占位符样式（覆盖 placeholder-class 之外的颜色等） */
        placeholderStyle: {
            type: String,
            value: '',
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
        current: '',
        cls: 'ai-input ai-input--middle',
    },

    observers: {
        value(value: string) {
            if (value !== this.data.current) this.setData({ current: value });
        },
        'size, status, disabled, shadow'() {
            this.setData({ cls: resolveClass(this.data) });
        },
    },

    lifetimes: {
        attached() {
            const { value, defaultValue } = this.data;
            this.setData({
                current: value || defaultValue || '',
                cls: resolveClass(this.data),
            });
        },
    },

    methods: {
        handleInput(event: WechatMiniprogram.Input) {
            const value = event.detail.value;
            this.setData({ current: value });
            this.triggerEvent('input', { value });
        },

        handleFocus(event: WechatMiniprogram.Input) {
            this.triggerEvent('focus', { value: event.detail.value });
        },

        handleBlur(event: WechatMiniprogram.Input) {
            this.triggerEvent('blur', { value: event.detail.value });
            this.triggerEvent('change', { value: event.detail.value });
        },

        handleConfirm(event: WechatMiniprogram.Input) {
            this.triggerEvent('confirm', { value: event.detail.value });
        },

        handleClear() {
            this.setData({ current: '' });
            this.triggerEvent('clear', {});
            this.triggerEvent('input', { value: '' });
            this.triggerEvent('change', { value: '' });
        },
    },
});

function resolveClass(data: {
    size: string;
    status: string;
    disabled: boolean;
    shadow: boolean;
}): string {
    const list = ['ai-input'];
    const size = ['small', 'middle', 'large'].includes(data.size) ? data.size : 'middle';
    list.push(`ai-input--${size}`);
    if (data.status === 'error' || data.status === 'warning') list.push(`ai-input--${data.status}`);
    if (data.disabled) list.push('ai-input--disabled');
    if (data.shadow) list.push('ai-input--shadow');
    return list.join(' ');
}

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
