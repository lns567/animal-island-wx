/**
 * ai-switch —— 开关
 *
 * 与 Web 版 Switch 的差异：
 * - 原生 <button> 换成了 <view>（小程序里 button 的默认样式/伪元素在 flex 布局中会带来额外麻烦）
 * - onChange(checked) → `bind:change`，detail: { checked }
 * - checkedChildren / unCheckedChildren 只能用文本（WXML 属性传字符串）
 */

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 受控值；不传则为非受控（由 defaultChecked 决定初始值） */
        checked: {
            type: null,
            value: null,
        },
        /** 非受控初始值 */
        defaultChecked: {
            type: Boolean,
            value: false,
        },
        /** 尺寸：default / small */
        size: {
            type: String,
            value: 'default',
        },
        disabled: {
            type: Boolean,
            value: false,
        },
        loading: {
            type: Boolean,
            value: false,
        },
        /** 选中时文案 */
        checkedChildren: {
            type: String,
            value: '',
        },
        /** 未选中时文案 */
        unCheckedChildren: {
            type: String,
            value: '',
        },
        /** 无障碍标签 */
        ariaLabel: {
            type: String,
            value: '',
        },
    },

    data: {
        isChecked: false,
    },

    observers: {
        checked(value: boolean | null) {
            if (value === null || value === undefined) return;
            if (value !== this.data.isChecked) this.setData({ isChecked: value });
        },
    },

    lifetimes: {
        attached() {
            const { checked, defaultChecked } = this.data;
            this.setData({ isChecked: checked === null || checked === undefined ? defaultChecked : checked });
        },
    },

    methods: {
        handleTap() {
            if (this.data.disabled || this.data.loading) return;
            const next = !this.data.isChecked;
            const controlled = this.data.checked !== null && this.data.checked !== undefined;
            if (!controlled) this.setData({ isChecked: next });
            this.triggerEvent('change', { checked: next });
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
