/**
 * ai-background —— 装饰壁纸背景
 *
 * 与 Web 版 Background 的差异（详见 docs/migration-from-react.md）：
 * - 16 种壁纸（波点 / 网格 / 针糖）是纯 CSS 渐变，从 Web 版样式一比一搬过来，视觉完全一致
 * - 两种场景图（sweet-corner / coffee-break）依赖包内图片，小程序 `background-image` 引不了本地图，
 *   改成 `image` 属性传图片地址（网络地址 / base64）
 */

Component({
    externalClasses: ['extClass'],
    properties: {
        /** 壁纸类型：default / grid / sprinkles / dots-* */
        type: {
            type: String,
            value: 'default',
        },
        /** 自定义背景图地址（优先级高于 type） */
        image: {
            type: String,
            value: '',
        },
        /** 高度（px），不传由内容撑开 */
        height: {
            type: Number,
            value: 0,
        },
        /** 追加到根节点的行内样式 */
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        rootStyle: '',
    },

    observers: {
        'image, height'() {
            this.buildStyle();
        },
    },

    lifetimes: {
        attached() {
            this.buildStyle();
        },
    },

    methods: {
        buildStyle() {
            const { image, height } = this.data;
            const parts: string[] = [];
            if (image) parts.push(`background-image:url('${image}')`);
            if (Number(height) > 0) parts.push(`height:${Number(height)}px`);
            this.setData({ rootStyle: parts.length ? `${parts.join(';')};` : '' });
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
