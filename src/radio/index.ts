/**
 * ai-radio —— 单选框组
 *
 * 与 Web 版 Radio 的差异（详见 docs/migration-from-react.md）：
 * - 视觉和 Checkbox 完全一致（圆形框 + 勾 + splash 爆开），Web 版就是复用的同一套样式
 * - 勾选标记同样从 `<svg>` 换成 data URI 背景图，没有描边画出来的动画
 * - 键盘导航（roving tabindex / 方向键）在小程序里没有对应场景，未实现
 * - `value` 的默认值是 null = 非受控；想受控又要求「初始不选中」请传 `value="{{''}}"`
 */

interface RadioOption {
    label: string;
    value: string | number;
    disabled?: boolean;
}

interface ItemView extends RadioOption {
    checked: boolean;
    isDisabled: boolean;
}

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 选项列表：[{ label, value, disabled }] */
        options: {
            type: Array,
            value: [] as RadioOption[],
        },
        /** 受控值；不传（null）= 非受控 */
        value: {
            type: null,
            value: null,
        },
        /** 非受控默认选中值 */
        defaultValue: {
            type: null,
            value: null,
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
        innerValue: null as string | number | null,
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
        currentValue(): string | number | null {
            const { value, innerValue } = this.data as unknown as {
                value: string | number | null;
                innerValue: string | number | null;
            };
            return value === null || value === undefined ? innerValue : value;
        },

        build() {
            const { options, disabled, innerValue, value, defaultValue } = this.data as unknown as {
                options: RadioOption[];
                disabled: boolean;
                innerValue: string | number | null;
                value: string | number | null;
                defaultValue: string | number | null;
            };
            const current = value === null || value === undefined ? innerValue : value;
            const items: ItemView[] = (Array.isArray(options) ? options : []).map((option) => ({
                label: asText(option && option.label),
                value: (option && option.value) as string | number,
                disabled: Boolean(option && option.disabled),
                checked: (option && option.value) === current,
                isDisabled: disabled || Boolean(option && option.disabled),
            }));
            const patch: Record<string, unknown> = { items };
            // 首次挂载时把 defaultValue 灌进内部状态
            if (innerValue === null && defaultValue !== null && defaultValue !== undefined) {
                patch.innerValue = defaultValue;
            }
            this.setData(patch);
        },

        handleTap(event: WechatMiniprogram.TouchEvent) {
            const index = Number(event.currentTarget.dataset.index);
            const item = this.data.items[index];
            if (!item || this.data.disabled || item.isDisabled) return;
            if (this.currentValue() === item.value) return;

            const patch: Record<string, unknown> = {
                items: this.data.items.map((row) => ({ ...row, checked: row.value === item.value })),
            };
            if (this.data.value === null || this.data.value === undefined) patch.innerValue = item.value;
            this.setData(patch);
            this.triggerEvent('change', { value: item.value });
        },
    },
});

function asText(value: unknown): string {
    if (value === null || value === undefined) return '';
    return typeof value === 'string' ? value : String(value);
}

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
