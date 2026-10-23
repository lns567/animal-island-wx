/**
 * ai-table —— 表格
 *
 * 与 Web 版 Table 的差异（详见 docs/migration-from-react.md）：
 * - WXML 没有 <table>，用 flex 行 + 单元格宽度百分比还原表格布局
 * - 列定义只保留可序列化的部分：`title` / `dataIndex` / `align` / `width`（数字按 px，字符串原样）
 * - `column.render` / `onRow` / `rowClassName` 是函数属性，小程序传不进来：
 *   单元格直接取 `record[dataIndex]`，需要自定义渲染时请用 `format`（每个单元格套一个简单格式化）
 * - 分页由外部 `ai-pagination` 配合，组件本身只负责把当前页数据渲染出来
 */

interface TableColumn {
    title: string;
    dataIndex?: string;
    align?: 'left' | 'center' | 'right';
    width?: number | string;
}

interface TableColumnView {
    key: string;
    title: string;
    align: string;
    style: string;
}

interface TableRowView {
    key: string;
    striped: boolean;
    cells: Array<{ key: string; text: string; align: string; style: string }>;
}

const alignOf = (column: TableColumn) => column.align || 'left';

const widthStyleOf = (column: TableColumn) => {
    if (column.width === undefined || column.width === null) return '';
    if (typeof column.width === 'number') return `width:${column.width}px;flex:none;`;
    return `width:${column.width};flex:none;`;
};

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 列定义：[{ title, dataIndex, align, width }] */
        columns: {
            type: Array,
            value: [],
        },
        /** 数据源（注意不能叫 dataSource：WXML 里 data-* 会被当成 dataset） */
        rows: {
            type: Array,
            value: [],
        },
        /** 行 key 字段名 */
        rowKey: {
            type: String,
            value: 'key',
        },
        /** 斑马纹 */
        striped: {
            type: Boolean,
            value: true,
        },
        /** 显示表头 */
        showHeader: {
            type: Boolean,
            value: true,
        },
        /** 加载中遮罩 */
        loading: {
            type: Boolean,
            value: false,
        },
        /** 空状态文案 */
        emptyText: {
            type: String,
            value: '暂无数据',
        },
        /** 追加到根节点的行内样式 */
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        columnsView: [] as TableColumnView[],
        rowsView: [] as TableRowView[],
        isEmpty: true,
    },

    observers: {
        'columns, rows, rowKey, striped'() {
            this.render();
        },
    },

    lifetimes: {
        attached() {
            this.render();
        },
    },

    methods: {
        render() {
            const columns: TableColumn[] = (this.data.columns || []) as TableColumn[];
            const dataSource: Array<Record<string, unknown>> = (this.data.rows || []) as Array<
                Record<string, unknown>
            >;
            const rowKey = this.data.rowKey || 'key';

            const columnsView: TableColumnView[] = columns.map((column, index) => ({
                key: `c-${index}`,
                title: column.title === undefined || column.title === null ? '' : String(column.title),
                align: alignOf(column),
                style: widthStyleOf(column),
            }));

            const rowsView: TableRowView[] = dataSource.map((record, index) => {
                const rawKey = record[rowKey];
                const key = rawKey === undefined || rawKey === null ? String(index) : String(rawKey);
                return {
                    key: `r-${key}-${index}`,
                    striped: Boolean(this.data.striped) && index % 2 === 1,
                    cells: columns.map((column, colIndex) => {
                        const value = column.dataIndex ? record[column.dataIndex] : '';
                        return {
                            key: `cell-${colIndex}`,
                            text: value === undefined || value === null ? '' : String(value),
                            align: alignOf(column),
                            style: widthStyleOf(column),
                        };
                    }),
                };
            });

            this.setData({ columnsView, rowsView, isEmpty: dataSource.length === 0 });
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
