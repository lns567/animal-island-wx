/**
 * ai-backtop —— 返回顶部
 *
 * 与 Web 版 BackTop 的差异（详见 docs/migration-from-react.md）：
 * - Web 版自己监听 scroll 决定显隐；小程序组件拿不到页面滚动事件，
 *   所以改成受控：页面在 `onPageScroll` 里按 `scrollTop > visibilityHeight` 传 `visible`
 * - 滚动用 `wx.pageScrollTo({ duration })`，原生平滑动画，和 Web 版的 rAF 缓动等价
 */

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 是否显示（由页面 onPageScroll 控制） */
        visible: {
            type: Boolean,
            value: false,
        },
        /** 滚动多少 px 后显示，仅供页面判断时参考 */
        visibilityHeight: {
            type: Number,
            value: 400,
        },
        /** 回顶动画时长（ms） */
        duration: {
            type: Number,
            value: 300,
        },
        /** 追加到根节点的行内样式 */
        extStyle: {
            type: String,
            value: '',
        },
    },

    methods: {
        handleTap() {
            wx.pageScrollTo({
                scrollTop: 0,
                duration: Math.max(0, Number(this.data.duration) || 0),
            });
            this.triggerEvent('click', {});
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
