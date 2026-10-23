/**
 * ai-avatar —— 头像
 *
 * 与 Web 版 Avatar 的差异：
 * - children 图标 → `icon` 图标名；文字 → `content`
 * - `size` 支持预设 small/middle/large 或数字像素
 * - 文字超宽自动缩字号：Web 版用 offsetWidth，小程序改成 createSelectorQuery 量宽
 * - onError → `bind:error`（始终回退到占位内容）
 */

const PRESET_SIZE: Record<string, number> = { small: 32, middle: 40, large: 48 };
const PRESET_FONT: Record<string, number> = { small: 14, middle: 16, large: 20 };

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 形状：circle / square */
        shape: {
            type: String,
            value: 'circle',
        },
        /** 预设尺寸 small/middle/large，或数字 px */
        size: {
            type: null,
            value: 'middle',
        },
        /** 图片地址；为空或加载失败时回退到 icon / 文字 */
        src: {
            type: String,
            value: '',
        },
        /** 占位图标名，默认 user */
        icon: {
            type: String,
            value: '',
        },
        /** 文字内容 */
        content: {
            type: String,
            value: '',
        },
        /** 文字与边界间距 px，文字过宽时按比例缩小字号 */
        gap: {
            type: Number,
            value: 4,
        },
        /** 无障碍标签（同时作为图片 alt） */
        label: {
            type: String,
            value: '',
        },
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        cls: 'ai-avatar ai-avatar--placeholder',
        sizeStyle: 'width:40px;height:40px;line-height:40px;font-size:16px;',
        textStyle: '',
        iconName: 'user',
        iconPx: 20,
        hasImage: false,
        showIcon: true,
        imgFailed: false,
    },

    observers: {
        'src, shape, size, icon, content, gap'() {
            this.update();
        },
    },

    lifetimes: {
        attached() {
            this.update();
        },
        ready() {
            this.measureText();
        },
    },

    methods: {
        update() {
            const { shape, size, src, icon, content } = this.data;
            const px = resolvePx(size);
            const fontPx = resolveFontPx(size, px);
            const hasImage = !!src && !this.data.imgFailed;
            const showIcon = !hasImage && !content;

            const cls = ['ai-avatar'];
            if (shape === 'square') cls.push('ai-avatar--square');
            if (!hasImage) cls.push('ai-avatar--placeholder');

            this.setData(
                {
                    cls: cls.join(' '),
                    sizeStyle: `width:${px}px;height:${px}px;line-height:${px}px;font-size:${fontPx}px;`,
                    textStyle: `font-size:${fontPx}px;`,
                    iconName: icon || 'user',
                    iconPx: Math.round(px * 0.5),
                    hasImage,
                    showIcon,
                },
                () => this.measureText()
            );
        },

        measureText() {
            if (this.data.hasImage || this.data.showIcon) return;
            const px = resolvePx(this.data.size);
            const fontPx = resolveFontPx(this.data.size, px);
            const available = px - this.data.gap * 2;
            if (available <= 0) return;

            this.createSelectorQuery()
                .select('.ai-avatar__string')
                .boundingClientRect((rect) => {
                    if (!rect || !rect.width) return;
                    const width = rect.width as number;
                    if (width > available) {
                        const scale = available / width;
                        this.setData({ textStyle: `font-size:${(fontPx * scale).toFixed(2)}px;` });
                    }
                })
                .exec();
        },

        handleImgError() {
            this.setData({ imgFailed: true, hasImage: false });
            this.triggerEvent('error', {});
            this.update();
        },
    },
});

function resolvePx(size: number | string): number {
    if (typeof size === 'number' && size > 0) return size;
    return PRESET_SIZE[size] || PRESET_SIZE.middle;
}

function resolveFontPx(size: number | string, px: number): number {
    if (typeof size === 'number' && size > 0) return Math.max(12, Math.round(px * 0.4));
    return PRESET_FONT[size] || PRESET_FONT.middle;
}

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
