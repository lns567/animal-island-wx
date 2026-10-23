/**
 * ai-tabs —— 标签页
 *
 * 与 Web 版 Tabs 的差异（详见 docs/migration-from-react.md）：
 * - Web 版 items[i].children 是 ReactNode，切换时组件自己渲染；小程序只有一个默认 slot，
 *   没法按 key 挑内容，所以面板内容交给页面：监听 change 拿到 key，自己用 wx:if 切换
 * - items 只需要 [{ key, label }]；面板里想放什么就放什么
 * - 键盘左右键切换（Web 版的无障碍导航）未实现
 */

interface TabItem {
    key: string;
    label: string;
}

interface TabView extends TabItem {
    active: boolean;
}

Component({
    externalClasses: ['extClass'],
    properties: {
        /** [{ key, label }] */
        items: {
            type: Array,
            value: [] as TabItem[],
        },
        /** 受控的激活 key；不传 = 非受控 */
        activeKey: {
            type: null,
            value: null,
        },
        /** 非受控默认激活 key（不传用第一个） */
        defaultActiveKey: {
            type: null,
            value: null,
        },
        /** 激活项是否带下方投影 */
        shadow: {
            type: Boolean,
            value: true,
        },
        /** 无障碍标签 */
        ariaLabel: {
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
        tabs: [] as TabView[],
        innerKey: '' as string,
        currentKey: '' as string,
    },

    observers: {
        'items, activeKey, defaultActiveKey'() {
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
            const { items, activeKey, defaultActiveKey, innerKey } = this.data as unknown as {
                items: TabItem[];
                activeKey: string | number | null;
                defaultActiveKey: string | number | null;
                innerKey: string;
            };
            const list = Array.isArray(items) ? items : [];
            const fallback = list.length ? String(list[0].key) : '';
            const nextInner = innerKey || (defaultActiveKey === null || defaultActiveKey === undefined ? fallback : String(defaultActiveKey));
            const current = activeKey === null || activeKey === undefined ? nextInner : String(activeKey);
            const tabs: TabView[] = list.map((item) => ({
                key: String(item.key),
                label: typeof item.label === 'string' ? item.label : String(item.label === undefined || item.label === null ? '' : item.label),
                active: String(item.key) === current,
            }));
            this.setData({ tabs, innerKey: nextInner, currentKey: current });
        },

        handleTabTap(event: WechatMiniprogram.TouchEvent) {
            const key = String(event.currentTarget.dataset.key === undefined ? '' : event.currentTarget.dataset.key);
            if (!key || key === this.data.currentKey) return;
            const patch: Record<string, unknown> = {
                currentKey: key,
                tabs: this.data.tabs.map((tab) => ({ ...tab, active: tab.key === key })),
            };
            if (this.data.activeKey === null || this.data.activeKey === undefined) patch.innerKey = key;
            this.setData(patch);
            this.triggerEvent('change', { key });
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
