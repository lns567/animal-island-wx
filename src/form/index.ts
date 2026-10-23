/**
 * ai-form —— 表单容器
 *
 * 与 Web 版 Form 的差异（详见 docs/migration-from-react.md）：
 * - Web 版靠 React Context 把 form 实例注入 Form.Item；小程序没有 Context，
 *   改用官方的**组件间关系**（`relations: descendant/ancestor`）收集字段实例
 * - Web 版支持 `<Form onFinish>`；小程序里的事件只能绑在 WXML 节点上，
 *   所以改成命令式：`this.selectComponent('#form').validate()`，通过 `bind:finish` /
 *   `bind:finishFailed` 收结果，两种都用都行
 * - `onValuesChange` → `bind:valueschange`（detail: { name, value, values }）
 * - 不做 24 栅格（`labelCol` / `wrapperCol`）：WXSS 里写死栅格得不偿失，
 *   只保留 `labelWidth` 一个属性
 * - `layout` 支持 horizontal / vertical，`inline` 没做（小程序没有换行流式表单的场景）
 */

interface FieldLike {
    getFieldName?: () => string;
    getFieldValue?: () => unknown;
    validateField?: () => Promise<string[]>;
    resetField?: () => void;
    setFieldValue?: (value: unknown) => void;
    setFieldError?: (message: string) => void;
}

interface FormSelf {
    __fields?: FieldLike[];
}

Component({
    externalClasses: ['extClass'],

    relations: {
        '../formitem/index': {
            type: 'descendant' as const,
            linked(target: unknown) {
                const self = this as unknown as FormSelf;
                self.__fields = self.__fields || [];
                self.__fields.push(target as FieldLike);
            },
            unlinked(target: unknown) {
                const self = this as unknown as FormSelf;
                self.__fields = (self.__fields || []).filter((item) => item !== target);
            },
        },
    },

    properties: {
        /** 布局：horizontal / vertical */
        layout: {
            type: String,
            value: 'horizontal',
        },
        /** label 宽度（horizontal 布局下生效） */
        labelWidth: {
            type: String,
            value: '88px',
        },
        /** label 后是否显示冒号 */
        colon: {
            type: Boolean,
            value: true,
        },
        /** 全局禁用 */
        disabled: {
            type: Boolean,
            value: false,
        },
        /** 尺寸：small / middle / large */
        size: {
            type: String,
            value: 'middle',
        },
        /** 初始值对象，会分发给同名字段 */
        initialValues: {
            type: Object,
            value: {},
        },
        /** 追加到根节点的行内样式 */
        extStyle: {
            type: String,
            value: '',
        },
    },

    data: {
        fields: [] as string[],
    },

    observers: {
        initialValues(values: Record<string, unknown>) {
            if (!values) return;
            const keys = Object.keys(values);
            if (!keys.length) return;
            this.applyValues(values);
        },
    },

    lifetimes: {
        ready() {
            const values = this.data.initialValues as Record<string, unknown>;
            if (values && Object.keys(values).length) this.applyValues(values);
        },
    },

    methods: {
        /** relations + selectAllComponents 双保险，避免 slot 里 linked 时机不同 */
        collectFields(): FieldLike[] {
            const self = this as unknown as FormSelf;
            const list = (self.__fields || []).slice();

            // 浏览器预览的 polyfill 没有实现 selectAllComponents，这里要留兜底
            if (typeof this.selectAllComponents === 'function') {
                this.selectAllComponents('.ai-form-item').forEach((item: unknown) => {
                    const candidate = item as unknown as FieldLike;
                    if (list.indexOf(candidate) < 0) list.push(candidate);
                });
            }

            return list.filter((item) => typeof (item as FieldLike).getFieldName === 'function');
        },

        applyValues(values: Record<string, unknown>) {
            this.collectFields().forEach((item: FieldLike) => {
                const name = item.getFieldName ? item.getFieldName() : '';
                if (name && Object.prototype.hasOwnProperty.call(values, name) && item.setFieldValue) {
                    item.setFieldValue(values[name]);
                }
            });
        },

        /** 取全部字段值 */
        getFieldsValue(): Record<string, unknown> {
            const values: Record<string, unknown> = {};
            this.collectFields().forEach((item) => {
                const name = item.getFieldName ? item.getFieldName() : '';
                if (name && item.getFieldValue) values[name] = item.getFieldValue();
            });
            return values;
        },

        /** 批量写入字段值 */
        setFieldsValue(values: Record<string, unknown>) {
            this.applyValues(values);
        },

        /** 校验全部字段；返回 Promise<{ ok, values, errors }> */
        validate(): Promise<{ ok: boolean; values: Record<string, unknown>; errors: Array<{ name: string; message: string }> }> {
            const fields = this.collectFields();

            return Promise.all(
                fields.map((item: FieldLike) =>
                    (item.validateField ? item.validateField() : Promise.resolve([])).then((messages: string[]) => ({
                        name: item.getFieldName ? item.getFieldName() : '',
                        messages: messages || [],
                    }))
                )
            ).then((results) => {
                const errors: Array<{ name: string; message: string }> = [];
                results.forEach((result: { name: string; messages: string[] }) => {
                    if (result.messages.length) errors.push({ name: result.name, message: result.messages[0] });
                });

                const values = this.getFieldsValue();
                const ok = errors.length === 0;

                if (ok) this.triggerEvent('finish', { values });
                else this.triggerEvent('finishFailed', { errors, values });

                return { ok, values, errors };
            });
        },

        /** 重置全部字段 */
        resetFields() {
            this.collectFields().forEach((item) => {
                if (item.resetField) item.resetField();
            });
            this.triggerEvent('reset');
        },

        /** 字段值变化时由 ai-form-item 调用 */
        handleFieldChange(name: string, value: unknown) {
            this.triggerEvent('valueschange', { name, value, values: this.getFieldsValue() });
        },
    },
});

// 显式声明为模块，避免各组件文件被当成全局脚本而互相污染顶层变量
export {};
