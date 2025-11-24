// 核心逻辑：整合历史需求
class DeckTracker {
    constructor() {
        this.deck = []; // 8槽履带数组
        this.maxSlots = 8;
        this.recognition = null;
        this.isListening = false;
        this.cardAlias = {}; // 别名映射
        this.loadConfig();
        this.loadDeck();
        this.initUI();
    }

    // 加载卡牌别名（从JSON，示例扩展）
    loadConfig() {
        // 模拟JSON加载；实际从card_alias.json fetch
        this.cardAlias = {
            "骑士": "骑士", "火球": "火球", "猪": "皇家巨人", "亡灵": "骷髅海",
            "弓箭手": "弓箭手", "宝宝龙": "飞龙宝宝", "野猪": "野猪骑士", "气球": "气球兵"
            // 扩展至72张：fetch('card_alias.json').then(r => r.json()).then(data => this.cardAlias = data);
        };
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

    // 初始化UI
    initUI() {
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const status = document.getElementById('status');

        startBtn.addEventListener('click', () => this.startListening());
        stopBtn.addEventListener('click', () => this.stopListening());

        this.updateDisplay();
    }

    // 启动实时语音识别（连续模式，临时结果）
    startListening() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('浏览器不支持Web Speech API。请使用Chrome。');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true; // 连续监听
        this.recognition.interimResults = true; // 临时结果处理连续语音
        this.recognition.lang = 'zh-CN'; // 中文识别

        this.recognition.onresult = (event) => {
            let fullText = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                fullText += event.results[i][0].transcript; // 合并结果
            }
            this.processText(fullText); // 处理拆分与匹配
        };

        this.recognition.onerror = (event) => {
            console.error('识别错误：', event.error);
            document.getElementById('status').textContent = '识别中断，重试中...';
        };

        this.recognition.onend = () => {
            if (this.isListening) this.recognition.start(); // 自动重启
        };

        this.recognition.start();
        this.isListening = true;
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
        document.getElementById('status').textContent = '监听中... 喊牌名记录。';
    }

    stopListening() {
        if (this.recognition) this.recognition.stop();
        this.isListening = false;
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        document.getElementById('status').textContent = '已停止。';
    }

    // 处理文本：简单拆分连续语音（空格/常见组合），模糊匹配
    processText(text) {
        const words = text.toLowerCase().trim().split(/\s+|(?=骑士|火球|猪|亡灵)/); // 正则拆分关键词边界
        words.forEach(word => {
            if (!word) return;
            const matchedCard = this.fuzzyMatch(word);
            if (matchedCard) {
                this.recordCard(matchedCard);
            } else {
                console.log(`未记录（识别：'${word}'）。请重试。`); // 日志
            }
        });
    }

    // 模糊匹配（简单Levenshtein-like相似度阈值0.6）
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

    // 简单相似度计算（Jaccard-like，易实现）
    similarity(s1, s2) {
        const set1 = new Set(s1.split(''));
        const set2 = new Set(s2.split(''));
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        return intersection.size / Math.max(set1.size, set2.size);
    }

    // 记录至履带
    recordCard(card) {
        if (this.deck.length >= this.maxSlots) {
            this.deck.shift(); // 顶替最旧
        }
        this.deck.push(card);
        this.saveDeck();
        this.updateDisplay();
        console.log(`记录 → ${card} (置信度: ${this.similarity(card.toLowerCase(), card.toLowerCase())})`); // 调试
    }

    // 更新显示
    updateDisplay() {
        const display = document.getElementById('deckDisplay');
        display.textContent = `当前履带：${this.deck.length ? this.deck.join(' → ') : '空'}`;
    }
}

// 初始化
new DeckTracker();
