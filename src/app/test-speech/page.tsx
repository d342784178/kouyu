'use client'

/**
 * 语音识别链路测试页面（临时，仅用于调试）
 * 访问：http://localhost:3000/test-speech
 * 手机访问：http://{局域网IP}:3000/test-speech
 */
export default function TestSpeechPage() {
  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>语音识别链路测试</h2>
      <p style={{ color: '#666', fontSize: 14 }}>验证 AudioContext.decodeAudioData() + Azure SDK push stream 完整链路</p>

      <div id="buttons" style={{ margin: '16px 0' }}>
        <button
          onClick={() => (window as any).testAudioContextSupport()}
          style={btnStyle('#2196F3')}
        >1. 检测 AudioContext</button>
        <button
          onClick={() => (window as any).testMediaRecorderSupport()}
          style={btnStyle('#2196F3')}
        >2. 检测 MediaRecorder</button>
        <button
          onClick={() => (window as any).startRecordAndRecognize()}
          style={btnStyle('#4CAF50')}
        >3. 录音并识别</button>
        <button
          onClick={() => (window as any).stopRecording()}
          style={btnStyle('#f44336')}
        >停止录音</button>
      </div>

      <div
        id="log"
        style={{
          background: '#f5f5f5', padding: 12, borderRadius: 8,
          minHeight: 300, fontFamily: 'monospace', fontSize: 13,
          whiteSpace: 'pre-wrap', wordBreak: 'break-all', overflowY: 'auto',
          maxHeight: 500,
        }}
      >
        等待操作...
      </div>

      {/* 内联脚本逻辑 */}
      <script dangerouslySetInnerHTML={{ __html: `
        var mediaRecorder = null;
        var audioChunks = [];
        var mimeType = '';

        function log(msg, type) {
          var el = document.getElementById('log');
          var time = new Date().toLocaleTimeString();
          var color = type === 'ok' ? 'green' : type === 'err' ? 'red' : '#555';
          el.innerHTML += '\\n[' + time + '] <span style="color:' + color + '">' + msg + '</span>';
          el.scrollTop = el.scrollHeight;
        }

        // 页面加载时显示基本信息
        setTimeout(function() {
          log('UA: ' + navigator.userAgent);
          log('isSecureContext: ' + window.isSecureContext);
          log('protocol: ' + location.protocol);
        }, 100);

        window.testAudioContextSupport = function() {
          log('--- 检测 AudioContext ---');
          var AC = window.AudioContext || window.webkitAudioContext;
          if (AC) {
            log('✅ AudioContext 可用: ' + (window.AudioContext ? 'AudioContext' : 'webkitAudioContext'), 'ok');
            try {
              var ctx = new AC();
              log('✅ 实例创建成功，sampleRate: ' + ctx.sampleRate, 'ok');
              ctx.close();
            } catch(e) {
              log('❌ 实例创建失败: ' + e.message, 'err');
            }
          } else {
            log('❌ AudioContext 不可用', 'err');
          }
        };

        window.testMediaRecorderSupport = function() {
          log('--- 检测 MediaRecorder ---');
          if (!window.MediaRecorder) { log('❌ MediaRecorder 不可用', 'err'); return; }
          log('✅ MediaRecorder 可用', 'ok');
          var formats = [
            'audio/wav', 'audio/webm;codecs=pcm', 'audio/webm;codecs=opus',
            'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4',
          ];
          formats.forEach(function(fmt) {
            var ok = MediaRecorder.isTypeSupported(fmt);
            log('  ' + (ok ? '✅' : '❌') + ' ' + fmt, ok ? 'ok' : 'err');
          });
        };

        window.startRecordAndRecognize = function() {
          log('--- 开始录音 ---');
          audioChunks = [];
          navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
            log('✅ 麦克风权限获取成功', 'ok');
            mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
              ? 'audio/webm;codecs=opus'
              : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
            log('MIME 类型: ' + mimeType);

            mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
            mediaRecorder.ondataavailable = function(e) {
              if (e.data && e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = function() {
              log('录音停止，处理中...');
              stream.getTracks().forEach(function(t) { t.stop(); });
              var blob = new Blob(audioChunks, { type: mimeType });
              log('录音大小: ' + blob.size + ' bytes');

              // 步骤1：AudioContext.decodeAudioData
              log('步骤1: decodeAudioData...');
              var AC = window.AudioContext || window.webkitAudioContext;
              var ctx = new AC();
              blob.arrayBuffer().then(function(ab) {
                log('ArrayBuffer: ' + ab.byteLength + ' bytes');
                return ctx.decodeAudioData(ab);
              }).then(function(decoded) {
                log('✅ decodeAudioData 成功! 采样率:' + decoded.sampleRate + ' 时长:' + decoded.duration.toFixed(2) + 's', 'ok');

                // 步骤2：转 PCM Int16 16kHz
                log('步骤2: 转 PCM Int16 16kHz...');
                var targetSR = 16000;
                var src = decoded.getChannelData(0);
                var ratio = decoded.sampleRate / targetSR;
                var len = Math.floor(src.length / ratio);
                var pcm = new Int16Array(len);
                for (var i = 0; i < len; i++) {
                  var s = Math.max(-1, Math.min(1, src[Math.floor(i * ratio)]));
                  pcm[i] = s < 0 ? s * 32768 : s * 32767;
                }
                log('✅ PCM: ' + pcm.byteLength + ' bytes (' + (pcm.byteLength/2/16000).toFixed(2) + 's)', 'ok');

                // 步骤3：发送到后端
                log('步骤3: POST /api/speech/recognize...');
                var fd = new FormData();
                fd.append('audio', new Blob([pcm.buffer], { type: 'audio/pcm' }), 'recording.pcm');
                fd.append('sampleRate', '16000');
                var t0 = Date.now();
                return fetch('/api/speech/recognize', { method: 'POST', body: fd })
                  .then(function(res) {
                    log('HTTP ' + res.status + ' (' + (Date.now()-t0) + 'ms)');
                    if (!res.ok) return res.text().then(function(t) { throw new Error('HTTP ' + res.status + ': ' + t.substring(0,200)); });
                    return res.json();
                  })
                  .then(function(result) {
                    log('响应: ' + JSON.stringify(result));
                    if (result.transcript) {
                      log('✅ 识别结果: ' + result.transcript, 'ok');
                    } else {
                      log('⚠️ 未识别到语音: ' + (result.error || 'NoMatch'), 'err');
                    }
                  });
              }).catch(function(e) {
                log('❌ 失败: ' + e.name + ': ' + e.message, 'err');
                console.error(e);
              }).finally(function() {
                ctx.close();
              });
            };

            mediaRecorder.start(1000);
            log('✅ 录音中... 请说话，然后点击"停止录音"', 'ok');
          }).catch(function(e) {
            log('❌ 启动失败: ' + e.name + ': ' + e.message, 'err');
          });
        };

        window.stopRecording = function() {
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            log('停止录音指令已发送');
          } else {
            log('没有正在进行的录音');
          }
        };
      ` }} />
    </div>
  )
}

function btnStyle(bg: string) {
  return {
    padding: '10px 16px', margin: '4px', fontSize: 14,
    cursor: 'pointer', borderRadius: 8, border: 'none',
    background: bg, color: 'white', display: 'inline-block',
  } as const
}
