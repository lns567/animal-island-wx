/**
 * ai-typewriter —— 打字机
 *
 * 与 Web 版 Typewriter 的差异（详见 docs/migration-from-react.md）：
 * - Web 版接收 ReactNode 并保持原元素结构；小程序拿不到 slot 的文本长度，
 *   所以改成 `text` 属性驱动（需要富文本时用 `richText` 传 nodes 数组，纯文本走 text）
 * - 定时器在 `detached` 里清理（页面切走后不停表会一直 setData）
 * - 新增 `cursor`：Web 版没有光标，小程序里没有真实的输入焦点，光标只是视觉暗示
 * - `trigger` 用 `type: null`，值一变就重播（把弹窗 open 次数传进来即可）
 */

interface TypewriterSelf {
    __timer?: number;
    __finished?: boolean;
}

Component({
    externalClasses: ['extClass'],

    properties: {
        /** 要逐字显示的文本，支持 \n 换行 */
        text: {
            type: String,
            value: '',
        },
        /** 每个字的间隔（ms） */
        speed: {
            type: Number,
            value: 90,
        },
        /** 是否自动播放；false 时直接全量显示 */
        autoPlay: {
            type: Boolean,
            value: true,
        },
        /** 外部触发重播：值变化即从头开始 */
        trigger: {
            type: null,
            value: null,
        },
        /** 是否显示打字光标 */
        cursor: {
            type: Boolean,
            value: false,
        },
        /** 光标符号 */
        cursorText: {
            type: String,
            value: '|',
        },
        /** 追加到根节点的行内样式 */
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        shown: '',
        cursorVisible: false,
    },

    observers: {
        'text, speed, autoPlay, trigger'() {
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
            const self = this as unknown as TypewriterSelf;
            if (self.__timer) {
                clearInterval(self.__timer);
                self.__timer = undefined;
            }
        },

        restart() {
            const self = this as unknown as TypewriterSelf;
            this.stop();
            self.__finished = false;

            const full = this.data.text || '';

            if (!this.data.autoPlay) {
                this.setData({ shown: full, cursorVisible: false });
                self.__finished = true;
                this.triggerEvent('done', { text: full });
                return;
            }

            this.setData({ shown: '', cursorVisible: Boolean(this.data.cursor) });
            if (!full.length) return;

            const speed = Math.max(1, Number(this.data.speed) || 90);
            let index = 0;

            self.__timer = setInterval(() => {
                index += 1;
                if (index >= full.length) {
                    this.stop();
                    this.setData({ shown: full, cursorVisible: false });
                    if (!self.__finished) {
                        self.__finished = true;
                        this.triggerEvent('done', { text: full });
                    }
                    return;
                }
                this.setData({ shown: full.slice(0, index) });
            }, speed) as unknown as number;
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
