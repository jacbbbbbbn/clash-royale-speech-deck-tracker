from flask import Flask, request, jsonify
import websocket
import json
import base64
import hashlib
import hmac
import time
import threading
from flask_cors import CORS  # 允许跨域，若需pip install flask-cors

app = Flask(__name__)
CORS(app)  # 启用CORS

# iFlyTek 配置（替换为您的凭证）
APPID = "your_appid_here"
APIKEY = "your_api_key_here"
APISECRET = "your_api_secret_here"
HOST = "iat-api.xfyun.cn"
URI = "/v2/iat"

def generate_auth():
    """生成认证参数"""
    cur_time = str(int(time.time()))
    param = '{"common":{"app_id":%s},"business":{"language":"zh_en","domain":"iat","accent":"mandarin"}}' % APPID
    param_base64 = base64.b64encode(param.encode()).decode()
    m = hashlib.md5()
    signa = '%s%s%s' % (APIKEY, cur_time, param_base64)
    m.update(signa.encode())
    checksum = m.hexdigest()
    return cur_time, param_base64, checksum

@app.route('/')
def index():
    return app.send_static_file('index.html')  # 服务前端

@app.route('/recognize', methods=['POST'])
def recognize():
    try:
        data = request.json
        audio_base64 = data['audio']
        audio_bytes = base64.b64decode(audio_base64)
        
        # WebSocket连接
        def on_message(ws, message):
            result = json.loads(message)
            if 'data' in result:
                text = result['data']
                ws.close()
                return text
        
        def on_error(ws, error):
            print(f"错误: {error}")
            ws.close()
        
        def on_close(ws, close_status_code, close_msg):
            pass
        
        def on_open(ws):
            cur_time, param_base64, checksum = generate_auth()
            auth = f"X-Appid={APPID}&X-CurTime={cur_time}&X-Param={param_base64}&X-CheckSum={checksum}"
            ws_url = f"ws://{HOST}{URI}?{auth}"
            
            # 发送开始
            ws.send(json.dumps({
                "common": {"app_id": APPID},
                "business": {"language": "zh_en", "domain": "iat", "accent": "mandarin"},
                "data": {"status": 2, "format": "audio/L16;rate=16000", "audio": "", "encoding": "raw"}
            }))
            
            # 发送音频（假设16kHz PCM，需前端匹配）
            ws.send(json.dumps({
                "data": {"status": 3, "format": "audio/L16;rate=16000", "audio": base64.b64encode(audio_bytes).decode(), "encoding": "raw"}
            }))
            
            # 发送结束
            ws.send(json.dumps({
                "data": {"status": 4, "format": "audio/L16;rate=16000", "audio": "", "encoding": "raw"}
            }))
        
        ws = websocket.WebSocketApp("", on_message=on_message, on_error=on_error, on_close=on_close)
        ws.on_open = on_open
        ws.run_forever(ping_interval=30, ping_timeout=10)
        
        # 等待结果（简化，实际可使用队列）
        text = "识别结果"  # 占位，实际从on_message返回
        return jsonify({'text': text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
