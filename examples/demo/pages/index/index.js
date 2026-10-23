Page({

    data: {
        colors: [
            'app-pink',
            'purple',
            'app-blue',
            'app-yellow',
            'app-orange',
            'app-teal',
            'app-green',
            'app-red',
            'lime-green',
            'yellow-green',
            'brown',
            'warm-peach-pink',
        ],
        tags: [
            { text: '森林', color: 'app-green' },
            { text: '音乐', color: 'app-blue' },
            { text: '露营', color: 'app-orange' },
            { text: '读书', color: 'app-yellow' },
        ],
        switchValues: {
            forest: true,
            music: false,
        },
        inputText: '',
        icons: ['user', 'donut', 'star', 'heart', 'fish', 'bell', 'home', 'search'],
        avatarItems: [
            { src: '/assets/avatar.png' },
            { content: '鱼' },
            { icon: 'bell' },
            { content: '狐' },
            { icon: 'fish' },
            { content: '猫' },
        ],
        checkboxOptions: [
            { label: '带钓竿', value: 'rod' },
            { label: '带网兜', value: 'net' },
            { label: '带铲子', value: 'shovel', disabled: true },
        ],
        checkboxValue: ['rod'],
        checkboxSelected: ['rod'],
        radioOptions: [
            { label: '早上', value: 'am' },
            { label: '下午', value: 'pm' },
            { label: '晚上', value: 'night' },
        ],
        radioValue: 'pm',
        slides: [
            { src: '/assets/sample.jpg', title: '岛民服务中心', desc: '办理各种手续的地方' },
            { src: '/assets/sample2.jpg', title: '商店街', desc: '每天都有新货上架' },
            { src: '/assets/sample3.jpg', title: '博物馆', desc: '化石、鱼类、昆虫收藏' },
        ],
        slideIndex: 0,
        sampleSrc: '/assets/sample.jpg',
        showBackTop: false,
        tableColumns: [
            { title: '时间', dataIndex: 'time', width: 96 },
            { title: '商品', dataIndex: 'name' },
            { title: '价格', dataIndex: 'price', align: 'right', width: 108 },
        ],
        tableData: [
            { key: 1, time: '08:12', name: '大头菜', price: '92 铃钱' },
            { key: 2, time: '10:40', name: '鲈鱼', price: '400 铃钱' },
            { key: 3, time: '13:05', name: '蝴蝶', price: '160 铃钱' },
            { key: 4, time: '16:22', name: '樱花花瓣', price: '3 铃钱' },
        ],
        rateValue: 4,
        page: 3,
        page2: 1,
        countdownValue: Date.now() + 3 * 3600 * 1000 + 25 * 60 * 1000 + 8000,
        modalOpen: false,
        modalVariant: 'game',
        drawerOpen: false,
        loadingActive: false,
        tabKey: 'fish',
        tabItems: [
            { key: 'fish', label: '鱼类' },
            { key: 'bug', label: '昆虫' },
            { key: 'fossil', label: '化石' },
        ],

        /* ---------- 第 12~15 批新增 ---------- */
        codeSample: [
            '// 一个最小的自定义组件',
            "Component({",
            "    properties: {",
            "        content: { type: String, value: '' },",
            '    },',
            '    methods: {',
            '        handleTap() {',
            "            this.triggerEvent('click', { ok: true });",
            '        },',
            '    },',
            '});',
        ].join('\n'),
        typewriterText: '嗨，我是打字机。每个字间隔 70ms，打完会触发 done 事件。',
        typewriterKey: 1,
        selectOptions: [
            { key: 'island', label: '动物岛' },
            { key: 'forest', label: '森林岛' },
            { key: 'music', label: '音乐岛' },
            { key: 'camp', label: '露营岛' },
        ],
        selectValue: 'island',
        timeValue: '08:30:00',
        dateValue: '2026-10-23',
        // ---- Calendar ----
        calendarValue: '',
        calendarEvents: [],
        // ---- CountUp ----
        score: 2680,
        counting: false,
        countingSmall: false,
        bioText: '',
        formInitial: { nick: '岛民', email: '', notify: true },
        nickRules: [
            { required: true, message: '请输入昵称' },
            { min: 2, max: 8, message: '昵称 2~8 个字符' },
        ],
        emailRules: [
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '邮箱格式不对' },
        ],
    },

    onLoad() {
        // 事项按「相对今天」生成，任何时候打开 demo 都能看到当月有内容
        const day = (offset) => {
            const date = new Date();
            date.setDate(date.getDate() + offset);
            const pad = (n) => String(n).padStart(2, '0');
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
        };
        this.setData({
            calendarValue: day(0),
            calendarEvents: [
                // 跨天事项：会自动按周切片成连续的事项条
                { title: '钓鱼大赛', start: `${day(-2)} 09:30`, end: day(1), color: 'teal' },
                { title: '露营地布置', start: day(-5), end: day(-4), color: 'green' },
                { title: '博物馆捐赠', start: day(3), color: 'amber' },
                { title: '生日会', start: `${day(0)} 18:00`, color: 'coral' },
                { title: '流星雨观测', start: day(6), color: 'purple' },
                // 同一天多条：超过 2 条会折叠成 +N
                { title: '大扫除', start: day(0), color: 'teal' },
                { title: '种树', start: day(0), color: 'amber' },
            ],
            counting: true,
            countingSmall: true,
        });
    },

    onCheckboxChange(event) {
        this.setData({ checkboxValue: event.detail.value });
    },

    onRadioChange(event) {
        this.setData({ radioValue: event.detail.value });
    },

    onTabChange(event) {
        this.setData({ tabKey: event.detail.key });
    },

    onSlideChange(event) {
        this.setData({ slideIndex: event.detail.index });
    },

    onPageScroll(event) {
        // 小程序组件拿不到页面滚动，BackTop 的显隐由页面决定
        const visible = event.scrollTop > 400;
        if (visible !== this.data.showBackTop) this.setData({ showBackTop: visible });
    },

    onBackTop() {
        wx.showToast({ title: '回到顶部', icon: 'none', duration: 800 });
    },

    onRateChange(event) {
        this.setData({ rateValue: event.detail.value });
    },

    onPageChange(event) {
        this.setData({ page: event.detail.page });
    },

    onPage2Change(event) {
        this.setData({ page2: event.detail.page });
    },

    onSizeChange(event) {
        wx.showToast({ title: '每页 ' + event.detail.size + ' 条', icon: 'none' });
    },

    onCountdownFinish() {
        wx.showToast({ title: '倒计时结束', icon: 'none' });
    },

    onOpenModal() {
        this.setData({ modalOpen: true, modalVariant: 'game' });
    },

    onOpenDefaultModal() {
        this.setData({ modalOpen: true, modalVariant: 'default' });
    },

    onCloseModal() {
        this.setData({ modalOpen: false });
    },

    onOkModal() {
        this.setData({ modalOpen: false });
        wx.showToast({ title: '已确认', icon: 'none' });
    },

    onOpenDrawer() {
        this.setData({ drawerOpen: true });
    },

    onCloseDrawer() {
        this.setData({ drawerOpen: false });
    },

    onShowLoading() {
        this.setData({ loadingActive: true });
        setTimeout(() => this.setData({ loadingActive: false }), 1600);
    },

    onButtonClick() {
        wx.showToast({ title: '按钮被点击了', icon: 'none' });
    },

    onSwitchChange(event) {
        const key = event.currentTarget.dataset.key;
        this.setData({ [`switchValues.${key}`]: event.detail.checked });
    },

    onInput(event) {
        this.setData({ inputText: event.detail.value });
    },

    onClear() {
        this.setData({ inputText: '' });
    },

    onCloseTag(event) {
        const index = event.currentTarget.dataset.index;
        const tags = this.data.tags.slice();
        tags.splice(index, 1);
        this.setData({ tags });
    },

    onMoreAvatar() {
        wx.showToast({ title: '点到了折叠的 +N', icon: 'none' });
    },

    /* ---------- 第 12~15 批新增 ---------- */
    onCodeCopy() {
        wx.showToast({ title: '代码已复制', icon: 'none' });
    },

    onTypewriterDone() {
        // 打完自动重播，避免 demo 页一片静止
        setTimeout(() => {
            this.setData({ typewriterKey: this.data.typewriterKey + 1 });
        }, 2400);
    },

    onReplayTypewriter() {
        this.setData({ typewriterKey: this.data.typewriterKey + 1 });
    },

    onSelectChange(event) {
        this.setData({ selectValue: event.detail.key });
    },

    onTimeChange(event) {
        this.setData({ timeValue: event.detail.value || '' });
    },

    onDateChange(event) {
        this.setData({ dateValue: event.detail.value || '' });
    },

    onBioInput(event) {
        this.setData({ bioText: event.detail.value });
    },

    onSubmitForm() {
        const form = this.selectComponent('#demoForm');
        if (!form) return;
        form.validate().then((result) => {
            wx.showToast({
                title: result.ok ? '校验通过' : '还有字段需要修改',
                icon: 'none',
            });
        });
    },

    onResetForm() {
        const form = this.selectComponent('#demoForm');
        if (form) form.resetFields();
        this.setData({ bioText: '' });
    },

    onFormFinish(event) {
        console.log('form finish', event.detail.values);
    },

    onFormFail(event) {
        console.log('form fail', event.detail.errors);
    },

    onUploadChange(event) {
        const list = event.detail.fileList || [];
        if (list.length) this.setData({ uploadCount: list.length });
    },

    onNotifySuccess() {
        const notice = this.selectComponent('#notice');
        if (notice) notice.success({ message: '保存成功', description: '你的改动已经同步到岛上', position: 'top' });
    },

    onNotifyInfo() {
        const notice = this.selectComponent('#notice');
        if (notice) notice.info({ message: '有新消息', description: '岛民服务中心发来一条通知', position: 'topRight' });
    },

    onNotifyWarning() {
        const notice = this.selectComponent('#notice');
        if (notice) notice.warning({ message: '背包快满了', description: '只剩 3 格空间', position: 'top' });
    },

    onNotifyError() {
        const notice = this.selectComponent('#notice');
        if (notice) notice.error({ message: '连接失败', description: '请检查网络后重试', position: 'bottom' });
    },

    onCalendarChange(event) {
        this.setData({ calendarValue: event.detail.date });
    },

    onCalendarPanel(event) {
        // 面板翻月：真实项目里可以在这里按需拉取该月事项
        console.log('panel ->', event.detail.month);
    },

    onReplayCount() {
        const counter = this.selectComponent('#demoCountup');
        if (counter) counter.reset(0);
        this.setData({ counting: true, countingSmall: true });
    },

    onCountDone(event) {
        wx.showToast({ title: `计数完成 ${event.detail.elapsed.toFixed(1)}s`, icon: 'none' });
    },
});
