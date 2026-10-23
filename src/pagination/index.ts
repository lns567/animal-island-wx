/**
 * ai-pagination —— 分页
 *
 * 与 Web 版 Pagination 的差异（详见 docs/migration-from-react.md）：
 * - `showQuickJumper`（跳页输入框）没做：小程序里键盘弹起会顶起整个页面，体验反而更差，
 *   需要跳页时页面自己放个 ai-input 即可
 * - 每页条数弹层用「透明遮罩层 + 面板」实现点外部关闭（Web 版靠 document mousedown）
 * - 前后翻页的雪佛龙用 CSS 三角边画（图标库没有 chevron-left / right）
 */

const PAGE_ITEM_GAP = 7;

interface PageItem {
    key: string;
    kind: 'page' | 'ellipsis';
    value: number;
}

/** 生成页码序列：首尾页 + 当前页邻域 + 省略号 */
const getPageItems = (current: number, pageCount: number): PageItem[] => {
    const items: PageItem[] = [];
    if (pageCount <= PAGE_ITEM_GAP) {
        for (let i = 1; i <= pageCount; i += 1) items.push({ key: `p-${i}`, kind: 'page', value: i });
        return items;
    }

    items.push({ key: 'p-1', kind: 'page', value: 1 });
    if (current > 3) items.push({ key: 'e-left', kind: 'ellipsis', value: 0 });

    const start = Math.max(2, current - 1);
    const end = Math.min(pageCount - 1, current + 1);
    for (let i = start; i <= end; i += 1) items.push({ key: `p-${i}`, kind: 'page', value: i });

    if (current < pageCount - 2) items.push({ key: 'e-right', kind: 'ellipsis', value: 0 });
    items.push({ key: `p-${pageCount}`, kind: 'page', value: pageCount });
    return items;
};

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 数据总数 */
        total: {
            type: Number,
            value: 0,
        },
        /** 当前页（受控） */
        current: {
            type: null,
            value: null,
        },
        /** 默认当前页 */
        defaultCurrent: {
            type: Number,
            value: 1,
        },
        /** 每页条数（受控） */
        pageSize: {
            type: null,
            value: null,
        },
        /** 默认每页条数 */
        defaultPageSize: {
            type: Number,
            value: 10,
        },
        /** 是否显示每页条数切换器 */
        showSizeChanger: {
            type: Boolean,
            value: false,
        },
        /** 可选的每页条数 */
        pageSizeOptions: {
            type: Array,
            value: [10, 20, 50, 100],
        },
        /** 是否显示总条数 */
        showTotal: {
            type: Boolean,
            value: true,
        },
        /** 禁用 */
        disabled: {
            type: Boolean,
            value: false,
        },
        /** 配色：orange / teal */
        variant: {
            type: String,
            value: 'orange',
        },
        /** 追加到根节点的行内样式 */
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        items: [] as PageItem[],
        innerCurrent: 1,
        innerPageSize: 10,
        pageCount: 0,
        prevDisabled: true,
        nextDisabled: false,
        sizeOpen: false,
    },

    observers: {
        'total, current, pageSize, defaultCurrent, defaultPageSize'() {
            this.sync();
        },
    },

    lifetimes: {
        attached() {
            this.setData({
                innerCurrent: this.data.defaultCurrent || 1,
                innerPageSize: this.data.defaultPageSize || 10,
            });
            this.sync();
        },
    },

    methods: {
        currentPage(): number {
            return typeof this.data.current === 'number' ? this.data.current : this.data.innerCurrent;
        },

        sizeValue(): number {
            return typeof this.data.pageSize === 'number' ? this.data.pageSize : this.data.innerPageSize;
        },

        sync() {
            const size = Math.max(1, this.sizeValue());
            const pageCount = Math.max(1, Math.ceil((Number(this.data.total) || 0) / size));
            const current = Math.min(pageCount, Math.max(1, this.currentPage()));
            this.setData({
                pageCount,
                items: getPageItems(current, pageCount),
                innerCurrent: current,
                innerPageSize: size,
                prevDisabled: Boolean(this.data.disabled) || current <= 1,
                nextDisabled: Boolean(this.data.disabled) || current >= pageCount,
            });
        },

        goTo(page: number) {
            if (this.data.disabled) return;
            const next = Math.min(this.data.pageCount, Math.max(1, page));
            const current = this.currentPage();
            if (next === current) return;

            if (typeof this.data.current === 'number') {
                // 受控：只抛事件，由外部回写 current
                this.setData({ innerCurrent: next });
            } else {
                this.setData({ innerCurrent: next });
            }
            this.sync();
            this.triggerEvent('change', { page: next, pageSize: this.sizeValue() });
        },

        handlePrev() {
            this.goTo(this.currentPage() - 1);
        },

        handleNext() {
            this.goTo(this.currentPage() + 1);
        },

        handlePageTap(event: WechatMiniprogram.TouchEvent) {
            this.goTo(Number(event.currentTarget.dataset.page));
        },

        handleEllipsisTap() {
            // 省略号跳过 5 页，和 antd 的手感一致
            const current = this.currentPage();
            const target = this.data.items.find((item: PageItem) => item.kind === 'ellipsis' && item.key === 'e-right');
            this.goTo(target ? Math.min(this.data.pageCount, current + 5) : Math.max(1, current - 5));
        },

        toggleSize() {
            if (this.data.disabled) return;
            this.setData({ sizeOpen: !this.data.sizeOpen });
        },

        closeSize() {
            if (this.data.sizeOpen) this.setData({ sizeOpen: false });
        },

        handleSizeTap(event: WechatMiniprogram.TouchEvent) {
            if (this.data.disabled) return;
            const size = Number(event.currentTarget.dataset.size);
            this.setData({ sizeOpen: false });
            if (size === this.sizeValue()) return;

            this.setData({ innerPageSize: size });
            this.sync();
            this.triggerEvent('showSizeChange', { current: this.currentPage(), size });
            this.triggerEvent('change', { page: this.currentPage(), pageSize: size });
        },

        /** 弹层内部点击不要冒泡到遮罩 */
        noop() {
            // 故意留空
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
