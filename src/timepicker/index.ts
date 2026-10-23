/**
 * ai-timepicker —— 时间选择器
 *
 * 与 Web 版 TimePicker 的差异（详见 docs/migration-from-react.md）：
 * - 三列滚动用 `<scroll-view scroll-y>`；选中项靠 `scroll-top` 预置到偏上位置，
 *   **不做**滚动吸附（scroll-view 没有 scroll-snap，手动补吸附会跟惯性打架）
 * - 面板定位：默认向下展开，下方空间不足且上方更宽裕时翻到上方；右侧放不下就右对齐
 * - 点外部关闭：全屏透明遮罩（替代 Web 版的 document 监听）
 * - 键盘操作（Esc/Enter）在小程序里没有等价物，去掉
 * - 未使用原生 `<picker mode="time">`：原生选择器是系统弹层，和组件库视觉完全不搭，
 *   而且没法做「此刻」按钮与自定义步进
 */

type TimePart = { h: number; m: number; s: number };

interface UnitItem {
    key: string;
    value: number;
    label: string;
}

const ITEM_HEIGHT = 36;
const PANEL_HEIGHT = 320;
const PANEL_WIDTH = 260;

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

const parseTime = (value: string): TimePart | null => {
    if (!value) return null;
    const match = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.exec(value);
    if (!match) return null;
    const part = { h: Number(match[1]), m: Number(match[2]), s: Number(match[3] || 0) };
    return part.h > 23 || part.m > 59 || part.s > 59 ? null : part;
};

const toValue = (part: TimePart): string => `${pad2(part.h)}:${pad2(part.m)}:${pad2(part.s)}`;

const formatTime = (part: TimePart, format: string): string =>
    format.replace('HH', pad2(part.h)).replace('mm', pad2(part.m)).replace('ss', pad2(part.s));

const buildUnits = (total: number, step: number, unit: string): UnitItem[] => {
    const safe = Math.max(1, Math.floor(step) || 1);
    const list: UnitItem[] = [];
    for (let i = 0; i < total; i += 1) {
        if (i % safe !== 0) continue;
        list.push({ key: `${unit}-${i}`, value: i, label: pad2(i) });
    }
    return list;
};

Component({
    externalClasses: ['extClass'],

    properties: {
        /** 当前值（受控），HH:mm:ss */
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
            value: '请选择时间',
        },
        /** 禁用 */
        disabled: {
            type: Boolean,
            value: false,
        },
        /** 允许一键清空 */
        allowClear: {
            type: Boolean,
            value: false,
        },
        /** 尺寸：small / middle / large */
        size: {
            type: String,
            value: 'middle',
        },
        /** 校验状态：error / warning */
        status: {
            type: String,
            value: '',
        },
        /** 展示格式，含 ss 才显示秒列 */
        format: {
            type: String,
            value: 'HH:mm:ss',
        },
        /** 小时步进 */
        hourStep: {
            type: Number,
            value: 1,
        },
        /** 分钟步进 */
        minuteStep: {
            type: Number,
            value: 1,
        },
        /** 秒步进 */
        secondStep: {
            type: Number,
            value: 1,
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
        placed: false,
        dropUp: false,
        offsetX: 0,
        display: '',
        hours: [] as UnitItem[],
        minutes: [] as UnitItem[],
        seconds: [] as UnitItem[],
        showSeconds: true,
        pending: { h: 0, m: 0, s: 0 } as TimePart,
        scrollH: 0,
        scrollM: 0,
        scrollS: 0,
    },

    observers: {
        'value, defaultValue, format, hourStep, minuteStep, secondStep'() {
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
            return this.data.value || this.data.defaultValue || '';
        },

        sync() {
            const format = this.data.format || 'HH:mm:ss';
            const showSeconds = format.indexOf('ss') >= 0;
            const parsed = parseTime(this.currentValue());

            this.setData({
                showSeconds,
                display: parsed ? formatTime(parsed, format) : '',
                hours: buildUnits(24, this.data.hourStep, 'h'),
                minutes: buildUnits(60, this.data.minuteStep, 'm'),
                seconds: showSeconds ? buildUnits(60, this.data.secondStep, 's') : [],
            });
        },

        toggle() {
            if (this.data.disabled) return;
            if (this.data.open) {
                this.close();
                return;
            }

            const format = this.data.format || 'HH:mm:ss';
            const pending = parseTime(this.currentValue()) || nowPart();
            this.setData({
                open: true,
                placed: false,
                pending,
                display: formatTime(pending, format),
                scrollH: scrollFor(pending.h, this.data.hourStep),
                scrollM: scrollFor(pending.m, this.data.minuteStep),
                scrollS: scrollFor(pending.s, this.data.secondStep),
            });
            this.triggerEvent('open');
            this.place();
        },

        place() {
            this.createSelectorQuery()
                .select('.ai-timepicker__trigger')
                .boundingClientRect()
                .exec((res) => {
                    const rect = res && (res[0] as { top: number; bottom: number; left: number } | null);
                    if (!rect) {
                        this.setData({ placed: true });
                        return;
                    }
                    const info = getWindowSize();
                    const dropUp = rect.bottom + PANEL_HEIGHT > info.height && rect.top > info.height - rect.bottom;

                    // 面板 248px 宽，触发器靠左时直接 left:0 也能放下；
                    // 但触发器靠右时会出屏，所以统一夹在视口内再换算成偏移
                    const margin = 8;
                    let panelLeft = rect.left;
                    if (panelLeft + PANEL_WIDTH > info.width - margin) panelLeft = info.width - margin - PANEL_WIDTH;
                    if (panelLeft < margin) panelLeft = margin;

                    this.setData({ placed: true, dropUp, offsetX: Math.round(panelLeft - rect.left) });
                });
        },

        pickHour(event: WechatMiniprogram.TouchEvent) {
            this.pick('h', Number(event.currentTarget.dataset.value));
        },

        pickMinute(event: WechatMiniprogram.TouchEvent) {
            this.pick('m', Number(event.currentTarget.dataset.value));
        },

        pickSecond(event: WechatMiniprogram.TouchEvent) {
            this.pick('s', Number(event.currentTarget.dataset.value));
        },

        pick(unit: 'h' | 'm' | 's', value: number) {
            const pending = { ...(this.data.pending as TimePart) };
            pending[unit] = value;
            const format = this.data.format || 'HH:mm:ss';
            this.setData({ pending, display: formatTime(pending, format) });
        },

        setNow() {
            const pending = nowPart();
            const format = this.data.format || 'HH:mm:ss';
            this.setData({
                pending,
                display: formatTime(pending, format),
                scrollH: scrollFor(pending.h, this.data.hourStep),
                scrollM: scrollFor(pending.m, this.data.minuteStep),
                scrollS: scrollFor(pending.s, this.data.secondStep),
            });
        },

        confirm() {
            const next = toValue(this.data.pending as TimePart);
            this.setData({ open: false });
            this.triggerEvent('close');
            if (next !== this.currentValue()) {
                this.triggerEvent('change', { value: next });
            }
        },

        handleClear() {
            this.triggerEvent('change', { value: '' });
            this.triggerEvent('clear');
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

function nowPart(): TimePart {
    const now = new Date();
    return { h: now.getHours(), m: now.getMinutes(), s: now.getSeconds() };
}

/** 让选中项落在列的中上部，而不是贴着顶边 */
function scrollFor(value: number, step: number): number {
    const index = Math.floor(value / Math.max(1, Math.floor(step) || 1));
    return Math.max(0, index * ITEM_HEIGHT - ITEM_HEIGHT * 2);
}

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
