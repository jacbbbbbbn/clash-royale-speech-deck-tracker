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
            console.error('加载卡牌库失败，使用默认');
            this.cardAlias = {
                "骑士": "骑士", "火球": "火球", "猪": "皇家猪", "亡灵": "骷髅军团"
                // 完整库从JSON加载
            };
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

    // 启动实时语音识别（持续监听，权限预检查）
    startListening() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('浏览器不支持Web Speech API。请使用Google Chrome。');
            return;
        }

        // 权限预检查
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => {
                console.log('麦克风权限已授予，继续启动识别。');
                this.initRecognition();
            })
            .catch((err) => {
                console.error('麦克风权限被拒绝：', err);
                alert('请在浏览器设置中允许麦克风访问，然后重试。');
            });
    }

    // 初始化识别（持续监听核心）
    initRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true; // 持续监听
        this.recognition.interimResults = true; // 启用临时结果，处理短句拆分
        this.recognition.lang = 'zh-CN';

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
            document.getElementById('status').textContent = '识别中断，重试中...';
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
        document.getElementById('status').textContent = '持续监听中... 喊牌名立即记录。';
    }

    stopListening() {
        if (this.recognition) this.recognition.stop();
        this.isListening = false;
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        document.getElementById('status').textContent = '已停止监听。';
    }

    // 处理文本：拆分短句，避免合并（基于空格或关键词边界）
    processText(text) {
        // 增强拆分：使用正则匹配独立关键词，防止短句融合
        const words = text.toLowerCase().trim().split(/\s+|(?=(骑士|火球|猪|亡灵|哥布林|法师|巨人|公主|野猪|骷髅|弓箭手|炸弹兵|蝙蝠|皇家巨人|冰雪精灵|哥布林团伙|野蛮人精锐|亡灵大军|雷电精灵|烟花炮手|迷你皮卡|火枪手|瓦基丽武神|重甲亡灵|野蛮人攻城槌|法师|野猪骑士|飞行器|皇家野猪|三个火枪手|戈仑冰人|吹箭哥布林|电击车小队|治疗精灵|圣水戈仑|战斗天使|飞龙宝宝|骷髅军团|骷髅巨人|皮卡超人|攻城炸弹人|女巫|气球兵|黑暗王子|王子|哥布林巨人|猎人|戈仑石人|雷电飞龙|雷电巨人|骷髅守卫|巨石投手|飞斧屠夫|加农炮战车|掘地矿工|公主|超级骑士|寒冰法师|地狱飞龙|蛮羊骑士|熔岩猎犬|闪电法师|电磁炮|皇家幽灵|神箭游侠|幻影刺客|暗夜女巫|狂暴樵夫|女巫婆婆|渔夫|弓箭女皇|黄金圣骑|骷髅帝王|万箭齐发|电击法术|大雪球|皇家速递|火球|火箭|地震法术|野蛮人滚桶|哥布林飞桶|雷电法术|冰冻法术|伤害药水法术|镜像法术|狂暴法术|克隆法术|飓风法术|滚木|骷髅召唤|加农炮|迫击炮|特斯拉电磁塔|哥布林牢笼|骷髅墓碑|地狱之塔|哥布林小屋|烈焰熔炉|炸弹塔|圣水收集器|野蛮人小屋|十字连弩|跨桥炮|哥布林钻机))/g);
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

    // 立即记录至履带（新增：相邻重复检测）
    recordCard(card) {
        // 新增功能：检测相邻重复，若末尾相同则跳过添加
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
