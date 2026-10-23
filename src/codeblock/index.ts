/**
 * ai-codeblock —— 代码块（带极简关键字着色 + 复制）
 *
 * 与 Web 版 CodeBlock 的差异（详见 docs/migration-from-react.md）：
 * - 不做完整语法高亮，只保留 Web 版那套正则的「关键字 / 字符串 / 注释 / 数字 / JSX 标签 / 属性」着色
 * - `<pre>` → 按行拆成 `<view>` + `<text>`，因为 WXML 里连续的空白会被折叠；
 *   每格 `<text space="nbsp">` 才能保住缩进，等宽字体下 nbsp 与原空格等宽
 * - `navigator.clipboard` → `wx.setClipboardData`
 * - 新增 `showLineNumbers`：Web 版没有行号，小程序里按行渲染后几乎零成本
 * - `language` 只影响展示用的角标文案，不参与着色规则
 */

const COLORS = {
    comment: 'comment',
    string: 'string',
    keyword: 'keyword',
    react: 'react',
    component: 'component',
    func: 'func',
    prop: 'prop',
    jsx: 'jsx',
    operator: 'operator',
    number: 'number',
} as const;

/** 顺序即优先级：先匹配到的不让后面的覆盖（与 Web 版 addPattern 的收集顺序一致） */
const RULES: Array<[RegExp, string]> = [
    [/\/\*[\s\S]*?\*\//g, COLORS.comment],
    [/\/\/.*$/gm, COLORS.comment],
    [/`[^`]*`/g, COLORS.string],
    [/"[^"]*"/g, COLORS.string],
    [/'[^']*'/g, COLORS.string],
    [/<\/?[A-Z][\w.$]*/g, COLORS.jsx],
    [/<\/?[a-z][\w-]*/g, COLORS.jsx],
    [/\/?>/g, COLORS.jsx],
    [
        /\b(React|useState|useEffect|useCallback|useMemo|useRef|useContext|Component|Page|Behavior|App|setData|getApp|wx|this)\b/g,
        COLORS.react,
    ],
    [/\b(true|false)\b/g, COLORS.keyword],
    [/\b(null|undefined|void|NaN|Infinity)\b/gi, COLORS.keyword],
    [/\b\d+\.?\d*\b/g, COLORS.number],
    [
        /\b(import|from|as|export|default|const|let|var|function|return|if|else|for|while|switch|case|break|continue|try|catch|throw|finally|new|typeof|instanceof|async|await|type|interface|properties|methods|lifetimes|observers|externalClasses|data)\b/gi,
        COLORS.keyword,
    ],
    [/\b[A-Z][a-zA-Z0-9_$]*\b/g, COLORS.component],
    [/\b[a-z][a-zA-Z0-9_$]*\s*(?=\()/g, COLORS.func],
    [/\b[a-zA-Z_$][\w$]*\s*(?==)/g, COLORS.prop],
    [/>|===|!==|==|!=|<=|>=|&&|\|\||[+\-*/%=<>!&|^~?:]/g, COLORS.operator],
    [/[{}[\]();,]/g, COLORS.operator],
];

interface Token {
    /** 行内唯一 key */
    key: string;
    text: string;
    type: string;
}

interface Line {
    key: string;
    no: number;
    tokens: Token[];
}

/** 把源码切成不重叠的着色片段，再按换行拆行 */
function highlight(code: string): Line[] {
    const spans: Array<{ start: number; end: number; type: string }> = [];

    for (const [regex, type] of RULES) {
        const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
        let match = re.exec(code);
        while (match !== null) {
            if (match[0].length === 0) {
                re.lastIndex += 1;
            } else {
                spans.push({ start: match.index, end: match.index + match[0].length, type });
            }
            match = re.exec(code);
        }
    }

    spans.sort((a, b) => a.start - b.start || b.end - a.end);

    // 展平成字符流，顺带把换行变成「换行标记」，最后按标记拆行
    const lines: Line[] = [];
    let current: Token[] = [];
    let lineNo = 1;
    let cursor = 0;
    let tokenSeq = 0;

    const pushText = (text: string, type: string) => {
        if (!text) return;
        const chunks = text.split('\n');
        for (let i = 0; i < chunks.length; i += 1) {
            if (i > 0) {
                lines.push({ key: `l-${lineNo}`, no: lineNo, tokens: current });
                current = [];
                lineNo += 1;
            }
            const chunk = chunks[i];
            if (chunk) {
                tokenSeq += 1;
                current.push({ key: `t-${tokenSeq}`, text: chunk, type });
            }
        }
    };

    for (const span of spans) {
        if (span.start < cursor) continue;
        pushText(code.slice(cursor, span.start), 'default');
        pushText(code.slice(span.start, span.end), span.type);
        cursor = span.end;
    }
    pushText(code.slice(cursor), 'default');
    lines.push({ key: `l-${lineNo}`, no: lineNo, tokens: current });

    return lines;
}

Component({
    externalClasses: ['extClass'],

    properties: {
        /** 要高亮的源码 */
        code: {
            type: String,
            value: '',
        },
        /** 是否显示复制按钮 */
        copyable: {
            type: Boolean,
            value: true,
        },
        /** 是否显示行号 */
        showLineNumbers: {
            type: Boolean,
            value: false,
        },
        /** 右上角语言角标，空字符串则不显示 */
        language: {
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
        lines: [] as Line[],
        copyStatus: 'idle' as 'idle' | 'copied' | 'error',
        statusText: '复制',
    },

    observers: {
        code(value: string) {
            this.setData({ lines: highlight(value || '') });
        },
    },

    lifetimes: {
        attached() {
            this.setData({ lines: highlight(this.data.code || '') });
        },
        detached() {
            const self = this as unknown as { __timer?: number };
            if (self.__timer) clearTimeout(self.__timer);
        },
    },

    methods: {
        handleCopy() {
            const code = this.data.code || '';
            if (!code) return;

            const self = this as unknown as { __timer?: number };
            if (self.__timer) clearTimeout(self.__timer);

            wx.setClipboardData({
                data: code,
                success: () => {
                    this.setData({ copyStatus: 'copied', statusText: '已复制' });
                    this.triggerEvent('copy', { code });
                },
                fail: () => {
                    this.setData({ copyStatus: 'error', statusText: '复制失败' });
                },
                complete: () => {
                    self.__timer = setTimeout(() => {
                        this.setData({ copyStatus: 'idle', statusText: '复制' });
                    }, 2000) as unknown as number;
                },
            });
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
