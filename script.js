// 核心逻辑：整合历史需求与新优化
class DeckTracker {
    constructor() {
        this.deck = []; // 8槽履带数组
        this.maxSlots = 8;
        this.recognition = null;
        this.isListening = false;
        this.cardAlias = {}; // 别名映射
        this.slots = []; // 槽位元素数组
        this.textLog = []; // 文本记录数组
        this.permissionGranted = false; // 新增：识别启动事件标志
        this.loadConfig();
        this.loadDeck();
        this.initUI();
    }

    // 加载卡牌别名（从JSON）
    async loadConfig() {
        try {
            const response = await fetch('card_alias.json');
            this.cardAlias = await response.json();
        } catch (e) {
            console.error('加载卡牌库失败，使用空映射。请检查 card_alias.json 文件。');
            this.cardAlias = {}; // 移除不准确默认，仅空对象
        }
    }

    // 持久化：localStorage中断恢复
    loadDeck() {
        const saved = localStorage.getItem('deckState');
        if (saved) {
            this.deck = JSON.parse(saved).slice(-this.maxSlots); // 恢复最后8张
            this.updateDisplay();
        }
    }

    saveDeck() {
        localStorage.setItem('deckState', JSON.stringify(this.deck));
    }

    // 初始化UI（生成8个槽位及文本记录区）
    initUI() {
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const status = document.getElementById('status');
        const deckSlots = document.getElementById('deckSlots');
        const textLogEl = document.getElementById('textLog');

        // 动态生成8个槽位
        for (let i = 0; i < this.maxSlots; i++) {
            const slot = document.createElement('div');
            slot.className = 'slot empty';
            slot.textContent = '空槽';
            deckSlots.appendChild(slot);
            this.slots.push(slot);
        }

        startBtn.addEventListener('click', () => this.startListening());
        stopBtn.addEventListener('click', () => this.stopListening());

        this.updateDisplay();
    }

    // 启动实时语音识别（持续监听，单次权限触发）
    startListening() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('浏览器不支持Web Speech API。请使用Google Chrome。');
            return;
        }

        // 修改逻辑：直接初始化识别，浏览器通过start()单次提示权限
        this.initRecognition();
    }

    // 初始化识别（持续监听核心）
    initRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true; // 持续监听
        this.recognition.interimResults = true; // 启用临时结果，处理短句拆分
        this.recognition.lang = 'zh-CN';

        // 新增：onstart事件确认权限授权后设置标志
        this.recognition.onstart = () => {
            this.permissionGranted = true;
            console.log('识别已启动，权限授权成功。');
            document.getElementById('status').textContent = '持续监听中... 喊牌名立即记录。';
        };

        this.recognition.onresult = (event) => {
            let interimText = ''; // 临时文本（未确认）
            let finalText = ''; // 最终确认文本
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i][0];
                if (result.isFinal) {
                    finalText += result.transcript;
                } else {
                    interimText += result.transcript;
                }
            }
            // 立即处理临时+最终文本，确保短句不合并
            const fullText = (interimText + finalText).trim();
            if (fullText) {
                this.addToTextLog(fullText); // 记录全文
                this.processText(fullText); // 拆分处理关键词
            }
        };

        this.recognition.onerror = (event) => {
    console.error('识别错误：', event.error);
    if (event.error === 'not-allowed') {
        document.getElementById('status').textContent = '权限被拒绝，请在浏览器设置中允许麦克风访问。';
        this.stopListening();  // 新增：停止监听，防止循环请求
    } else {
        document.getElementById('status').textContent = '识别中断，重试中...';
    }
};

        this.recognition.onend = () => {
            if (this.isListening) {
                this.recognition.start(); // 自动重启，确保持续监听
            }
        };

        this.recognition.start();
        this.isListening = true;
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
    }

    stopListening() {
        if (this.recognition) this.recognition.stop();
        this.isListening = false;
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        document.getElementById('status').textContent = '已停止监听。';
    }

    // 处理文本：拆分短句，避免合并（基于空格边界）
    processText(text) {
        // 修复：简化拆分，按空格分割，然后逐词匹配
        const words = text.toLowerCase().trim().split(/\s+/);
        words.forEach(word => {
            if (!word) return;
            const matchedCard = this.fuzzyMatch(word);
            if (matchedCard) {
                this.recordCard(matchedCard); // 立即添加至卡槽
            }
        });
    }

    // 模糊匹配（相似度阈值0.6）
    fuzzyMatch(text) {
        let bestMatch = null;
        let bestScore = 0;
        for (const [alias, realName] of Object.entries(this.cardAlias)) {
            const score = this.similarity(text, alias.toLowerCase());
            if (score > bestScore && score > 0.6) {
                bestScore = score;
                bestMatch = realName;
            }
        }
        return bestMatch;
    }

    // 简单相似度计算
    similarity(s1, s2) {
        const set1 = new Set(s1.split(''));
        const set2 = new Set(s2.split(''));
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        return intersection.size / Math.max(set1.size, set2.size, 1); // 避免除零
    }

    // 立即记录至履带（相邻重复检测）
    recordCard(card) {
        // 检测相邻重复，若末尾相同则跳过添加
        if (this.deck.length > 0 && this.deck[this.deck.length - 1] === card) {
            console.log(`相邻重复检测：${card} 已存在，跳过添加。`);
            return; // 不添加，履带循环不变
        }

        if (this.deck.length >= this.maxSlots) {
            this.deck.shift(); // 顶替最旧
        }
        this.deck.push(card);
        this.saveDeck();
        this.updateDisplay();
        console.log(`立即记录 → ${card}`);
    }

    // 更新显示（填充8个槽位，每槽显示对应名称）
    updateDisplay() {
        for (let i = 0; i < this.maxSlots; i++) {
            const slot = this.slots[i];
            if (i < this.deck.length) {
                slot.textContent = this.deck[i]; // 显示对应卡牌标准名称
                slot.className = 'slot filled';
            } else {
                slot.textContent = '空槽';
                slot.className = 'slot empty';
            }
        }
    }

    // 添加监听文本至下方记录区
    addToTextLog(text) {
        this.textLog.push(`${new Date().toLocaleTimeString()}: ${text}`);
        const textLogEl = document.getElementById('textLog');
        const p = document.createElement('p');
        p.textContent = `${new Date().toLocaleTimeString()}: ${text}`;
        textLogEl.appendChild(p);
        textLogEl.scrollTop = textLogEl.scrollHeight; // 自动滚动到底部
        // 限制记录条数，避免溢出
        if (this.textLog.length > 50) {
            this.textLog.shift();
            textLogEl.removeChild(textLogEl.firstChild);
        }
    }
}

// 初始化
new DeckTracker();
