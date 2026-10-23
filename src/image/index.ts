/**
 * ai-image —— 相框图片
 *
 * 与 Web 版 Image 的差异（详见 docs/migration-from-react.md）：
 * - 预览直接用 `wx.previewImage`：原生大图查看器，比 Web 版自绘的遮罩 + 关闭按钮体验更好
 * - 没有 `<img>` 的 onLoad 淡入钩子（image 有 bindload，已接上），加载失败用 binderror 切占位
 * - 邮票变体的齿孔用 mask-composite 实现，老 WebView 上会退化成无齿孔的实心边框（形状不受影响）
 */

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 图片地址 */
        src: {
            type: String,
            value: '',
        },
        /** 替代文本（无障碍） */
        alt: {
            type: String,
            value: '',
        },
        /** 宽度（px） */
        width: {
            type: Number,
            value: 0,
        },
        /** 高度（px） */
        height: {
            type: Number,
            value: 0,
        },
        /** 背景色（仅 bordered 生效） */
        color: {
            type: String,
            value: 'white',
        },
        /** 相框类型：default / bordered / stamp */
        variant: {
            type: String,
            value: 'default',
        },
        /** 邮票发行年份（variant=stamp 时印在右上角） */
        stampYear: {
            type: String,
            value: '',
        },
        /** 懒加载 */
        lazy: {
            type: Boolean,
            value: false,
        },
        /** 点击预览大图 */
        preview: {
            type: Boolean,
            value: true,
        },
        /** 图片裁切方式：aspectFill / aspectFit / scaleToFill */
        mode: {
            type: String,
            value: 'aspectFill',
        },
        /** 追加到根节点的行内样式 */
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        failed: false,
        loaded: false,
        frameStyle: '',
    },

    observers: {
        'src'() {
            this.setData({ failed: false, loaded: false });
        },
        'width, height'() {
            this.buildStyle();
        },
    },

    lifetimes: {
        attached() {
            this.buildStyle();
        },
    },

    methods: {
        buildStyle() {
            const { width, height } = this.data;
            const parts: string[] = [];
            if (Number(width) > 0) parts.push(`width:${width}px`);
            if (Number(height) > 0) parts.push(`height:${height}px`);
            this.setData({ frameStyle: parts.join(';') });
        },

        handleLoad() {
            this.setData({ loaded: true });
            this.triggerEvent('load', {});
        },

        handleError() {
            this.setData({ failed: true, loaded: true });
            this.triggerEvent('error', {});
        },

        handleTap() {
            if (!this.data.preview || this.data.failed || !this.data.src) return;
            wx.previewImage({ urls: [this.data.src], current: this.data.src });
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
