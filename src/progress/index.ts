/**
 * ai-progress —— 进度条
 *
 * 与 Web 版 Progress 的差异（详见 docs/migration-from-react.md）：
 * - variant（场景图填充：sweet-corner / forest-grove / starry-camp / coffee-break）
 *   未移植：小程序里 background-image 不能引用包内图片，把照片转 base64 会让包体
 *   翻好几倍；需要图片进度条时请自己用 `ext-style` 叠一张网络图
 * - infoFormat（函数）→ `infoText` 字符串，需要自定义文案时在页面里算好再传
 * - 完成态用 `--done` 类代替 Web 版的 `[aria-valuenow='100']` 属性选择器
 * - 轨道宽度不再需要测量（没有场景图就不需要 background-size）
 */

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 0 - 100，超出会被裁剪 */
        percent: {
            type: Number,
            value: 0,
        },
        /** 尺寸 */
        size: {
            type: String,
            value: 'middle',
        },
        /** 是否显示百分比文字 */
        showInfo: {
            type: Boolean,
            value: true,
        },
        /** 自定义展示文案（不传则显示 `xx%`） */
        infoText: {
            type: String,
            value: '',
        },
        /** 进度变化过渡时长（秒），传 0 关闭过渡 */
        duration: {
            type: Number,
            value: 0.6,
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
        value: 0,
        percentText: '0%',
        done: false,
    },

    observers: {
        percent(value: number) {
            const numeric = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
            const clamped = Math.max(0, Math.min(100, numeric));
            this.setData({
                value: clamped,
                percentText: `${Math.round(clamped)}%`,
                done: clamped >= 100,
            });
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
