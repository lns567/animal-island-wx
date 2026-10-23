/**
 * ai-time —— 实时时钟卡片
 *
 * 与 Web 版 Time 一致：上方 HH:MM（冒号按秒闪烁），下方主色胶囊显示星期 · 月日。
 * 小程序里没有 `<div role="timer">` 这类语义差异，用 view + aria-role。
 */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (value: number) => String(value).padStart(2, '0');

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 追加到根节点的行内样式 */
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        hours: '00',
        minutes: '00',
        weekday: '',
        monthDay: '',
    },

    lifetimes: {
        attached() {
            this.tick();
            const self = this as unknown as { __timer?: number };
            self.__timer = setInterval(() => this.tick(), 1000) as unknown as number;
        },
        detached() {
            const self = this as unknown as { __timer?: number };
            if (self.__timer) clearInterval(self.__timer);
        },
    },

    methods: {
        tick() {
            const now = new Date();
            this.setData({
                hours: pad(now.getHours()),
                minutes: pad(now.getMinutes()),
                weekday: WEEKDAYS[now.getDay()],
                monthDay: `${MONTHS[now.getMonth()]} ${now.getDate()}`,
            });
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
