/**
 * ai-footer —— 版权栏
 *
 * 与 Web 版 Footer 一致：`© 年份 文案`，默认取当前年份。
 * 小程序里没有 `<footer>` 语义标签，用 view + aria-role。
 */

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 版权文案 */
        text: {
            type: String,
            value: 'All Rights Reserved.',
        },
        /** 年份，不传取当前年份 */
        year: {
            type: Number,
            value: 0,
        },
        /** 追加到根节点的行内样式 */
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        displayYear: new Date().getFullYear(),
    },

    observers: {
        year(value: number) {
            this.setData({ displayYear: Number(value) > 0 ? Number(value) : new Date().getFullYear() });
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
