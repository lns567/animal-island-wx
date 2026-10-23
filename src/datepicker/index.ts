/**
 * ai-datepicker —— 日期选择器
 *
 * 与 Web 版 DatePicker 的差异（详见 docs/migration-from-react.md）：
 * - **范围选择（`range`）留到二期**：Web 版是左右双面板 600px，模拟器 390px 宽塞不下，
 *   改成一屏内做双面板会牺牲可用性。这里先做单日选择 + 月份选择
 * - `disabledDate` 是函数，WXML 传不进来，改成 `minDate` / `maxDate` 两个字符串属性
 * - 星期表头 / 网格用 flex 7 列（WXSS 的 grid 在老基础库上不稳），每格宽度 14.2857%
 * - 点击面板外部关闭用全屏透明遮罩（替代 Web 版 document 监听）
 */

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTH_LABELS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

const PANEL_HEIGHT = 340;
const PANEL_WIDTH = 280;

const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

const parseValue = (value: string): Date | null => {
    if (!value) return null;
    const match = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(value);
    if (!match || Number(match[2]) > 12) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3] || 1));
    return Number.isNaN(date.getTime()) ? null : date;
};

const toValue = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const toMonthValue = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

const formatDate = (date: Date, format: string): string =>
    format
        .replace('YYYY', `${date.getFullYear()}`)
        .replace('MM', pad(date.getMonth() + 1))
        .replace('DD', pad(date.getDate()))
        .replace('M', `${date.getMonth() + 1}`)
        .replace('D', `${date.getDate()}`);

const isSameDay = (a: Date, b: Date): boolean =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const dateKey = (date: Date): string => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

interface DayCell {
    key: string;
    day: number;
    inMonth: boolean;
    today: boolean;
    selected: boolean;
    disabled: boolean;
    stamp: string;
}

Component({
    externalClasses: ['extClass'],

    properties: {
        /** 当前值（受控）：YYYY-MM-DD（picker=month 时为 YYYY-MM） */
        value: {
            type: String,
            value: '',
        },
        /** 默认值（非受控） */
        defaultValue: {
            type: String,
            value: '',
        },
        /** 选择粒度：date / month */
        picker: {
            type: String,
            value: 'date',
        },
        /** 占位文案 */
        placeholder: {
            type: String,
            value: '请选择日期',
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
        /** 展示格式，支持 YYYY / MM / DD / M / D */
        format: {
            type: String,
            value: '',
        },
        /** 可选最早日期 YYYY-MM-DD */
        minDate: {
            type: String,
            value: '',
        },
        /** 可选最晚日期 YYYY-MM-DD */
        maxDate: {
            type: String,
            value: '',
        },
        /** 面板底部是否显示「今天」 */
        showToday: {
            type: Boolean,
            value: true,
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
        mode: 'date' as 'date' | 'month',
        viewYear: 2026,
        viewMonth: 0,
        headerLabel: '',
        cells: [] as DayCell[],
        monthCells: [] as Array<{ key: string; label: string; value: number; selected: boolean }>,
        weekdays: WEEKDAYS,
    },

    observers: {
        'value, defaultValue, picker, format, minDate, maxDate'() {
            this.sync();
        },
        viewYear() {
            this.renderPanel();
        },
        viewMonth() {
            this.renderPanel();
        },
    },

    lifetimes: {
        attached() {
            this.sync();
        },
    },

    methods: {
        effectiveFormat(): string {
            if (this.data.format) return this.data.format;
            return this.data.picker === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';
        },

        currentValue(): string {
            return this.data.value || this.data.defaultValue || '';
        },

        sync() {
            const parsed = parseValue(this.currentValue());
            const anchor = parsed || new Date();
            this.setData({
                display: parsed ? formatDate(parsed, this.effectiveFormat()) : '',
                viewYear: anchor.getFullYear(),
                viewMonth: anchor.getMonth(),
            });
            this.renderPanel();
        },

        limitRange(): { min: Date | null; max: Date | null } {
            return { min: parseValue(this.data.minDate), max: parseValue(this.data.maxDate) };
        },

        isDisabledDay(date: Date): boolean {
            const { min, max } = this.limitRange();
            const stamp = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
            if (min && stamp < new Date(min.getFullYear(), min.getMonth(), min.getDate()).getTime()) return true;
            if (max && stamp > new Date(max.getFullYear(), max.getMonth(), max.getDate()).getTime()) return true;
            return false;
        },

        renderPanel() {
            const year = this.data.viewYear;
            const month = this.data.viewMonth;
            const selected = parseValue(this.currentValue());
            const monthMode = this.data.picker === 'month';

            const first = new Date(year, month, 1);
            const offset = first.getDay();
            const start = new Date(year, month, 1 - offset);
            const today = new Date();

            const cells: DayCell[] = [];
            for (let i = 0; i < 42; i += 1) {
                const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
                cells.push({
                    key: dateKey(date),
                    day: date.getDate(),
                    inMonth: date.getMonth() === month,
                    today: isSameDay(date, today),
                    selected: Boolean(selected) && isSameDay(date, selected as Date),
                    disabled: this.isDisabledDay(date),
                    stamp: toValue(date),
                });
            }

            const monthCells = MONTH_LABELS.map((label, index) => ({
                key: `m-${index}`,
                label,
                value: index,
                selected: monthMode
                    ? Boolean(selected) &&
                      (selected as Date).getFullYear() === year &&
                      (selected as Date).getMonth() === index
                    : index === month,
            }));

            this.setData({
                cells,
                monthCells,
                headerLabel: monthMode ? `${year} 年` : `${year} 年 ${MONTH_LABELS[month]}`,
            });
        },

        toggle() {
            if (this.data.disabled) return;
            if (this.data.open) {
                this.close();
                return;
            }
            this.setData({ open: true, placed: false, mode: 'date' });
            this.triggerEvent('open');
            this.place();
        },

        place() {
            this.createSelectorQuery()
                .select('.ai-datepicker__trigger')
                .boundingClientRect()
                .exec((res) => {
                    const rect = res && (res[0] as { top: number; bottom: number; left: number; width: number } | null);
                    if (!rect) {
                        this.setData({ placed: true });
                        return;
                    }
                    const info = getWindowSize();
                    const dropUp = rect.bottom + PANEL_HEIGHT > info.height && rect.top > info.height - rect.bottom;

                    // 面板 280px 宽，触发器又常常贴着左边：直接 left:0 会被屏幕切掉，
                    // 这里把面板夹在视口内，再换算成相对触发器的偏移
                    const margin = 8;
                    let panelLeft = rect.left;
                    if (panelLeft + PANEL_WIDTH > info.width - margin) panelLeft = info.width - margin - PANEL_WIDTH;
                    if (panelLeft < margin) panelLeft = margin;

                    this.setData({ placed: true, dropUp, offsetX: Math.round(panelLeft - rect.left) });
                });
        },

        prevMonth() {
            const year = this.data.viewMonth === 0 ? this.data.viewYear - 1 : this.data.viewYear;
            const month = this.data.viewMonth === 0 ? 11 : this.data.viewMonth - 1;
            this.setData({ viewYear: year, viewMonth: month });
        },

        nextMonth() {
            const year = this.data.viewMonth === 11 ? this.data.viewYear + 1 : this.data.viewYear;
            const month = this.data.viewMonth === 11 ? 0 : this.data.viewMonth + 1;
            this.setData({ viewYear: year, viewMonth: month });
        },

        prevYear() {
            this.setData({ viewYear: this.data.viewYear - 1 });
        },

        nextYear() {
            this.setData({ viewYear: this.data.viewYear + 1 });
        },

        switchMode() {
            this.setData({ mode: this.data.mode === 'date' ? 'month' : 'date' });
        },

        handleDayTap(event: WechatMiniprogram.TouchEvent) {
            const dataset = event.currentTarget.dataset;
            if (dataset.disabled) return;
            const date = parseValue(String(dataset.stamp));
            if (!date) return;

            const next = toValue(date);
            this.setData({
                open: false,
                display: formatDate(date, this.effectiveFormat()),
                viewYear: date.getFullYear(),
                viewMonth: date.getMonth(),
            });
            this.triggerEvent('change', { value: next });
            this.triggerEvent('close');
        },

        handleMonthTap(event: WechatMiniprogram.TouchEvent) {
            const month = Number(event.currentTarget.dataset.value);
            const date = new Date(this.data.viewYear, month, 1);

            if (this.data.picker === 'month') {
                const next = toMonthValue(date);
                this.setData({ open: false, display: formatDate(date, this.effectiveFormat()) });
                this.triggerEvent('change', { value: next });
                this.triggerEvent('close');
                return;
            }

            // 日期模式：先切到该月，再回到日期网格
            this.setData({ viewMonth: month, mode: 'date' });
        },

        handleToday() {
            const today = new Date();
            const next = this.data.picker === 'month' ? toMonthValue(today) : toValue(today);
            this.setData({
                open: false,
                display: formatDate(today, this.effectiveFormat()),
                viewYear: today.getFullYear(),
                viewMonth: today.getMonth(),
            });
            this.triggerEvent('change', { value: next });
            this.triggerEvent('close');
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
