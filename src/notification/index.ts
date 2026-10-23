/**
 * ai-notification —— 通知提醒
 *
 * 与 Web 版 Notification 的差异（详见 docs/migration-from-react.md）：
 * - Web 版是全局单例 + Portal，`Notification.success(...)` 一行就能弹；
 *   小程序没有 portal，也没有跨页面挂载点，所以改成「先放一个组件占位，再拿实例调方法」：
 *
 *   WXML:  <ai-notification id="notice" />
 *   JS:    this.selectComponent('#notice').success({ message: '已保存' })
 *
 * - `description` 支持纯文本（小程序属性传不了 ReactNode）
 * - `btn` / 自定义 `icon` / `closeIcon` 去掉（都依赖节点注入），关闭按钮固定为 ×
 * - 6 个 position 全部保留，靠 `groups` 分组渲染
 * - 也支持声明式用法：`open` + `type` + `message`（适合只会弹一条的页面）
 */

type NotificationType = 'success' | 'info' | 'warning' | 'error';
type NotificationPosition = 'top' | 'topLeft' | 'topRight' | 'bottom' | 'bottomLeft' | 'bottomRight';

interface NotificationConfig {
    message: string;
    description?: string;
    /** 自动关闭延时（秒），0 表示不自动关 */
    duration?: number;
    position?: NotificationPosition;
    type?: NotificationType;
    /** 唯一 key：同 key 再次 open 会更新而不是新增 */
    key?: string;
}

interface NotificationItem extends NotificationConfig {
    key: string;
    type: NotificationType;
    position: NotificationPosition;
    closing: boolean;
    /** 图标字符，渲染用（WXML 里调不了方法） */
    icon: string;
}

interface Group {
    position: NotificationPosition;
    items: NotificationItem[];
}

const POSITIONS: NotificationPosition[] = ['top', 'topLeft', 'topRight', 'bottom', 'bottomLeft', 'bottomRight'];
const ICONS: Record<NotificationType, string> = {
    success: '✓',
    info: 'i',
    warning: '!',
    error: '×',
};

const EXIT_MS = 200;

interface NotificationSelf {
    __items?: NotificationItem[];
    __timers?: Record<string, number>;
    __seq?: number;
    __declarativeKey?: string;
}

Component({
    externalClasses: ['extClass'],

    properties: {
        /** 声明式打开（与实例方法二选一） */
        open: {
            type: Boolean,
            value: false,
        },
        /** 声明式标题 */
        message: {
            type: String,
            value: '',
        },
        /** 声明式正文 */
        description: {
            type: String,
            value: '',
        },
        /** 声明式类型 */
        type: {
            type: String,
            value: 'info',
        },
        /** 声明式位置 */
        position: {
            type: String,
            value: 'top',
        },
        /** 声明式停留时长（秒） */
        duration: {
            type: Number,
            value: 4.5,
        },
    },

    data: {
        groups: [] as Group[],
    },

    observers: {
        open(value: boolean) {
            if (value) {
                this.openNotice({
                    key: 'declarative',
                    type: (this.data.type || 'info') as NotificationType,
                    position: (this.data.position || 'top') as NotificationPosition,
                    message: this.data.message || '通知',
                    description: this.data.description,
                    duration: this.data.duration,
                });
            } else {
                this.close('declarative');
            }
        },
    },

    lifetimes: {
        detached() {
            this.clearTimers();
        },
    },

    methods: {
        /* ---------- 命令式 API ---------- */
        open(config: NotificationConfig) {
            return this.openNotice(config);
        },

        success(config: NotificationConfig) {
            return this.openNotice({ ...config, type: 'success' });
        },

        info(config: NotificationConfig) {
            return this.openNotice({ ...config, type: 'info' });
        },

        warning(config: NotificationConfig) {
            return this.openNotice({ ...config, type: 'warning' });
        },

        error(config: NotificationConfig) {
            return this.openNotice({ ...config, type: 'error' });
        },

        destroy() {
            this.clearTimers();
            const self = this as unknown as NotificationSelf;
            self.__items = [];
            this.render();
        },

        /* ---------- 内部 ---------- */
        openNotice(config: NotificationConfig) {
            const self = this as unknown as NotificationSelf;
            self.__items = self.__items || [];
            self.__seq = (self.__seq || 0) + 1;

            const type = (config.type || 'info') as NotificationType;
            const item: NotificationItem = {
                key: config.key || `n-${self.__seq}`,
                type,
                position: (config.position || 'top') as NotificationPosition,
                message: config.message || '',
                description: config.description || '',
                duration: config.duration === undefined ? 4.5 : config.duration,
                closing: false,
                icon: ICONS[type] || ICONS.info,
            };

            const existing = self.__items.filter((entry) => entry.key === item.key)[0];
            if (existing) {
                self.__items = self.__items.map((entry) => (entry.key === item.key ? { ...item, closing: false } : entry));
            } else {
                self.__items.push(item);
            }

            this.render();
            this.scheduleClose(item.key, item.duration);
            this.triggerEvent('open', { key: item.key, type: item.type });
            return item.key;
        },

        scheduleClose(key: string, duration: number | undefined) {
            const self = this as unknown as NotificationSelf;
            self.__timers = self.__timers || {};
            this.clearTimer(key);

            const seconds = Number(duration);
            if (!seconds || seconds <= 0) return;

            self.__timers[key] = setTimeout(() => {
                this.close(key);
            }, seconds * 1000) as unknown as number;
        },

        clearTimer(key: string) {
            const self = this as unknown as NotificationSelf;
            self.__timers = self.__timers || {};
            if (self.__timers[key]) {
                clearTimeout(self.__timers[key]);
                delete self.__timers[key];
            }
        },

        clearTimers() {
            const self = this as unknown as NotificationSelf;
            Object.keys(self.__timers || {}).forEach((key) => this.clearTimer(key));
        },

        close(key: string) {
            const self = this as unknown as NotificationSelf;
            const items = self.__items || [];
            const target = items.filter((entry) => entry.key === key)[0];
            if (!target || target.closing) return;

            this.clearTimer(key);
            self.__items = items.map((entry) => (entry.key === key ? { ...entry, closing: true } : entry));
            this.render();

            setTimeout(() => {
                self.__items = (self.__items || []).filter((entry) => entry.key !== key);
                this.render();
                this.triggerEvent('close', { key });
            }, EXIT_MS);
        },

        handleClose(event: WechatMiniprogram.TouchEvent) {
            this.close(String(event.currentTarget.dataset.key || ''));
        },

        handleTap(event: WechatMiniprogram.TouchEvent) {
            const key = String(event.currentTarget.dataset.key || '');
            const self = this as unknown as NotificationSelf;
            const target = (self.__items || []).filter((entry) => entry.key === key)[0];
            this.triggerEvent('click', { key, type: target ? target.type : '' });
        },

        /** 把扁平列表按 position 分组后再渲染 */
        render() {
            const self = this as unknown as NotificationSelf;
            const items = self.__items || [];
            const groups: Group[] = [];

            POSITIONS.forEach((position) => {
                const list = items.filter((item) => item.position === position);
                if (list.length) groups.push({ position, items: list });
            });

            this.setData({ groups });
        },

    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
