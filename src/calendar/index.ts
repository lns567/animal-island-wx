/**
 * ai-calendar —— 月历 + 事项
 *
 * 与 Web 版 Calendar 的差异（详见 docs/migration-from-react.md）：
 * - Web 版依赖 dayjs 做日期运算，本库坚持零运行时依赖，改用原生 Date（统一取 12:00 避开时区/夏令时边界）
 * - 面板宽度靠 ResizeObserver 监听，小程序没有，改成 attached/ready 时用 createSelectorQuery 量一次；
 *   显式传 width 时直接用它，不再测量
 * - 事项布局引擎（按周切片 + 每格 2 行 + 溢出折叠 +N）与 Web 版同一套算法，逐行对齐
 * - **拖拽创建事项（draggableEvents / onEventCreate）未移植**：Web 版走鼠标 mousedown/mouseenter，
 *   小程序里 touchmove 会和页面滚动抢手势，做出来体验反而更差
 * - **键盘无障碍未移植**：没有 Tab 焦点模型，roving tabindex / 方向键翻日期在小程序里无对应机制
 * - `title` 从 ReactNode 降级为纯文本；`event.start` 支持 'YYYY-MM-DD' 或 'YYYY-MM-DD HH:mm'
 */

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** 日期网格固定补满 6 周 × 7 天 */
const GRID_CELLS = 42;
const COLS = 7;
const CELL_ROWS = GRID_CELLS / COLS;

/** 布局基准（面板宽 750px 时的度量），与 calendar 的 WXSS 常量一一对应 */
const LAYOUT_BASE = {
    width: 750,
    header: 32,
    cellHeight: 104,
    numberBand: 42,
    eventRow: 22,
    barHeight: 17,
};

const MIN_SCALE = 0.6;
const MAX_SCALE = 2;
/** 事项字号与条高的可读下限（手机宽度下纯比例缩放会小到看不清） */
const MIN_EVENT_FONT = 9;
const MIN_BAR_HEIGHT = 13;
/** 每个格子最多平铺 2 条事项，多出的折叠成 +N */
const MAX_EVENT_ROWS = 2;

const pad = (value: number) => String(value).padStart(2, '0');

/** 统一取当天 12:00，避免夏令时把日期算错一天 */
const toDate = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0, 0);

const keyOf = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const addDays = (date: Date, days: number) => {
    const next = new Date(date.getTime());
    next.setDate(next.getDate() + days);
    return next;
};

/** 相差天数（都按当天 12:00 算，不受时区偏移影响） */
const diffDays = (from: Date, to: Date) =>
    Math.round((to.getTime() - from.getTime()) / 86400000);

const daysInMonth = (year: number, month: number) => new Date(year, month, 0, 12).getDate();

interface ParsedDate {
    /** YYYY-MM-DD */
    key: string;
    date: Date;
    /** 'HH:mm'，没有时间部分时为空串 */
    time: string;
}

/** 解析 'YYYY-MM-DD' / 'YYYY-MM-DD HH:mm' / 'YYYY-MM'，非法返回 null */
const parseDate = (value?: string | null): ParsedDate | null => {
    if (!value || typeof value !== 'string') return null;
    const matched = value.trim().match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?(?:[ T](\d{1,2}):(\d{2}))?/);
    if (!matched) return null;
    const year = Number(matched[1]);
    const month = Number(matched[2]);
    const day = Number(matched[3] || 1);
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
    const date = toDate(year, month, day);
    const time = matched[4] ? `${pad(Number(matched[4]))}:${matched[5]}` : '';
    return { key: keyOf(date), date, time };
};

/** 视图起点：本月 1 日所在周的周日 */
const gridStartOf = (year: number, month: number) => {
    const first = toDate(year, month, 1);
    return addDays(first, -first.getDay());
};

/** 日期在 42 格网格中的下标，早于视图或超出视图时夹取到边界 */
const cellIndexOf = (date: Date, gridStart: Date) =>
    Math.min(GRID_CELLS - 1, Math.max(0, diffDays(gridStart, date)));

/** 事项是否与 42 格视图（含上下月补位）相交 */
const isVisibleInGrid = (start: Date, end: Date, gridStart: Date) => {
    const last = end.getTime() < start.getTime() ? start : end;
    const viewEnd = addDays(gridStart, GRID_CELLS);
    return !(last.getTime() < gridStart.getTime()) && start.getTime() < viewEnd.getTime();
};

interface CalendarEventInput {
    /** 事项内容（纯文本） */
    title?: string;
    /** 开始日期：YYYY-MM-DD 或 YYYY-MM-DD HH:mm */
    start?: string;
    /** 结束日期，省略时等同于 start；跨天会渲染成连续事项条 */
    end?: string;
    /** 配色：teal / amber / coral / green / purple */
    color?: string;
    /** 是否在这条事项上展示起始时间 */
    showTime?: boolean;
}

interface CellData {
    key: string;
    day: number;
    outside: boolean;
    selected: boolean;
    today: boolean;
    /** 溢出提示 +N，0 表示不显示 */
    extra: number;
    label: string;
}

interface SegmentData {
    key: string;
    /** 内联样式：top / left / width 全部算成最终值 */
    style: string;
    /** 配色，对应 WXSS 的 --teal 等修饰类 */
    color: string;
    /** 跨列时为 true，接缝处收窄边距 */
    span: boolean;
    /** 片段贴着网格左右边缘时贴齐 */
    startEdge: boolean;
    endEdge: boolean;
    time: string;
    title: string;
}

interface CalendarSelf {
    /** 已测量到的面板内宽 */
    __measured: number;
    /** 上一次的选中值，用于判断「选中值变了才让面板跟过去」 */
    __lastValue: string;
}

Component({
    externalClasses: ['extClass'],

    properties: {
        /** 受控选中日期 YYYY-MM-DD */
        value: { type: String, value: '' },
        /** 非受控初始选中日期，不传时默认今天 */
        defaultValue: { type: String, value: '' },
        /** 受控面板月份 YYYY-MM 或 YYYY-MM-DD */
        panelValue: { type: String, value: '' },
        /** 非受控初始面板月份 */
        defaultPanelValue: { type: String, value: '' },
        /** 事项列表；改动时请整体传新数组，就地改对象不会触发更新 */
        events: { type: Array, value: [] },
        /** 是否在事项条上展示起始时间 */
        showEventTime: { type: Boolean, value: true },
        /** 面板宽度（px），不传则按容器宽度自动缩放 */
        width: { type: Number, value: 0 },
        /** 无障碍标签 */
        ariaLabel: { type: String, value: '日历' },
    },

    data: {
        weekdays: WEEKDAYS,
        /** 面板当前展示的年 / 月（月为 0 基） */
        viewYear: 2026,
        viewMonth: 0,
        monthLabel: '',
        cells: [] as CellData[],
        segments: [] as SegmentData[],
        /** 表格高度（px），事项叠加层与表格共用 */
        gridStyle: '',
        /** 由面板宽度推导出的度量，直接内联到节点上（动态尺寸走 var() 在小程序里不稳） */
        metrics: {
            header: 32,
            cellHeight: 104,
            numberSize: 28,
            numberFont: 13,
            rowHeight: 22,
            barHeight: 17,
            eventFont: 11,
        },
    },

    observers: {
        value(next: string) {
            const self = this as unknown as CalendarSelf;
            if (!next) return;
            const parsed = parseDate(next);
            if (!parsed) return;
            // 选中值真的变了才让面板跟过去，否则箭头翻月会被拽回来
            if (self.__lastValue && self.__lastValue !== next && !this.data.panelValue) {
                if (parsed.date.getFullYear() !== this.data.viewYear || parsed.date.getMonth() !== this.data.viewMonth) {
                    this.setData({ viewYear: parsed.date.getFullYear(), viewMonth: parsed.date.getMonth() });
                    this.rebuild();
                    return;
                }
            }
            self.__lastValue = next;
            this.rebuild();
        },
        panelValue(next: string) {
            if (!next) return;
            const parsed = parseDate(next);
            if (!parsed) return;
            this.setData({ viewYear: parsed.date.getFullYear(), viewMonth: parsed.date.getMonth() });
            this.rebuild();
        },
        'events, showEventTime'() {
            this.rebuild();
        },
        width(next: number) {
            if (next > 0) this.rebuild();
        },
    },

    lifetimes: {
        attached() {
            const self = this as unknown as CalendarSelf;
            self.__measured = 0;
            self.__lastValue = '';

            this.initState();
        },
        ready() {
            // ready 之后布局才有真实宽度，量一次就能定下缩放系数
            if (!this.data.width) this.measure();
        },
        detached() {
            // 无定时器/监听，留空即可
        },
    },

    methods: {
        /* ---------------- 初始化与测量 ---------------- */

        initState() {
            const self = this as unknown as CalendarSelf;
            const initial = (parseDate(this.data.value) ||
                parseDate(this.data.defaultValue) ||
                parseDate(keyOf(new Date()))) as ParsedDate;
            const panel = (parseDate(this.data.panelValue) ||
                parseDate(this.data.defaultPanelValue) ||
                initial) as ParsedDate;
            self.__lastValue = this.data.value || (initial ? initial.key : '');
            this.setData({
                viewYear: panel.date.getFullYear(),
                viewMonth: panel.date.getMonth(),
            });
            this.rebuild();
        },

        measure() {
            this.createSelectorQuery()
                .select('.ai-calendar__body')
                .boundingClientRect()
                .exec((res) => {
                    const rect = res && (res[0] as { width: number } | null);
                    const self = this as unknown as CalendarSelf;
                    if (!rect || !rect.width) {
                        // 量不到就按基准宽度算，保证有个合理的样子，不至于整块塌陷
                        self.__measured = LAYOUT_BASE.width;
                    } else {
                        self.__measured = rect.width;
                    }
                    this.rebuild();
                });
        },

        /** 当前缩放系数：显式 width 优先，其次实测宽度，最后退回基准 */
        scaleOf(): number {
            const self = this as unknown as CalendarSelf;
            const width = this.data.width > 0 ? this.data.width : self.__measured || LAYOUT_BASE.width;
            return Math.min(MAX_SCALE, Math.max(MIN_SCALE, width / LAYOUT_BASE.width));
        },

        /* ---------------- 重新计算网格与事项 ---------------- */

        rebuild() {
            const scale = this.scaleOf();
            const { viewYear, viewMonth } = this.data;
            // viewMonth 是 0 基，gridStartOf / toDate 用的是 1 基月份，这里必须 +1
            const gridStart = gridStartOf(viewYear, viewMonth + 1);
            const todayKey = keyOf(new Date());
            const selected = (parseDate(this.data.value || this.data.defaultValue) || parseDate(todayKey)) as ParsedDate;
            const selectedKey = this.clampKey(selected.key, gridStart);

            const layouts = this.layoutEvents(gridStart, todayKey);
            const cells: CellData[] = [];

            for (let i = 0; i < GRID_CELLS; i += 1) {
                const date = addDays(gridStart, i);
                const key = keyOf(date);
                const count = layouts.counts[i];
                const extra = count - layouts.drawn[i];
                cells.push({
                    key,
                    day: date.getDate(),
                    outside: date.getMonth() !== viewMonth,
                    selected: key === selectedKey,
                    today: key === todayKey,
                    extra: extra > 0 ? extra : 0,
                    label: this.cellLabel(key, layouts.byCell[i] || []),
                });
            }
            /*
             * 度量下限：面板缩到 390px 宽时缩放系数只有 0.6，纯按比例算出来的事项字号
             * 只有 6.6px，手机上根本看不清。所以字号/条高设可读下限，行高与格高随之兜底，
             * 保证「日期数字带 + 2 行事项」始终塞得进格子，不会压到下一周。
             */
            const eventFont = Math.max(MIN_EVENT_FONT, 11 * scale);
            const barHeight = Math.max(MIN_BAR_HEIGHT, LAYOUT_BASE.barHeight * scale);
            const eventRow = Math.max(LAYOUT_BASE.eventRow * scale, barHeight + 3);
            const numberBand = LAYOUT_BASE.numberBand * scale;
            const cellHeight = Math.max(
                LAYOUT_BASE.cellHeight * scale,
                numberBand + MAX_EVENT_ROWS * eventRow + 4
            );

            const metrics = {
                header: LAYOUT_BASE.header * scale,
                cellHeight,
                numberBand,
                eventRow,
                barHeight,
            };

            const segments = layouts.segments.map((segment, order) => {
                const col = segment.index % COLS;
                const rowIndex = Math.floor(segment.index / COLS);
                const top =
                    metrics.header +
                    rowIndex * metrics.cellHeight +
                    metrics.numberBand +
                    (segment.row + 0.5) * metrics.eventRow -
                    metrics.barHeight / 2;
                const left = `calc(${((col * 100) / COLS).toFixed(4)}% + 5px)`;
                const width = `calc(${((segment.span * 100) / COLS).toFixed(4)}% - 10px)`;
                /*
                 * 单列宽的事项条在手机上一格只有 ~48px，塞了 "09:30" 就只剩省略号了，
                 * 所以只有跨 2 列以上才展示时间（Web 版列宽 100px+，不存在这个取舍）。
                 */
                const showTime =
                    this.data.showEventTime &&
                    segment.event.showTime !== false &&
                    !segment.continuation &&
                    segment.span > 1;
                return {
                    key: `${segment.index}-${segment.row}-${order}`,
                    style: `top:${top.toFixed(1)}px;left:${left};width:${width};height:${metrics.barHeight.toFixed(
                        1
                    )}px;line-height:${metrics.barHeight.toFixed(1)}px;font-size:${eventFont.toFixed(1)}px;`,
                    color: segment.event.color || 'teal',
                    span: segment.span > 1,
                    startEdge: col === 0,
                    endEdge: segment.endIndex % COLS === COLS - 1,
                    time: showTime ? segment.time : '',
                    title: segment.event.title || '',
                } as SegmentData;
            });

            this.setData({
                cells,
                segments,
                monthLabel: `${viewYear} 年 ${viewMonth + 1} 月`,
                metrics: {
                    header: metrics.header,
                    cellHeight: metrics.cellHeight,
                    numberSize: 28 * scale,
                    numberFont: 13,
                    rowHeight: metrics.eventRow,
                    barHeight: metrics.barHeight,
                    eventFont,
                },
                gridStyle: `height:${(
                    metrics.header +
                    CELL_ROWS * metrics.cellHeight +
                    MAX_EVENT_ROWS * metrics.eventRow +
                    6
                ).toFixed(1)}px;`,
            });
        },

        /** 把网格外的日期夹到网格内，避免「有选中却没有任何格高亮」 */
        clampKey(key: string, gridStart: Date): string {
            const parsed = parseDate(key);
            if (!parsed) return '';
            const index = cellIndexOf(parsed.date, gridStart);
            return keyOf(addDays(gridStart, index));
        },

        /** 单元格的无障碍文案：日期 + 事项数与标题 */
        cellLabel(key: string, events: CalendarEventInput[]): string {
            if (!events.length) return key;
            const titles: string[] = [];
            for (const event of events) {
                const title = event.title || '';
                if (title && titles.indexOf(title) < 0) titles.push(title);
            }
            if (!titles.length) return `${key} ${events.length} 项事项`;
            const collapsed = titles.length < events.length ? ' 等' : '';
            return `${key} ${events.length} 项事项：${titles.join('，')}${collapsed}`;
        },

        /**
         * 事项布局：跨天事项按自然日逐格铺开，再按周切成不超过 7 列的片段；
         * 同一天多条依次占用事项行，2 行放不下的折叠成 +N。算法与 Web 版逐行一致。
         */
        layoutEvents(gridStart: Date, todayKey: string) {
            const input = (this.data.events || []) as CalendarEventInput[];
            const fallback = parseDate(todayKey) as ParsedDate;
            type Item = { event: CalendarEventInput; start: Date; end: Date; time: string };

            const items: Item[] = input.map((event) => {
                const start = parseDate(event.start) || fallback;
                const declaredEnd = parseDate(event.end);
                const end =
                    !declaredEnd || declaredEnd.date.getTime() < start.date.getTime()
                        ? start.date
                        : declaredEnd.date;
                return { event, start: start.date, end, time: start.time };
            });
            items.sort((a, b) => a.start.getTime() - b.start.getTime());

            const counts = new Array<number>(GRID_CELLS).fill(0);
            const drawn = new Array<number>(GRID_CELLS).fill(0);
            const byCell: CalendarEventInput[][] = Array.from({ length: GRID_CELLS }, () => []);
            const rows = Array.from({ length: GRID_CELLS }, () => new Array<boolean>(MAX_EVENT_ROWS).fill(false));

            type Segment = {
                event: CalendarEventInput;
                index: number;
                endIndex: number;
                continuation: boolean;
                span: number;
                row: number;
                time: string;
            };
            const segments: Segment[] = [];

            for (const item of items) {
                if (!isVisibleInGrid(item.start, item.end, gridStart)) continue;

                const from = cellIndexOf(item.start, gridStart);
                const to = cellIndexOf(item.end, gridStart);

                for (let i = from; i <= to; i += 1) {
                    counts[i] += 1;
                    byCell[i].push(item.event);
                }

                for (let row = 0; row < CELL_ROWS; row += 1) {
                    const rowStart = row * COLS;
                    const rowEnd = rowStart + COLS - 1;
                    if (to < rowStart || from > rowEnd) continue;

                    // 按周切断：片段左右两端都不能越过所在行的边界
                    const segFrom = Math.max(from, rowStart);
                    const segTo = Math.min(to, rowEnd);

                    // 从第一行开始找一段连续空闲的格子，放不下则整个片段折叠进 +N
                    let placed = -1;
                    for (let r = 0; r < MAX_EVENT_ROWS; r += 1) {
                        let free = true;
                        for (let i = segFrom; i <= segTo; i += 1) {
                            if (rows[i][r]) {
                                free = false;
                                break;
                            }
                        }
                        if (free) {
                            placed = r;
                            break;
                        }
                    }
                    if (placed < 0) continue;

                    for (let i = segFrom; i <= segTo; i += 1) {
                        rows[i][placed] = true;
                        drawn[i] += 1;
                    }

                    const segStartDate = addDays(gridStart, segFrom);
                    segments.push({
                        event: item.event,
                        index: segFrom,
                        endIndex: segTo,
                        // 首片就是事项本身的起始格时才算首段，跨周续接段不重复展示时间
                        continuation: keyOf(segStartDate) !== keyOf(item.start),
                        span: segTo - segFrom + 1,
                        row: placed,
                        time: item.time,
                    });
                }
            }

            return { segments, counts, drawn, byCell };
        },

        /* ---------------- 交互 ---------------- */

        handleCellTap(event: WechatMiniprogram.TouchEvent) {
            const key = String(event.currentTarget.dataset.key || '');
            if (!key) return;
            this.selectDate(key);
        },

        selectDate(key: string) {
            const parsed = parseDate(key);
            if (!parsed) return;
            const self = this as unknown as CalendarSelf;
            self.__lastValue = key;

            const next: Record<string, unknown> = {};
            // 非受控时自己维护选中值；受控时只通知父级回写
            if (!this.data.value) next.defaultValue = key;
            this.setData(next);
            this.triggerEvent('change', { date: key });

            // 点到上下月补位格时面板跟随翻月
            const year = parsed.date.getFullYear();
            const month = parsed.date.getMonth();
            if (year !== this.data.viewYear || month !== this.data.viewMonth) {
                if (!this.data.panelValue) this.setData({ viewYear: year, viewMonth: month });
                this.triggerEvent('panelChange', { month: `${year}-${pad(month + 1)}` });
            }
            this.rebuild();
        },

        shiftMonth(delta: number) {
            const date = toDate(this.data.viewYear, this.data.viewMonth + 1, 1);
            const target = new Date(date.getFullYear(), date.getMonth() + delta, 1, 12);
            this.commitPanel(target.getFullYear(), target.getMonth());
        },

        shiftYear(delta: number) {
            this.commitPanel(this.data.viewYear + delta, this.data.viewMonth);
        },

        commitPanel(year: number, month: number) {
            if (!this.data.panelValue) this.setData({ viewYear: year, viewMonth: month });
            this.triggerEvent('panelChange', { month: `${year}-${pad(month + 1)}` });
            this.rebuild();
        },

        prevMonth() {
            this.shiftMonth(-1);
        },

        nextMonth() {
            this.shiftMonth(1);
        },

        prevYear() {
            this.shiftYear(-1);
        },

        nextYear() {
            this.shiftYear(1);
        },

        goToday() {
            const today = keyOf(new Date());
            this.setData({
                viewYear: new Date().getFullYear(),
                viewMonth: new Date().getMonth(),
            });
            this.selectDate(today);
        },

        /** 供页面直接调用：翻到指定月份 */
        goToMonth(month: string) {
            const parsed = parseDate(month);
            if (!parsed) return;
            this.commitPanel(parsed.date.getFullYear(), parsed.date.getMonth());
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
