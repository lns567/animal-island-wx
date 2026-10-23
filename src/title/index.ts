/**
 * ai-title —— 标题（飘带 / 双层纸 / 折角便签）
 *
 * 与 Web 版 Title 的差异：
 * - children → `content` 属性或默认 slot
 * - fontSize 由 size 映射后注入行内样式（与 Web 版一致，em 单位跟随缩放）
 * - 配色仍由 4 个 CSS 变量 --rf/--rb/--rk/--rt 驱动
 */

const SIZE_MAP: Record<string, number> = {
    small: 14,
    middle: 20,
    large: 28,
};

const COLORS = [
    'app-pink',
    'purple',
    'app-blue',
    'app-yellow',
    'app-orange',
    'app-teal',
    'app-green',
    'app-red',
    'lime-green',
    'yellow-green',
    'brown',
    'warm-peach-pink',
];

Component({
    externalClasses: ['extClass'],
    options: {
        multipleSlots: true,
    },

    properties: {
        /** 标题文字（也可用默认 slot） */
        content: {
            type: String,
            value: '',
        },
        /** 尺寸：small / middle / large */
        size: {
            type: String,
            value: 'middle',
        },
        /** 配色，与 Card / Tag 同名色板 */
        color: {
            type: String,
            value: 'default',
        },
        /** 样式：ribbon 飘带 / layer 双层纸 / tab 折角便签 */
        variant: {
            type: String,
            value: 'ribbon',
        },
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        fontSize: 20,
        colorClass: '',
        shape: 'ribbon',
    },

    observers: {
        'size, color, variant'() {
            const { size, color, variant } = this.data;
            this.setData({
                fontSize: SIZE_MAP[size] || SIZE_MAP.middle,
                colorClass: COLORS.includes(color) ? `ai-title__c-${color}` : '',
                shape: ['ribbon', 'layer', 'tab'].includes(variant) ? variant : 'ribbon',
            });
        },
    },

    lifetimes: {
        attached() {
            const { size, color, variant } = this.data;
            this.setData({
                fontSize: SIZE_MAP[size] || SIZE_MAP.middle,
                colorClass: COLORS.includes(color) ? `ai-title__c-${color}` : '',
                shape: ['ribbon', 'layer', 'tab'].includes(variant) ? variant : 'ribbon',
            });
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
