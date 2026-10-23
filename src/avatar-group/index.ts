/**
 * ai-avatar-group —— 头像组
 *
 * 与 Web 版 Avatar.Group 的差异（重要）：
 * Web 版靠 <Avatar> 子元素 + React.cloneElement 透传 size/shape，小程序读不到 slot 里的子组件属性，
 * 因此这里改为**数据驱动**：用 `items` 数组描述每个头像。
 *
 *   <ai-avatar-group items="{{avatars}}" max-count="{{3}}" size="middle" />
 *   avatars: [{ src: '...' }, { content: '鱼' }, { icon: 'bell' }]
 *
 * 重叠间距直接算在每一项的 margin-left 上，避免依赖 :not(:first-child) 之类的选择器。
 */

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 头像数据：[{ src, content, icon, size, shape, extStyle }] */
        items: {
            type: Array,
            value: [],
        },
        /** 最多展示几个，超出折叠为 +N；0 表示全部展示 */
        maxCount: {
            type: Number,
            value: 0,
        },
        /** 统一尺寸（预设有 small/middle/large，也接受数字） */
        size: {
            type: null,
            value: 'middle',
        },
        /** 统一形状 */
        shape: {
            type: String,
            value: 'circle',
        },
        /** 头像之间的重叠间距 px */
        gap: {
            type: Number,
            value: 8,
        },
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        shown: [] as Array<Record<string, unknown>>,
        restCount: 0,
        moreStyle: '',
        hostStyle: '',
    },

    observers: {
        'items, maxCount, size, shape, gap, extStyle'() {
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
            const { items, maxCount, size, shape, gap } = this.data;
            const list = Array.isArray(items) ? items.slice() : [];
            const limit = maxCount > 0 ? maxCount : list.length;
            const shown = list.slice(0, limit).map((item, index) => {
                const record = (item || {}) as Record<string, unknown>;
                // 必须把缺省字段补成 ''：直接传 null/undefined 给 String 类型属性，
                // 基础库会刷 "[Component] property ... received type-uncompatible value" 警告。
                return {
                    src: asText(record.src),
                    content: asText(record.content),
                    icon: asText(record.icon),
                    label: asText(record.label),
                    extStyle: asText(record.extStyle),
                    size: record.size === undefined || record.size === null ? size : record.size,
                    shape: record.shape === undefined || record.shape === null ? shape : record.shape,
                    offset: index === 0 ? 0 : -Math.abs(gap),
                };
            });
            const restCount = Math.max(0, list.length - shown.length);
            this.setData({
                shown,
                restCount,
                moreStyle: `margin-left:${restCount > 0 ? -Math.abs(gap) : 0}px;`,
                hostStyle: this.data.extStyle || '',
            });
        },

        handleMoreTap() {
            this.triggerEvent('more', { count: this.data.restCount });
        },
    },
});

function asText(value: unknown): string {
    if (value === undefined || value === null) return '';
    return typeof value === 'string' ? value : String(value);
}

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
