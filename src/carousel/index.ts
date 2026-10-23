/**
 * ai-carousel —— 轮播
 *
 * 与 Web 版 Carousel 的差异（详见 docs/migration-from-react.md）：
 * - Web 版用 `children` 当幻灯片，小程序一个默认 slot 只能给一个节点，
 *   所以改成数据驱动：`items: [{ src, title, desc }]`（最常用的图文卡片形态）
 * - 滑动交给原生 `<swiper>`：手势、惯性、循环都是系统级实现，比手搓 touch 事件稳
 * - 键盘左右键翻页没有（touch 设备没有键盘）
 */

interface CarouselItem {
    src?: string;
    title?: string;
    desc?: string;
}

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 幻灯片数据：[{ src, title, desc }] */
        items: {
            type: Array,
            value: [],
        },
        /** 当前索引（受控） */
        activeIndex: {
            type: Number,
            value: 0,
        },
        /** 非受控初始索引 */
        defaultActiveIndex: {
            type: Number,
            value: 0,
        },
        /** 自动播放 */
        autoplay: {
            type: Boolean,
            value: false,
        },
        /** 自动播放间隔（ms） */
        interval: {
            type: Number,
            value: 3000,
        },
        /** 首尾循环 */
        loop: {
            type: Boolean,
            value: true,
        },
        /** 显示左右箭头 */
        showArrows: {
            type: Boolean,
            value: true,
        },
        /** 显示圆点指示器 */
        showDots: {
            type: Boolean,
            value: true,
        },
        /** 高度（px） */
        height: {
            type: Number,
            value: 220,
        },
        /** 追加到根节点的行内样式 */
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        current: 0,
        paused: false,
        viewportStyle: '',
        dots: [] as Array<{ index: number; active: boolean }>,
    },

    observers: {
        'items, activeIndex, defaultActiveIndex, height'() {
            this.sync();
        },
    },

    lifetimes: {
        attached() {
            this.setData({ current: Math.max(0, Number(this.data.defaultActiveIndex) || 0) });
            this.sync();
        },
    },

    methods: {
        sync() {
            const items = (this.data.items || []) as CarouselItem[];
            const last = Math.max(0, items.length - 1);
            const controlled = Number(this.data.activeIndex) || 0;
            const current = Math.min(Math.max(controlled, 0), last);
            this.setData({
                current,
                viewportStyle: `height:${Number(this.data.height) || 220}px`,
                dots: items.map((_, index) => ({ index, active: index === current })),
            });
        },

        commit(next: number) {
            const items = (this.data.items || []) as CarouselItem[];
            if (items.length === 0) return;
            const last = items.length - 1;
            const index = this.data.loop
                ? ((next % items.length) + items.length) % items.length
                : Math.min(Math.max(next, 0), last);
            if (index === this.data.current) return;
            this.setData({
                current: index,
                dots: items.map((_, i) => ({ index: i, active: i === index })),
            });
            this.triggerEvent('change', { index });
        },

        handleSwiperChange(event: WechatMiniprogram.SwiperChange) {
            const index = Number(event.detail.current) || 0;
            const items = (this.data.items || []) as CarouselItem[];
            this.setData({
                current: index,
                dots: items.map((_, i) => ({ index: i, active: i === index })),
            });
            this.triggerEvent('change', { index });
        },

        handlePrev() {
            this.commit(this.data.loop ? this.data.current - 1 : this.data.current - 1);
        },

        handleNext() {
            this.commit(this.data.current + 1);
        },

        handleDotTap(event: WechatMiniprogram.TouchEvent) {
            this.commit(Number(event.currentTarget.dataset.index));
        },

        handleTogglePlay() {
            const paused = !this.data.paused;
            this.setData({ paused });
            this.triggerEvent('toggleplay', { paused });
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
