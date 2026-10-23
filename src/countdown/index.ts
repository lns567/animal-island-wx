/**
 * ai-countdown —— 倒计时
 *
 * 与 Web 版 Countdown 的差异（详见 docs/migration-from-react.md）：
 * - 数字位是 20 面数字条（0-9 两轮）纵向滚动，和 Web 版同一套「永远向下滚」的里程表逻辑；
 *   小程序里没有强制回流（void el.offsetHeight），回绕时改成「先 setData 关掉过渡瞬移、
 *   再 setData 打开过渡」两步走
 * - `prefix` 从 ReactNode 降级为纯文本
 * - `onChange` 在小程序里每秒触发一次（Web 版是 250ms 一跳），`bind:change` 拿剩余毫秒
 */

const DEFAULT_FORMAT = 'HH:mm:ss';

/** 数字条：0-9 两轮共 20 面 */
const FACES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const pad = (value: number) => String(value).padStart(2, '0');

interface CountdownItem {
    /** cell = 一位数字，sep = 字面量分隔符 */
    kind: 'cell' | 'sep';
    text: string;
    pos: number;
    anim: boolean;
    colon: boolean;
}

/** 把格式模板拆成 token / 字面量序列 */
const splitFormat = (format: string): Array<{ kind: 'token' | 'literal'; value: string }> => {
    const parts: Array<{ kind: 'token' | 'literal'; value: string }> = [];
    const re = /DD|HH|mm|ss/g;
    let last = 0;
    let match = re.exec(format);
    while (match !== null) {
        if (match.index > last) parts.push({ kind: 'literal', value: format.slice(last, match.index) });
        parts.push({ kind: 'token', value: match[0] });
        last = match.index + match[0].length;
        match = re.exec(format);
    }
    if (last < format.length) parts.push({ kind: 'literal', value: format.slice(last) });
    return parts;
};

const splitRemaining = (remaining: number, format: string) => {
    const totalSeconds = Math.ceil(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hasDays = format.indexOf('DD') >= 0;
    const hours = hasDays ? Math.floor((totalSeconds % 86400) / 3600) : Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
        DD: pad(days),
        HH: pad(hours),
        mm: pad(minutes),
        ss: pad(seconds),
    } as Record<string, string>;
};

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 结束时间（毫秒时间戳） */
        value: {
            type: Number,
            value: 0,
        },
        /** 输出格式，支持 DD / HH / mm / ss */
        format: {
            type: String,
            value: DEFAULT_FORMAT,
        },
        /** 倒计时前的说明文字 */
        prefix: {
            type: String,
            value: '',
        },
        /** 尺寸 */
        size: {
            type: String,
            value: 'middle',
        },
        /** 风格 */
        variant: {
            type: String,
            value: 'default',
        },
        /** 数字块是否带边框 */
        bordered: {
            type: Boolean,
            value: false,
        },
        /** 追加到根节点的行内样式 */
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        faces: FACES,
        items: [] as CountdownItem[],
        readable: '',
    },

    observers: {
        'value, format'() {
            this.restart();
        },
    },

    lifetimes: {
        attached() {
            this.restart();
        },
        detached() {
            this.stop();
        },
    },

    methods: {
        stop() {
            const self = this as unknown as { __timer?: number };
            if (self.__timer) {
                clearInterval(self.__timer);
                self.__timer = undefined;
            }
        },

        /** 按 format 建出数字位骨架 */
        buildItems(remaining: number): CountdownItem[] {
            const format = this.data.format || DEFAULT_FORMAT;
            const digits = splitRemaining(remaining, format);
            const items: CountdownItem[] = [];
            splitFormat(format).forEach((part) => {
                if (part.kind === 'token') {
                    digits[part.value].split('').forEach((char) => {
                        items.push({ kind: 'cell', text: char, pos: Number(char), anim: false, colon: false });
                    });
                    return;
                }
                items.push({
                    kind: 'sep',
                    text: part.value,
                    pos: 0,
                    anim: false,
                    colon: /[:：]/.test(part.value),
                });
            });
            return items;
        },

        restart() {
            this.stop();
            const self = this as unknown as { __timer?: number; __finished?: boolean };
            self.__finished = false;
            const remaining = this.getRemaining();
            this.setData({ items: this.buildItems(remaining), readable: this.toReadable(remaining) });
            this.tick();
            if (remaining > 0) {
                self.__timer = setInterval(() => this.tick(), 250) as unknown as number;
            }
        },

        getRemaining(): number {
            return Math.max(0, Number(this.data.value) - Date.now());
        },

        toReadable(remaining: number): string {
            const format = this.data.format || DEFAULT_FORMAT;
            const digits = splitRemaining(remaining, format);
            return splitFormat(format)
                .map((part) => (part.kind === 'token' ? digits[part.value] : part.value))
                .join('');
        },

        tick() {
            const self = this as unknown as { __timer?: number; __finished?: boolean };
            const remaining = this.getRemaining();            const format = this.data.format || DEFAULT_FORMAT;
            const digits = splitRemaining(remaining, format);

            // 把目标数字串按 cell 顺序排好
            const targets: string[] = [];
            splitFormat(format).forEach((part) => {
                if (part.kind === 'token') digits[part.value].split('').forEach((char) => targets.push(char));
            });

            let wrapped = false;
            let cellIndex = 0;
            const items = this.data.items.map((item: CountdownItem) => {
                if (item.kind !== 'cell') return item;
                const next = Number(targets[cellIndex]);
                cellIndex += 1;
                const prev = item.pos % 10;
                if (prev === next) return { ...item, text: targets[cellIndex - 1], anim: false };

                // 永远向下滚：减 1 走 1 步，0→9 回绕也只走 1 步
                const delta = (prev - next + 10) % 10;
                let pos = item.pos - delta;
                let anim = true;
                if (pos < 0) {
                    pos += 10;
                    anim = false;
                    wrapped = true;
                }
                return { ...item, text: targets[cellIndex - 1], pos, anim };
            });

            this.setData({ items, readable: this.toReadable(remaining) });

            if (wrapped) {
                // 回绕那一帧先不滚（瞬移到下一循环的同数字位），下一帧再打开过渡继续往下滚
                setTimeout(() => {
                    this.setData({
                        items: this.data.items.map((item: CountdownItem) => ({ ...item, anim: true })),
                    });
                }, 32);
            }

            this.triggerEvent('change', { remaining });

            if (remaining === 0) {
                if (!self.__finished) {
                    self.__finished = true;
                    this.triggerEvent('finish', {});
                }
                this.stop();
            }
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
