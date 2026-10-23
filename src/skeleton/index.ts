/**
 * ai-skeleton —— 骨架屏
 *
 * 与 Web 版 Skeleton 的差异（详见 docs/migration-from-react.md）：
 * - children → 默认 slot（loading=false 时渲染；拿不到「有没有内容」，空 slot 就是留白）
 * - Skeleton.Button / Skeleton.Input / Skeleton.Avatar 三个预设合并成
 *   variant + width-value / height-value / radius，例如按钮骨架：
 *   <ai-skeleton variant="rect" width-value="100" height-value="45" radius="50" />
 * - rowWidths 数组照旧支持
 */

const DEFAULT_PARAGRAPH_WIDTHS = ['100%', '92%', '84%', '76%', '68%'];

interface SkeletonData {
    variant: string;
    loading: boolean;
    rows: number;
    width: unknown;
    widthValue: unknown;
    heightValue: unknown;
    rowWidths: unknown;
    radius: string;
    extStyle: string;
}

Component({
    externalClasses: ['extClass'],
    properties: {
        /** false 时渲染 slot 内容 */
        loading: {
            type: Boolean,
            value: true,
        },
        /** 变体：text / circle / rect / paragraph */
        variant: {
            type: String,
            value: 'text',
        },
        /** 是否播放银白流光动画 */
        active: {
            type: Boolean,
            value: true,
        },
        /** 行数（paragraph） */
        rows: {
            type: Number,
            value: 3,
        },
        /** 宽度（text） */
        width: {
            type: null,
            value: '',
        },
        /** 宽度（circle / rect） */
        widthValue: {
            type: null,
            value: '',
        },
        /** 高度 */
        heightValue: {
            type: null,
            value: '',
        },
        /** 每行宽度（paragraph，数组） */
        rowWidths: {
            type: null,
            value: null,
        },
        /** 圆角，传数字按 px 处理，传字符串原样使用 */
        radius: {
            type: String,
            value: '',
        },
        /** 追加到根节点的行内样式 */
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        boxStyle: '',
        lines: [] as Array<{ width: string }>,
        isParagraph: false,
    },

    observers: {
        'variant, rows, width, widthValue, heightValue, rowWidths, radius, extStyle'() {
            this.build();
        },
    },

    lifetimes: {
        attached() {
            this.build();
        },
    },

    methods: {
        build() {
            const data = this.data as unknown as SkeletonData;
            const ext = data.extStyle ? `${data.extStyle};` : '';
            const radius = data.radius ? `border-radius:${unit(data.radius)};` : '';
            if (data.variant === 'paragraph') {
                const widths = Array.isArray(data.rowWidths) && data.rowWidths.length ? data.rowWidths : DEFAULT_PARAGRAPH_WIDTHS;
                const count = Math.max(1, Number(data.rows) || 1);
                const lines: Array<{ width: string }> = [];
                for (let i = 0; i < count; i += 1) {
                    const raw = widths[i] ?? widths[widths.length - 1] ?? '100%';
                    lines.push({ width: unit(raw) });
                }
                this.setData({ isParagraph: true, lines, boxStyle: ext });
                return;
            }
            if (data.variant === 'circle') {
                const size = unit(data.widthValue || data.heightValue || 44);
                this.setData({ isParagraph: false, lines: [], boxStyle: `width:${size};height:${size};${radius}${ext}` });
                return;
            }
            if (data.variant === 'rect') {
                const w = unit(data.widthValue || '100%');
                const h = unit(data.heightValue || 120);
                this.setData({ isParagraph: false, lines: [], boxStyle: `width:${w};height:${h};${radius}${ext}` });
                return;
            }
            const w = unit(data.width || '100%');
            const h = unit(data.heightValue || 16);
            this.setData({ isParagraph: false, lines: [], boxStyle: `width:${w};height:${h};${radius}${ext}` });
        },
    },
});

function unit(value: unknown): string {
    if (typeof value === 'number') return `${value}px`;
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) return '0';
    return /^-?\d+(\.\d+)?$/.test(text) ? `${text}px` : text;
}

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
