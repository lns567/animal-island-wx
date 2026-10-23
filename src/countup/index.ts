/**
 * ai-countup —— 数字滚动计分
 *
 * 与 Web 版 CountUp 的差异（详见 docs/migration-from-react.md）：
 * - Web 版跑 requestAnimationFrame，小程序没有 rAF，改成 setTimeout 循环 + 时间轴量化；
 *   默认 ~30fps（小程序 setData 比浏览器写 DOM 贵，追 60fps 没有收益），可用 update-interval 调整
 * - 每帧只在「格式化后的文案真的变了」时才 setData，长时长动画不会白跑几十次 setData
 * - `prefix` / `suffix` 从 ReactNode 降级为纯文本；`formatter` 与 render prop 无法跨线程传递，未移植
 * - `onComplete` 在小程序里不能通过返回值安排重播，改成 `repeat` / `repeat-delay` 两个属性声明
 */

type EasingFn = (progress: number) => number;

/** 内置缓动曲线，与 Web 版同名同算式 */
const EASINGS: Record<string, EasingFn> = {
    linear: (progress) => progress,
    easeInCubic: (progress) => progress * progress * progress,
    easeOutCubic: (progress) => 1 - Math.pow(1 - progress, 3),
    easeInOutCubic: (progress) =>
        progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2,
    easeOutExpo: (progress) => (progress >= 1 ? 1 : 1 - Math.pow(2, -10 * progress)),
};

/** 未知缓动名回退到 easeOutCubic，避免传错值时动画不动 */
const resolveEasing = (easing: string): EasingFn => EASINGS[easing] || EASINGS.easeOutCubic;

/** 数值的小数位数（用于推导默认 decimalPlaces） */
const decimalCount = (value: number): number => {
    const text = String(value);
    const dot = text.indexOf('.');
    return dot === -1 ? 0 : text.length - dot - 1;
};

/** 按千分位分组，separator 为空时原样返回 */
const groupThousands = (text: string, separator: string): string =>
    separator === '' ? text : text.replace(/\B(?=(\d{3})+(?!\d))/g, separator);

/** 默认格式化：四舍五入到 decimalPlaces 位，再补千分位与小数点符号 */
const formatNumber = (value: number, decimalPlaces: number, decimalSeparator: string, thousandsSeparator: string) => {
    if (decimalPlaces <= 0) {
        return groupThousands(String(Math.round(value)), thousandsSeparator);
    }
    const [integer, fraction] = Number(value).toFixed(decimalPlaces).split('.');
    return `${groupThousands(integer, thousandsSeparator)}${decimalSeparator}${fraction}`;
};

/** 庆祝动效总时长（ms），需略大于 WXSS 动画时长，到点摘掉类名以便下次重播 */
const CELEBRATE_DURATION = 900;
/** 默认帧间隔：~30fps */
const FRAME_MS = 33;

interface CountUpSelf {
    __timer: ReturnType<typeof setTimeout> | null;
    __repeatTimer: ReturnType<typeof setTimeout> | null;
    __celebrateTimer: ReturnType<typeof setTimeout> | null;
    /** 已累计的动画时长（ms），暂停时保留，恢复后接着走 */
    __elapsed: number;
    /** 上一帧的时间戳，null 表示下一帧只记基准 */
    __last: number | null;
    __completed: boolean;
    /** 已生效的 起始值|目标值|时长 组合，变化即从头重播 */
    __target: string;
    /** 上一次真正渲染出来的文案，用来跳过没变化的帧 */
    __formatted: string;
    /** 本次开播的起始值（reset 可指定） */
    __from: number;
}

Component({
    externalClasses: ['extClass'],

    properties: {
        /** 起始值 */
        start: { type: Number, value: 0 },
        /** 目标值 */
        end: { type: Number, value: 0 },
        /** 动画时长（秒），0 表示直接到位 */
        duration: { type: Number, value: 2 },
        /** 是否正在计数；改为 false 暂停并保留当前值，改回 true 从暂停处继续 */
        isCounting: { type: Boolean, value: false },
        /** 小数位数，-1 表示自动取 start / end 中较大的小数位数 */
        decimalPlaces: { type: Number, value: -1 },
        /** 小数点符号 */
        decimalSeparator: { type: String, value: '.' },
        /** 千分位符号，默认不分隔 */
        thousandsSeparator: { type: String, value: '' },
        /** 缓动曲线：linear / easeInCubic / easeOutCubic / easeInOutCubic / easeOutExpo */
        easing: { type: String, value: 'easeOutCubic' },
        /** 取值间隔（秒），0 表示按 ~30fps 连续取值 */
        updateInterval: { type: Number, value: 0 },
        /** 数字前缀，如 ¥ */
        prefix: { type: String, value: '' },
        /** 数字后缀，如 分 */
        suffix: { type: String, value: '' },
        /** 尺寸：small / middle / large */
        size: { type: String, value: 'middle' },
        /** 风格：default / island */
        variant: { type: String, value: 'default' },
        /** 数字块是否描边 */
        bordered: { type: Boolean, value: false },
        /** 计数结束后是否播庆祝动效（弹跳 + 光环 + 星芒） */
        celebrate: { type: Boolean, value: false },
        /** 庆祝贴纸文案，留空则不弹贴纸 */
        celebrateText: { type: String, value: '' },
        /** 结束后是否自动重播 */
        repeat: { type: Boolean, value: false },
        /** 重播前等待秒数 */
        repeatDelay: { type: Number, value: 0 },
    },

    data: {
        /** 当前展示文案（已格式化） */
        display: '0',
        /** 给读屏用的完整数值，计数过程中为空 */
        readable: '0',
        counting: false,
        celebrating: false,
        cls: 'ai-countup ai-countup--middle ai-countup--default',
    },

    observers: {
        'size, variant, bordered, celebrating'() {
            this.syncClass();
        },
        'start, end, duration, isCounting'() {
            this.syncRun();
        },
    },

    lifetimes: {
        attached() {
            const self = this as unknown as CountUpSelf;
            self.__timer = null;
            self.__repeatTimer = null;
            self.__celebrateTimer = null;
            self.__elapsed = 0;
            self.__last = null;
            self.__completed = false;
            self.__formatted = '';
            self.__from = this.data.start;
            self.__target = '';

            this.syncClass();
            this.syncRun();
        },
        detached() {
            this.clearTimers();
        },
    },

    methods: {
        /* ---------------- 内部 ---------------- */

        clearTimers() {
            const self = this as unknown as CountUpSelf;
            if (self.__timer) {
                clearTimeout(self.__timer);
                self.__timer = null;
            }
            if (self.__repeatTimer) {
                clearTimeout(self.__repeatTimer);
                self.__repeatTimer = null;
            }
            if (self.__celebrateTimer) {
                clearTimeout(self.__celebrateTimer);
                self.__celebrateTimer = null;
            }
        },

        syncClass() {
            const { size, variant, bordered, celebrating } = this.data;
            const cls = [
                'ai-countup',
                `ai-countup--${size}`,
                `ai-countup--${variant}`,
                bordered ? 'ai-countup--bordered' : '',
                celebrating ? 'is-celebrating' : '',
            ]
                .filter(Boolean)
                .join(' ');
            this.setData({ cls });
        },

        /** 小数位数 / 格式化统一入口 */
        format(value: number): string {
            const { decimalPlaces, start, end, decimalSeparator, thousandsSeparator } = this.data;
            const places =
                decimalPlaces >= 0 ? decimalPlaces : Math.max(decimalCount(start), decimalCount(end));
            return formatNumber(value, places, decimalSeparator, thousandsSeparator);
        },

        /** 只在文案真的变化时 setData */
        commit(value: number, force: boolean) {
            const self = this as unknown as CountUpSelf;
            const text = this.format(value);
            if (!force && text === self.__formatted) return;
            self.__formatted = text;
            this.setData({ display: text, readable: this.data.counting ? '' : text });
        },

        /** 起始值 / 目标值 / 时长 / isCounting 变化时的统一入口 */
        syncRun() {
            const self = this as unknown as CountUpSelf;
            const target = `${this.data.start}|${this.data.end}|${this.data.duration}`;
            const restart = target !== self.__target;

            if (restart) {
                self.__target = target;
                self.__elapsed = 0;
                self.__last = null;
                self.__completed = false;
                self.__from = this.data.start;
                if (self.__timer) {
                    clearTimeout(self.__timer);
                    self.__timer = null;
                }
                self.__formatted = '';
                this.setData({ celebrating: false });
                this.commit(this.data.start, true);
            }

            // 暂停：保留 elapsed 与当前展示值
            if (!this.data.isCounting || self.__completed) {
                if (self.__timer) {
                    clearTimeout(self.__timer);
                    self.__timer = null;
                }
                this.setData({ counting: false });
                return;
            }

            if (!self.__timer) {
                this.setData({ counting: true, readable: '' });
                self.__last = null;
                this.schedule();
            }
        },

        schedule() {
            const self = this as unknown as CountUpSelf;
            const interval = Math.max(0, this.data.updateInterval) * 1000;
            const delay = interval > 0 ? interval : FRAME_MS;
            self.__timer = setTimeout(() => {
                self.__timer = null;
                this.step();
            }, delay);
        },

        step() {
            const self = this as unknown as CountUpSelf;
            const now = Date.now();

            // 首帧只记时间基准，保证 elapsed 从 0 开始
            if (self.__last === null) {
                self.__last = now;
                this.schedule();
                return;
            }

            self.__elapsed += now - self.__last;
            self.__last = now;

            const total = Math.max(0, this.data.duration) * 1000;
            const interval = Math.max(0, this.data.updateInterval) * 1000;
            // update-interval > 0 时按间隔量化取值，与 Web 版一致
            const quantized = interval > 0 ? Math.floor(self.__elapsed / interval) * interval : self.__elapsed;
            const done = self.__elapsed >= total;
            const progress = done ? 1 : Math.min(1, Math.max(0, quantized / total));
            const next = done
                ? this.data.end
                : self.__from + (this.data.end - self.__from) * resolveEasing(this.data.easing)(progress);

            this.triggerEvent('update', { value: next });

            if (done) {
                this.finish(self.__elapsed);
                return;
            }

            this.commit(next, false);
            this.schedule();
        },

        finish(elapsedMs: number) {
            const self = this as unknown as CountUpSelf;
            self.__completed = true;
            self.__last = null;
            this.setData({ counting: false });
            this.commit(this.data.end, true);

            if (this.data.celebrate) {
                this.setData({ celebrating: true });
                if (self.__celebrateTimer) clearTimeout(self.__celebrateTimer);
                self.__celebrateTimer = setTimeout(() => {
                    self.__celebrateTimer = null;
                    this.setData({ celebrating: false });
                }, CELEBRATE_DURATION);
            }

            this.triggerEvent('complete', { elapsed: elapsedMs / 1000 });

            if (this.data.repeat) {
                // 定时器回调里的 this 会被 TS 收窄成组件实例以外的类型，先把需要的值取出来
                const fromValue = this.data.start;
                const wait = Math.max(0, this.data.repeatDelay) * 1000;
                if (self.__repeatTimer) clearTimeout(self.__repeatTimer);
                self.__repeatTimer = setTimeout(() => {
                    self.__repeatTimer = null;
                    this.reset(fromValue);
                }, wait);
            }
        },

        /* ---------------- 对外 ---------------- */

        /** 回到起始值重新播放，可指定新的起始值 */
        reset(newStartAt?: number) {
            const self = this as unknown as CountUpSelf;
            this.clearTimers();
            self.__target = '';
            self.__completed = false;
            self.__elapsed = 0;
            self.__last = null;
            self.__from = typeof newStartAt === 'number' ? newStartAt : this.data.start;
            self.__formatted = '';
            this.setData({ celebrating: false });
            this.commit(self.__from, true);

            if (!this.data.isCounting) {
                this.setData({ counting: false });
                return;
            }
            this.setData({ counting: true });
            this.schedule();
        },

        /** 立刻跳到当前展示值（不做动画） */
        freeze() {
            const self = this as unknown as CountUpSelf;
            if (self.__timer) {
                clearTimeout(self.__timer);
                self.__timer = null;
            }
            this.setData({ counting: false });
            this.commit(this.data.end, true);
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
