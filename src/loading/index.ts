/**
 * ai-loading —— 全屏落雪加载层
 *
 * 与 Web 版 Loading 的差异（详见 docs/migration-from-react.md）：
 * - 50 片雪花在 attached 时用 JS 随机生成（和 Web 版 useMemo 一次性生成等价），
 *   尺寸 / 水平位置 / 时长 / 负延迟都内联到 style 上
 * - 关闭时先进入 exiting 态淡出，淡出结束再从树里摘掉（Web 版是 setShown(false)）
 * - prefers-reduced-motion 在小程序里不可用，雪花恒定飘落
 */

const FLAKE_COUNT = 50;

interface Flake {
    style: string;
}

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 是否加载中 */
        active: {
            type: Boolean,
            value: true,
        },
        /** 中央提示文字 */
        tip: {
            type: String,
            value: '',
        },
        /** 延迟多少毫秒再出现（避免闪一下） */
        delay: {
            type: Number,
            value: 0,
        },
        /** 淡出时长（秒） */
        fadeDuration: {
            type: Number,
            value: 0.6,
        },
        /** 层级 */
        zIndex: {
            type: Number,
            value: 3000,
        },
        /** 追加到根节点的行内样式 */
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        flakes: [] as Flake[],
        shown: false,
        exiting: false,
        rootStyle: '',
    },

    observers: {
        active(value: boolean) {
            this.sync(value);
        },
        'fadeDuration, zIndex'() {
            this.buildStyle();
        },
    },

    lifetimes: {
        attached() {
            const flakes: Flake[] = [];
            for (let i = 0; i < FLAKE_COUNT; i += 1) {
                const size = Math.random() * 5 + 1;
                const duration = Math.random() * 6 + 6;
                const left = Math.random() * 100;
                const delay = -Math.random() * duration;
                flakes.push({
                    style: `width:${size.toFixed(2)}px;height:${size.toFixed(2)}px;left:${left.toFixed(2)}%;animation-duration:${duration.toFixed(2)}s;animation-delay:${delay.toFixed(2)}s;`,
                });
            }
            this.setData({ flakes });
            this.buildStyle();
            this.sync(this.data.active);
        },

        detached() {
            this.clearTimers();
        },
    },

    methods: {
        buildStyle() {
            this.setData({ rootStyle: `z-index:${this.data.zIndex};` });
        },

        clearTimers() {
            const self = this as unknown as { __showTimer?: number; __hideTimer?: number };
            if (self.__showTimer) clearTimeout(self.__showTimer);
            if (self.__hideTimer) clearTimeout(self.__hideTimer);
        },

        sync(active: boolean) {
            const self = this as unknown as {
                __showTimer?: number;
                __hideTimer?: number;
            };
            this.clearTimers();

            if (active) {
                // 淡出途中重新开启：取消卸载计时，立即回到不透明
                if (self.__hideTimer) {
                    clearTimeout(self.__hideTimer);
                    self.__hideTimer = undefined;
                }
                this.setData({ exiting: false });
                if (!this.data.delay) {
                    this.setData({ shown: true });
                } else {
                    self.__showTimer = setTimeout(() => this.setData({ shown: true }), this.data.delay) as unknown as number;
                }
                return;
            }

            // 只有显示过才进入淡出
            if (!this.data.shown) return;
            this.setData({ exiting: true });
            self.__hideTimer = setTimeout(() => {
                this.setData({ shown: false, exiting: false });
            }, Math.max(0, this.data.fadeDuration) * 1000) as unknown as number;
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
