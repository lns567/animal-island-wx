/**
 * ai-select —— 下拉选择
 *
 * 与 Web 版 Select 的差异（详见 docs/migration-from-react.md）：
 * - 点外部关闭：Web 版监听 `document.mousedown`，这里用全屏透明遮罩（`fixed` 覆盖层）
 * - 面板默认贴在触发器右侧（与 Web 版一致），用 `createSelectorQuery` 量一次位置，
 *   右侧放不下就翻到左侧；上下空间不够就改成顶部/底部对齐，避免出屏
 * - 键盘导航（↑↓/Enter/Esc）在小程序里没有等价物，全部去掉；触屏点击即可
 * - Web 版没有多选与搜索，这里也不加（保持行为一致）
 * - `onChange` → `bindchange` 事件，受控 / 非受控同时支持（`value` / `defaultValue`）
 */

interface SelectOption {
    key: string;
    label: string;
}

interface SelectSelf {
    __side?: string;
}

const PANEL_WIDTH = 140;
const OPTION_HEIGHT = 40;
const PANEL_PADDING = 24;

Component({
    externalClasses: ['extClass'],

    properties: {
        /** 选项列表：[{ key, label }] */
        options: {
            type: Array,
            value: [] as SelectOption[],
        },
        /** 当前值（受控） */
        value: {
            type: String,
            value: '',
        },
        /** 默认值（非受控） */
        defaultValue: {
            type: String,
            value: '',
        },
        /** 占位文案 */
        placeholder: {
            type: String,
            value: '请选择',
        },
        /** 禁用 */
        disabled: {
            type: Boolean,
            value: false,
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
        open: false,
        innerValue: '',
        currentLabel: '',
        placed: false,
        dropSide: 'right',
        dropAlign: 'center',
    },

    observers: {
        'options, value, defaultValue'() {
            this.sync();
        },
    },

    lifetimes: {
        attached() {
            this.sync();
        },
    },

    methods: {
        currentValue(): string {
            return this.data.value || this.data.innerValue || '';
        },

        sync() {
            const options = (this.data.options || []) as SelectOption[];
            const current = this.currentValue();
            const hit = options.filter((item) => item.key === current)[0];

            this.setData({
                innerValue: hit ? hit.key : this.data.innerValue,
                currentLabel: hit ? hit.label : '',
            });
        },

        toggle() {
            if (this.data.disabled) return;
            if (this.data.open) {
                this.close();
                return;
            }
            this.setData({ open: true, placed: false });
            this.triggerEvent('open');
            this.place();
        },

        /** 量一次触发器位置，决定面板往哪边弹 */
        place() {
            const self = this as unknown as SelectSelf;
            const options = (this.data.options || []) as SelectOption[];
            const panelHeight = options.length * OPTION_HEIGHT + PANEL_PADDING;

            this.createSelectorQuery()
                .select('.ai-select__trigger')
                .boundingClientRect()
                .exec((res) => {
                    const rect = res && (res[0] as { top: number; bottom: number; right: number } | null);
                    if (!rect) {
                        this.setData({ placed: true });
                        return;
                    }

                    const info = getWindowSize();
                    const side = rect.right + 6 + PANEL_WIDTH > info.width ? 'left' : 'right';
                    const spaceBelow = info.height - rect.bottom;
                    const spaceAbove = rect.top;

                    let align = 'center';
                    if (spaceBelow < panelHeight && spaceAbove > spaceBelow) align = 'bottom';
                    else if (rect.top < panelHeight / 2) align = 'top';

                    self.__side = side;
                    this.setData({ placed: true, dropSide: side, dropAlign: align });
                });
        },

        handleSelect(event: WechatMiniprogram.TouchEvent) {
            const key = String(event.currentTarget.dataset.key || '');
            const options = (this.data.options || []) as SelectOption[];
            const hit = options.filter((item) => item.key === key)[0];
            this.setData({ open: false });
            if (!hit || hit.key === this.currentValue()) {
                this.triggerEvent('close');
                return;
            }

            if (!this.data.value) this.setData({ innerValue: hit.key, currentLabel: hit.label });
            this.triggerEvent('change', { key: hit.key, label: hit.label, value: hit.key });
            this.triggerEvent('close');
        },

        close() {
            if (!this.data.open) return;
            this.setData({ open: false });
            this.triggerEvent('close');
        },

        /** 面板内部点击不冒泡到遮罩 */
        noop() {
            // 故意留空
        },
    },
});

function getWindowSize(): { width: number; height: number } {
    try {
        const info = wx.getWindowInfo();
        return { width: info.windowWidth, height: info.windowHeight };
    } catch (error) {
        const info = wx.getSystemInfoSync();
        return { width: info.windowWidth, height: info.windowHeight };
    }
}

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
