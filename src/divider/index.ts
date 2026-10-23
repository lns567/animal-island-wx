/**
 * ai-divider —— 装饰分隔线
 *
 * 与 Web 版 Divider 的差异：
 * - icon（ReactNode）→ `icon` 图标名（见 ai-icon）；WXML 的 slot 无法在 wx:for 里重复，
 *   所以图标模式只接受图标名。
 * - Web 版用 ResizeObserver 量宽算循环次数；小程序改为按屏幕宽度预估 + 容器 overflow: hidden 裁切，
 *   多渲染的几段会被裁掉，视觉效果一致。
 */

const DEFAULT_ICON_SIZE = 24;
const DEFAULT_ICON_GAP = 8;

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 类型：dashed-brown / thin / hairline / wave-yellow / squiggle（icon 存在时忽略） */
        type: {
            type: String,
            value: 'dashed-brown',
        },
        /** 图标名；传入后渲染「图标 + 连接线」循环铺满的装饰线 */
        icon: {
            type: String,
            value: '',
        },
        /** 图标尺寸 px */
        iconSize: {
            type: Number,
            value: DEFAULT_ICON_SIZE,
        },
        /** 图标间距（连接线长度）px */
        iconGap: {
            type: Number,
            value: DEFAULT_ICON_GAP,
        },
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        cycleList: [] as Array<{ key: number; hasGap: boolean }>,
    },

    observers: {
        'icon, iconSize, iconGap'() {
            this.buildCycles();
        },
    },

    lifetimes: {
        attached() {
            this.buildCycles();
        },
    },

    pageLifetimes: {
        resize() {
            this.buildCycles();
        },
    },

    methods: {
        buildCycles() {
            const icon = this.data.icon;
            if (!icon) {
                if (this.data.cycleList.length) this.setData({ cycleList: [] });
                return;
            }
            const cycleWidth = Math.max(1, this.data.iconSize + this.data.iconGap);
            const windowWidth = getWindowWidth();
            // +2 段余量，靠容器的 overflow: hidden 裁掉多出来的部分
            const count = Math.max(1, Math.ceil(windowWidth / cycleWidth) + 2);
            const cycleList: Array<{ key: number; hasGap: boolean }> = [];
            for (let i = 0; i < count; i += 1) cycleList.push({ key: i, hasGap: i < count - 1 });
            this.setData({ cycleList });
        },
    },
});

function getWindowWidth(): number {
    try {
        if (typeof wx.getWindowInfo === 'function') {
            return wx.getWindowInfo().windowWidth || 375;
        }
        return wx.getSystemInfoSync().windowWidth || 375;
    } catch (error) {
        return 375;
    }
}

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
