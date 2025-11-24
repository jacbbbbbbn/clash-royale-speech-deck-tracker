# 皇室战争语音记牌器 (Clash Royale Speech Deck Tracker)

## 项目概述
这是一个极简Web应用，用于《皇室战争》对战中通过语音记录对手卡组。用户喊出牌名（如“骑士”），系统立即记录至8槽履带队列，满8张后自动循环顶替。支持实时语音识别、中断恢复及模糊匹配。

## 功能特性
- **实时语音输入**：浏览器麦克风监听，关键词出现即记录。
- **8槽履带**：固定队列，满后无缝循环。
- **持久化**：localStorage保存状态，重载恢复。
- **优化**：模糊匹配（阈值0.6）、连续语音拆分、未匹配日志（控制台）。

## 使用指南
1. 克隆仓库：`git clone https://github.com/your-username/clash-royale-speech-deck-tracker.git`
2. 打开`index.html`（推荐Chrome，需允许麦克风）。
3. 点击“启动监听”按钮，对着麦克风喊牌名（e.g., “骑士 火球”）。
4. 查看实时履带显示；中断后刷新页面恢复状态。
5. 测试：控制台（F12）查看日志。

## 技术栈
- **前端**：HTML5, CSS3, JavaScript (ES6+)
- **语音API**：Web Speech API (SpeechRecognition)
- **存储**：localStorage
- **兼容**：现代浏览器（HTTPS环境）

## 扩展建议
- 扩展`card_alias.json`至72张牌。
- 自定义阈值或添加音效反馈（不影响核心）。

## 许可
MIT License. 作者：[您的名称]，2025年11月。

## 贡献
欢迎PR优化匹配算法或UI。
