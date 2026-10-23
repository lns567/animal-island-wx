/**
 * ai-rate —— 星级评分
 *
 * 与 Web 版 Rate 的差异（详见 docs/migration-from-react.md）：
 * - 图标不能变色：Web 版是内联 <svg> 直接改 stroke / fill，小程序里图标是 background-image。
 *   这里准备了两张内联图（空心 #c4b89e / 金色填充），叠在一起用 opacity 交叉淡入，
 *   视觉上等价于 Web 版的 fill-opacity 过渡
 * - 没有悬停预览（touch 设备上没有 hover），选中态直接跟随 value
 * - 键盘导航（方向键 / Home / End）没有；`role="radiogroup"` + `aria-label` 保留
 */

interface StarItem {
    value: number;
    active: boolean;
    pop: string;
    splash: boolean;
    delay: string;
}

const BURST_STEP_MS = 60;

/** 把任意评分夹取成 [0, count] 的整数 */
const toStarCount = (value: number, count: number) => Math.min(count, Math.max(0, Math.round(value)));

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 当前评分（受控） */
        value: {
            type: null,
            value: null,
        },
        /** 默认评分（非受控） */
        defaultValue: {
            type: Number,
            value: 0,
        },
        /** 星星总数 */
        count: {
            type: Number,
            value: 5,
        },
        /** 尺寸 */
        size: {
            type: String,
            value: 'middle',
        },
        /** 只读 */
        readonly: {
            type: Boolean,
            value: false,
        },
        /** 再点同一颗星清空评分 */
        allowClear: {
            type: Boolean,
            value: true,
        },
        /** 追加到根节点的行内样式 */
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        stars: [] as StarItem[],
        innerValue: 0,
        rootStyle: '',
    },

    observers: {
        'value, defaultValue, count'() {
            this.render();
        },
        size() {
            this.render();
        },
    },

    lifetimes: {
        attached() {
            this.setData({ innerValue: this.data.defaultValue || 0 });
            this.render();
        },
    },

    methods: {
        currentValue(): number {
            const { value } = this.data;
            return typeof value === 'number' ? value : this.data.innerValue;
        },

        render() {
            const count = Math.max(1, Number(this.data.count) || 5);
            const checked = toStarCount(this.currentValue(), count);
            const stars: StarItem[] = [];
            for (let i = 0; i < count; i += 1) {
                stars.push({
                    value: i + 1,
                    active: i < checked,
                    pop: '',
                    splash: false,
                    delay: '',
                });
            }
            // 受控用法里页面回写 value 会再触发一次 render；点亮数量没变就不要重建，
            // 否则刚点出来的弹跳 / 六点扩散会被立刻覆盖掉
            const prev = this.data.stars;
            const signature = stars.map((item) => (item.active ? '1' : '0')).join('');
            if (prev.length === count && prev.map((item: StarItem) => (item.active ? '1' : '0')).join('') === signature) {
                return;
            }

            this.setData({ stars });
        },

        handleTap(event: WechatMiniprogram.TouchEvent) {
            if (this.data.readonly) return;
            const starValue = Number(event.currentTarget.dataset.value);
            const count = Math.max(1, Number(this.data.count) || 5);
            const current = toStarCount(this.currentValue(), count);
            const next = this.data.allowClear && current === starValue ? 0 : starValue;
            if (next === current) return;

            this.commit(next, current);
        },

        commit(next: number, from: number) {
            const count = Math.max(1, Number(this.data.count) || 5);
            const controlled = typeof this.data.value === 'number';
            const checked = toStarCount(next, count);

            // 「加分」才播动画：from → next 之间新点亮的星星依次弹出，最后一颗额外放六点扩散
            const stars: StarItem[] = [];
            for (let i = 0; i < count; i += 1) {
                const starValue = i + 1;
                const bursting = checked > from && starValue > from && starValue <= checked;
                stars.push({
                    value: starValue,
                    active: i < checked,
                    pop: bursting ? 'ai-rate__star--pop' : '',
                    splash: checked > from && starValue === checked,
                    delay: bursting ? `animation-delay:${(starValue - from - 1) * BURST_STEP_MS}ms;` : '',
                });
            }

            this.setData({
                stars,
                innerValue: controlled ? this.data.innerValue : next,
            });

            this.triggerEvent('change', { value: next });

            // 400ms 后收掉动画类，下一次点评才能重新播
            const self = this as unknown as { __popTimer?: number };
            if (self.__popTimer) clearTimeout(self.__popTimer);
            self.__popTimer = setTimeout(() => {
                const reset = this.data.stars.map((item: StarItem) => ({ ...item, pop: '', splash: false, delay: '' }));
                this.setData({ stars: reset });
            }, 700) as unknown as number;
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
