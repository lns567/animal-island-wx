/**
 * ai-checkbox —— 复选框组
 *
 * 与 Web 版 Checkbox 的差异（详见 docs/migration-from-react.md）：
 * - 圆形勾选框里的 `<svg>` 改成 data URI 背景图（WXSS 的 url() 只认 data:/https:），
 *   因此 Web 版那条 stroke-dashoffset「描边画出来」的动效没有保留，改成勾选时的弹一下
 * - 复选框周围的 splash 小圆点爆开动画完整保留（纯 box-shadow + keyframes）
 * - onChange 回调 → `bind:change`，detail: { value: [...] }
 */

interface CheckboxOption {
    label: string;
    value: string | number;
    disabled?: boolean;
}

interface ItemView extends CheckboxOption {
    checked: boolean;
    isDisabled: boolean;
}

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 选项列表：[{ label, value, disabled }] */
        options: {
            type: Array,
            value: [] as CheckboxOption[],
        },
        /** 受控值数组 */
        value: {
            type: null,
            value: null,
        },
        /** 非受控默认值 */
        defaultValue: {
            type: Array,
            value: [] as Array<string | number>,
        },
        /** 尺寸 */
        size: {
            type: String,
            value: 'middle',
        },
        /** 禁用整组 */
        disabled: {
            type: Boolean,
            value: false,
        },
        /** 排列方向 */
        direction: {
            type: String,
            value: 'horizontal',
        },
        /** 追加到根节点的行内样式 */
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        items: [] as ItemView[],
        innerValue: [] as Array<string | number>,
    },

    observers: {
        'options, value, defaultValue, disabled'() {
            this.build();
        },
    },

    lifetimes: {
        attached() {
            this.build();
        },
    },

    methods: {
        /** 当前值：显式传了 value 就是受控，否则用内部状态 */
        currentValues(): Array<string | number> {
            const { value, innerValue } = this.data as unknown as {
                value: Array<string | number> | null;
                innerValue: Array<string | number>;
            };
            return Array.isArray(value) ? value : innerValue;
        },

        build() {
            const { options, disabled, innerValue, value } = this.data as unknown as {
                options: CheckboxOption[];
                disabled: boolean;
                innerValue: Array<string | number>;
                value: Array<string | number> | null;
            };
            const current = Array.isArray(value) ? value : innerValue;
            const items: ItemView[] = (Array.isArray(options) ? options : []).map((option) => ({
                label: asText(option && option.label),
                value: (option && option.value) as string | number,
                disabled: Boolean(option && option.disabled),
                checked: current.indexOf((option && option.value) as string | number) >= 0,
                isDisabled: disabled || Boolean(option && option.disabled),
            }));
            this.setData({ items });
        },

        handleTap(event: WechatMiniprogram.TouchEvent) {
            const index = Number(event.currentTarget.dataset.index);
            const item = this.data.items[index];
            if (!item || this.data.disabled || item.isDisabled) return;

            const current = this.currentValues().slice();
            const at = current.indexOf(item.value);
            if (at >= 0) current.splice(at, 1);
            else current.push(item.value);

            const patch: Record<string, unknown> = {};
            // 非受控时自己维护一份状态，受控时只上报
            if (!Array.isArray(this.data.value)) patch.innerValue = current;
            patch.items = this.data.items.map((row) => ({
                ...row,
                checked: current.indexOf(row.value) >= 0,
            }));
            this.setData(patch);
            this.triggerEvent('change', { value: current });
        },
    },
});

function asText(value: unknown): string {
    if (value === null || value === undefined) return '';
    return typeof value === 'string' ? value : String(value);
}

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
