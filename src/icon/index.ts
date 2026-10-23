/**
 * ai-icon —— 图标
 *
 * 图标来自 naive-icons（MIT），以 base64 内联在 WXSS 中。
 * 为什么不用 <image src> 或内联 <svg>：WXML 不支持 svg 标签；
 * 用背景图还能让图标跟随 CSS 尺寸、并避免额外的网络请求。
 */
import { ICON_NAMES } from '../common/icons';

const KNOWN_ICONS: readonly string[] = ICON_NAMES;

Component({
    options: {
        addGlobalClass: false,
    },

    properties: {
        /** 图标名，见 src/common/icons.ts 的 ICON_NAMES */
        name: {
            type: String,
            value: '',
        },
        /** 尺寸：number（px）或任意 CSS 长度字符串（如 '1em'、'40rpx'） */
        size: {
            type: null,
            value: 24,
        },
        /** 无障碍标签；传入时图标会被读屏播报 */
        label: {
            type: String,
            value: '',
        },
    },

    data: {
        sizeStyle: 'width:24px;height:24px;',
    },

    observers: {
        size(value: number | string) {
            this.setData({ sizeStyle: toSizeStyle(value) });
        },
        name(value: string) {
            // 图标名写错时给个明确提示，而不是静默渲染成空白
            if (value && KNOWN_ICONS.indexOf(value) === -1) {
                console.warn(`[animal-island-wx] 未知图标 "${value}"，可用图标见 ICON_NAMES`);
            }
        },
    },

    lifetimes: {
        attached() {
            this.setData({ sizeStyle: toSizeStyle(this.data.size) });
        },
    },
});

function toSizeStyle(value: number | string): string {
    const size = typeof value === 'number' ? `${value}px` : value || '24px';
    return `width:${size};height:${size};`;
}

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
