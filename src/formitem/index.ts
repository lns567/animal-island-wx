/**
 * ai-form-item —— 表单字段
 *
 * 与 Web 版 Form.Item 的差异（详见 docs/migration-from-react.md）：
 * - Web 版用 cloneElement 把 value / onChange 注入子控件；小程序不能改写 slot 里的节点，
 *   所以提供两条路：
 *   1) `control="input" | "switch"`：组件内部自带控件，值由本组件管理（推荐）
 *   2) `control="custom"`（默认）+ slot：控件由页面自己写，把值通过 `value` 属性喂进来
 * - `rules` 只能是「可序列化对象」（WXML 传不了函数）：`pattern` 用字符串、去掉 `validator`
 * - 异步校验（validator 返回 Promise）没有等价物，去掉
 * - `getValueFromEvent` / `normalize` / `dependencies` 都依赖函数，去掉
 * - 校验时机：控件 blur 时校验一次；`form.validate()` 时强制校验；值变化时清掉旧错误
 */

interface RuleObject {
    required?: boolean;
    message?: string;
    min?: number;
    max?: number;
    len?: number;
    /** 正则字符串，注意 WXML 里要写成 "\\\\d+" 这种形式 */
    pattern?: string;
    /** 值类型：string / number / integer / array / email / url */
    type?: string;
    /** required 时，纯空白也算失败 */
    whitespace?: boolean;
}

interface ParentInstance {
    data: Record<string, unknown>;
    handleFieldChange?: (name: string, value: unknown) => void;
}

interface ItemSelf {
    __parent?: ParentInstance;
}

const EMAIL = /^[\w.!#$%&'*+/=?^`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;
const URL_RE = /^https?:\/\/[^\s/$.?#][^\s]*$/i;

const isEmpty = (value: unknown): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value === '';
    if (Array.isArray(value)) return value.length === 0;
    return false;
};

Component({
    externalClasses: ['extClass'],

    relations: {
        '../form/index': {
            type: 'ancestor' as const,
            linked(parent: unknown) {
                const self = this as unknown as ItemSelf;
                self.__parent = parent as ParentInstance;
                this.applyParent();
            },
            unlinked() {
                const self = this as unknown as ItemSelf;
                self.__parent = undefined;
            },
        },
    },

    properties: {
        /** 字段名（对应 form 的 values key） */
        name: {
            type: String,
            value: '',
        },
        /** label 文本 */
        label: {
            type: String,
            value: '',
        },
        /** 校验规则数组 */
        rules: {
            type: Array,
            value: [] as RuleObject[],
        },
        /** 是否显示必填星号（校验仍以 rules.required 为准） */
        required: {
            type: Boolean,
            value: false,
        },
        /** 帮助文本（有错误时优先显示错误） */
        help: {
            type: String,
            value: '',
        },
        /**
         * 控件类型：
         * - input  内置 ai-input
         * - switch 内置 ai-switch
         * - custom 使用 slot（默认）
         */
        control: {
            type: String,
            value: 'custom',
        },
        /** 受控值（custom 模式下由页面传入） */
        value: {
            type: null,
            value: '',
        },
        /** 占位文案（内置控件用） */
        placeholder: {
            type: String,
            value: '',
        },
        /** 覆盖父级布局：horizontal / vertical */
        layout: {
            type: String,
            value: '',
        },
        /** 覆盖父级 label 宽度 */
        labelWidth: {
            type: String,
            value: '',
        },
        /** 覆盖父级冒号 */
        colon: {
            type: null,
            value: null,
        },
        /** 覆盖父级禁用 */
        disabled: {
            type: null,
            value: null,
        },
        /** 覆盖父级尺寸 */
        size: {
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
        innerValue: '' as unknown,
        error: '',
        ctxLayout: 'horizontal',
        ctxLabelWidth: '88px',
        ctxColon: true,
        ctxDisabled: false,
        ctxSize: 'middle',
        /** 重置基线：首次由 form.initialValues 注入的值，否则回落到 value 属性 */
        initialValue: '' as unknown,
        initialLocked: false,
    },

    observers: {
        value(next: unknown) {
            if (next === this.data.innerValue) return;
            this.setData({ innerValue: next });
        },
    },

    lifetimes: {
        attached() {
            this.setData({
                innerValue: this.data.value,
                initialValue: this.data.initialLocked ? this.data.initialValue : this.data.value,
            });
        },
        ready() {
            this.applyParent();
        },
    },

    methods: {
        applyParent() {
            const self = this as unknown as ItemSelf;
            const parent = self.__parent;
            if (!parent) return;

            const data = parent.data || {};
            this.setData({
                ctxLayout: this.data.layout || (data.layout as string) || 'horizontal',
                ctxLabelWidth: this.data.labelWidth || (data.labelWidth as string) || '88px',
                ctxColon: this.data.colon === null ? data.colon !== false : Boolean(this.data.colon),
                ctxDisabled: this.data.disabled === null ? Boolean(data.disabled) : Boolean(this.data.disabled),
                ctxSize: this.data.size || (data.size as string) || 'middle',
            });
        },

        /* ---------- 供 ai-form 调用的协议 ---------- */
        getFieldName(): string {
            return this.data.name || '';
        },

        getFieldValue(): unknown {
            return this.data.innerValue;
        },

        setFieldValue(value: unknown) {
            // 首次由 form.initialValues 注入的值作为重置基线
            const patch: Record<string, unknown> = { innerValue: value, error: '' };
            if (!this.data.initialLocked) {
                patch.initialValue = value;
                patch.initialLocked = true;
            }
            this.setData(patch);
        },

        setFieldError(message: string) {
            this.setData({ error: message || '' });
        },

        /** 校验本字段，resolve 错误信息数组（空数组 = 通过） */
        validateField(): Promise<string[]> {
            const messages = checkRules((this.data.rules || []) as RuleObject[], this.data.innerValue);
            this.setData({ error: messages.length ? messages[0] : '' });
            return Promise.resolve(messages);
        },

        resetField() {
            this.setData({ innerValue: this.data.initialValue, error: '' });
        },

        /* ---------- 控件事件 ---------- */
        commit(next: unknown, options?: { validate?: boolean }) {
            this.setData({ innerValue: next, error: '' });
            this.triggerEvent('change', { name: this.data.name, value: next });

            const self = this as unknown as ItemSelf;
            if (self.__parent && self.__parent.handleFieldChange) {
                self.__parent.handleFieldChange(this.data.name, next);
            }

            if (options && options.validate) this.validateField();
        },

        handleInput(event: WechatMiniprogram.CustomEvent) {
            this.commit((event.detail || {}).value);
        },

        handleBlur() {
            this.validateField();
        },

        handleSwitchChange(event: WechatMiniprogram.CustomEvent) {
            this.commit((event.detail || {}).checked, { validate: true });
        },
    },
});

/** 纯函数校验：只依赖可序列化的规则对象 */
function checkRules(rules: RuleObject[], value: unknown): string[] {
    const messages: string[] = [];

    for (let i = 0; i < rules.length; i += 1) {
        const rule = rules[i] || {};
        const label = rule.message || '';

        if (rule.required) {
            const empty = isEmpty(value) || (rule.whitespace && typeof value === 'string' && value.trim() === '');
            if (empty) {
                messages.push(label || '此项为必填项');
                continue;
            }
        }

        if (isEmpty(value)) continue;

        if (rule.type) {
            const typeError = checkType(rule.type, value);
            if (typeError) {
                messages.push(label || typeError);
                continue;
            }
        }

        if (typeof rule.len === 'number' && lengthOf(value) !== rule.len) {
            messages.push(label || `长度必须为 ${rule.len}`);
            continue;
        }

        if (typeof rule.min === 'number') {
            const tooShort = typeof value === 'number' ? value < rule.min : lengthOf(value) < rule.min;
            if (tooShort) {
                messages.push(label || `不能小于 ${rule.min}`);
                continue;
            }
        }

        if (typeof rule.max === 'number') {
            const tooLong = typeof value === 'number' ? value > rule.max : lengthOf(value) > rule.max;
            if (tooLong) {
                messages.push(label || `不能大于 ${rule.max}`);
                continue;
            }
        }

        if (rule.pattern) {
            let regex: RegExp | null = null;
            try {
                regex = new RegExp(rule.pattern);
            } catch (error) {
                regex = null;
            }
            if (regex && !regex.test(String(value))) {
                messages.push(label || '格式不正确');
            }
        }
    }

    return messages;
}

function lengthOf(value: unknown): number {
    if (typeof value === 'string') return value.length;
    if (Array.isArray(value)) return value.length;
    return String(value).length;
}

function checkType(type: string, value: unknown): string {
    switch (type) {
        case 'number':
            return typeof value === 'number' || !Number.isNaN(Number(value)) ? '' : '必须是数字';
        case 'integer':
            return /^-?\d+$/.test(String(value)) ? '' : '必须是整数';
        case 'array':
            return Array.isArray(value) ? '' : '必须是数组';
        case 'email':
            return EMAIL.test(String(value)) ? '' : '邮箱格式不正确';
        case 'url':
            return URL_RE.test(String(value)) ? '' : '网址格式不正确';
        case 'boolean':
            return typeof value === 'boolean' ? '' : '必须是布尔值';
        default:
            return '';
    }
}

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
