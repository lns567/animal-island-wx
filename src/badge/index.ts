/**
 * ai-badge —— 徽标数
 *
 * 与 Web 版 Badge 的差异（详见 docs/migration-from-react.md）：
 * - children → 默认 slot；不传内容时自动切换成「独立使用」形态
 *   （Web 版靠 children === undefined 判断，小程序拿不到 slot 是否有内容，
 *    这里改为量一下 slot 包裹层的尺寸来等价判断）
 * - count（ReactNode）→ 字符串或数字，`type: null` 不做类型校验，两种都收
 * - <sup> → <view>，原生 title → aria-label
 * - prefers-reduced-motion 在小程序里不支持，出场动画恒定播放
 */

const FULLWIDTH = /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/;
const CIRCLE_MAX_LENGTH = 2;

interface BadgeData {
    count: unknown;
    overflowCount: number;
    showZero: boolean;
    dot: boolean;
}

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 展示内容：数字或字符串 */
        count: {
            type: null,
            value: '',
        },
        /** 封顶值，超过显示 `${overflowCount}+` */
        overflowCount: {
            type: Number,
            value: 99,
        },
        /** 数值为 0 时是否展示 */
        showZero: {
            type: Boolean,
            value: false,
        },
        /** 只显示小圆点 */
        dot: {
            type: Boolean,
            value: false,
        },
        /** 尺寸（仅对数字角标生效） */
        size: {
            type: String,
            value: 'medium',
        },
        /** 颜色，与 Card / Tag 调色板一致 */
        color: {
            type: String,
            value: 'app-red',
        },
        /** 强制「独立使用」形态（默认自动探测） */
        standalone: {
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
        display: '',
        hidden: true,
        circle: false,
        /** 量出来没有内容时置为 true：角标落回正常文档流 */
        autoStandalone: false,
    },

    observers: {
        'count, overflowCount, showZero, dot'() {
            this.render();
        },
    },

    lifetimes: {
        ready() {
            this.detectStandalone();
        },
    },

    methods: {
        render() {
            const data = this.data as unknown as BadgeData;
            const numeric = toNumeric(data.count);
            const raw = data.count;
            const display = numeric !== null && numeric > data.overflowCount ? `${data.overflowCount}+` : toText(raw);
            const isZero = display === '0';
            const showAsDot = data.dot && !isZero;
            const isEmpty = raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '');
            const hidden = !showAsDot && (isEmpty || (isZero && !data.showZero));
            this.setData({
                display: showAsDot ? '' : display,
                hidden,
                circle: fitsCircle(display),
            });
        },

        detectStandalone() {
            if (this.data.standalone) return;
            this.createSelectorQuery()
                .select('.ai-badge__content')
                .boundingClientRect()
                .exec((res) => {
                    const rect = res && (res[0] as { width?: number; height?: number } | null);
                    const empty = !rect || !rect.width || !rect.height;
                    if (empty) this.setData({ autoStandalone: true });
                });
        },
    },
});

function toText(value: unknown): string {
    if (value === null || value === undefined) return '';
    return typeof value === 'string' ? value : String(value);
}

/** 纯数字或纯数字字符串才参与封顶换算 */
function toNumeric(value: unknown): number | null {
    if (typeof value === 'number') return Number.isNaN(value) ? null : value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
    return null;
}

/** 1~2 位内容锁成正圆；3 位以上、或两格全角字回退为胶囊 */
function fitsCircle(display: string): boolean {
    const text = display.trim();
    if (!text || text.length > CIRCLE_MAX_LENGTH) return false;
    return !(text.length === CIRCLE_MAX_LENGTH && FULLWIDTH.test(text));
}

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
