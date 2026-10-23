/**
 * ai-cursor —— 跟随手指的装饰光标（降级版）
 *
 * 与 Web 版 Cursor 的差异（详见 docs/migration-from-react.md）：
 * - **小程序没有 CSS `cursor` 属性**，也替换不了系统指针，所以真光标做不到
 * - 这里降级成「跟随手指的装饰层」：手指按下 / 拖动时，在触点位置画一个动物岛风格指针，
 *   松手后淡出。它纯装饰（`pointer-events: none`），不拦截任何点击
 * - 想在真机上看到效果，把 `follow` 设为 true（默认），然后按住页面拖动
 * - Web 版的 `forceAll` / `type='raindrop'` 语义保留：`type` 切换指针样式
 */

interface CursorSelf {
    __hideTimer?: number;
}

Component({
    externalClasses: ['extClass'],

    properties: {
        /** 指针样式：default 箭头 / raindrop 雨滴 */
        type: {
            type: String,
            value: 'default',
        },
        /** 是否跟随手指 */
        follow: {
            type: Boolean,
            value: true,
        },
        /** 松手后停留多久再消失（ms） */
        hideDelay: {
            type: Number,
            value: 600,
        },
        /** 追加到根节点的行内样式 */
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        visible: false,
        x: 0,
        y: 0,
    },

    lifetimes: {
        detached() {
            const self = this as unknown as CursorSelf;
            if (self.__hideTimer) clearTimeout(self.__hideTimer);
        },
    },

    methods: {
        track(event: WechatMiniprogram.TouchEvent) {
            if (!this.data.follow) return;
            const touch = event.touches && event.touches[0];
            if (!touch) return;

            const self = this as unknown as CursorSelf;
            if (self.__hideTimer) {
                clearTimeout(self.__hideTimer);
                self.__hideTimer = undefined;
            }

            this.setData({ visible: true, x: touch.clientX, y: touch.clientY });
        },

        release() {
            if (!this.data.follow) return;
            const self = this as unknown as CursorSelf;
            if (self.__hideTimer) clearTimeout(self.__hideTimer);
            self.__hideTimer = setTimeout(() => {
                this.setData({ visible: false });
            }, Math.max(0, Number(this.data.hideDelay) || 0)) as unknown as number;
        },

        noop() {
            // 装饰层不拦截事件，这里只是占位
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
