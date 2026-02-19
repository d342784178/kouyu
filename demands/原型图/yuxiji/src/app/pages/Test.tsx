import { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Mic,
  Check,
  X,
  Loader2,
  MessageCircle,
  Send,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { mockScenes, mockTests } from '../data/mock-data';
import { TestResult } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function Test() {
  const { sceneId } = useParams();
  const navigate = useNavigate();
  const scene = mockScenes.find((s) => s.id === sceneId);
  const tests = mockTests.filter((t) => t.sceneId === sceneId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [testResults, setTestResults] = useState<Record<number, TestResult>>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [conversationMode, setConversationMode] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: 'ai' | 'user'; text: string }>
  >([]);
  const [chatInput, setChatInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (!scene || tests.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm w-full max-w-[430px]">
          <div className="text-4xl mb-4">📝</div>
          <p className="text-gray-500 mb-4">暂无测试题</p>
          <Link to="/scenes">
            <button className="bg-[#4F7CF0] text-white rounded-2xl px-6 py-3 text-sm font-medium">
              返回场景列表
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const currentTest = tests[currentIndex];
  const progressPct = ((currentIndex + 1) / tests.length) * 100;
  const hasAnswered = answers[currentIndex] !== undefined && answers[currentIndex] !== '';
  const hasResult = testResults[currentIndex] !== undefined;

  const handleAnswer = (answer: string) => {
    setAnswers({ ...answers, [currentIndex]: answer });
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别');
      return;
    }
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      handleAnswer(transcript);
      setIsRecording(false);
    };
    recognition.onerror = () => {
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  const evaluateAnswer = async () => {
    setIsEvaluating(true);
    await new Promise((r) => setTimeout(r, 1800));
    const userAnswer = answers[currentIndex] || '';
    const correctAnswer = currentTest.content.answer;
    let result: TestResult;

    if (currentTest.type === 'choice') {
      const isCorrect = userAnswer === correctAnswer;
      result = {
        isCorrect,
        score: isCorrect ? 100 : 0,
        analysis: isCorrect ? '回答正确！您已掌握这个知识点。' : `正确答案是：${correctAnswer}`,
        suggestion: isCorrect ? '继续保持，很棒！' : '建议重新学习这部分对话内容。',
        userAnswer,
        correctAnswer,
      };
    } else {
      const sim = calcSimilarity(userAnswer.toLowerCase(), correctAnswer.toLowerCase());
      const isCorrect = sim > 0.7;
      const score = Math.round(sim * 100);
      result = {
        isCorrect,
        score,
        analysis: isCorrect ? '很好！您的回答基本准确。' : '您的回答与标准答案有一定差距。',
        suggestion: isCorrect
          ? score < 90
            ? '可以尝试更地道的表达方式。'
            : '完美！'
          : `参考标准答案：${correctAnswer}`,
        userAnswer,
        correctAnswer,
      };
    }
    setTestResults({ ...testResults, [currentIndex]: result });
    setIsEvaluating(false);
  };

  const calcSimilarity = (s1: string, s2: string): number => {
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.85;
    const w1 = s1.split(/\s+/);
    const w2 = s2.split(/\s+/);
    const common = w1.filter((w) => w2.includes(w));
    return common.length / Math.max(w1.length, w2.length);
  };

  const handleNext = () => {
    if (currentIndex < tests.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowResult(true);
    }
  };

  const startConversation = () => {
    setConversationMode(true);
    setConversationHistory([
      {
        role: 'ai',
        text: "Hi! I'm your AI conversation partner. Let's start practicing! 😊",
      },
    ]);
  };

  const sendMessage = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatInput('');
    const newHistory = [...conversationHistory, { role: 'user' as const, text: msg }];
    setConversationHistory(newHistory);
    setTimeout(() => {
      const responses = [
        "That's great! Can you tell me more about that?",
        "I see! How do you feel about it?",
        "Wonderful! Keep up the good work!",
        "Interesting! What else would you like to share?",
        "That makes sense. Have you tried anything else?",
      ];
      const aiReply = responses[Math.floor(Math.random() * responses.length)];
      setConversationHistory((prev) => [...prev, { role: 'ai', text: aiReply }]);
    }, 1000);
  };

  const calcFinalScore = () => {
    const results = Object.values(testResults);
    if (!results.length) return 0;
    return Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
  };

  // Final Result Screen
  if (showResult) {
    const finalScore = calcFinalScore();
    const correctCount = Object.values(testResults).filter((r) => r.isCorrect).length;
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-sm p-8 w-full max-w-[430px] text-center"
        >
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#4F7CF0] to-[#7B5FE8] flex items-center justify-center mx-auto mb-5">
            <Trophy className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-gray-800 mb-1">测试完成！</h2>
          <p className="text-sm text-gray-400 mb-8">恭喜你完成了「{scene.name}」场景测试</p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { val: finalScore, label: '综合得分', color: 'text-[#4F7CF0]', bg: 'bg-[#EEF2FF]' },
              { val: correctCount, label: '答对题数', color: 'text-[#34D399]', bg: 'bg-[#F0FFF4]' },
              { val: tests.length, label: '总题数', color: 'text-[#F59E0B]', bg: 'bg-[#FFFBEB]' },
            ].map(({ val, label, color, bg }) => (
              <div key={label} className={`${bg} rounded-2xl p-4`}>
                <div className={`text-2xl font-semibold ${color}`}>{val}</div>
                <div className="text-xs text-gray-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => navigate(`/scenes/${sceneId}`)}
              className="w-full h-12 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-2xl font-medium"
            >
              返回场景详情
            </button>
            <button
              onClick={() => {
                setCurrentIndex(0);
                setAnswers({});
                setTestResults({});
                setShowResult(false);
              }}
              className="w-full h-12 border border-gray-200 text-gray-600 rounded-2xl font-medium flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              重新测试
            </button>
            <button
              onClick={() => navigate('/scenes')}
              className="w-full h-12 text-gray-400 rounded-2xl font-medium"
            >
              浏览更多场景
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Conversation Mode
  if (conversationMode && currentTest.type === 'open') {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex flex-col max-w-[430px] mx-auto">
        {/* Header */}
        <div className="bg-white px-4 pt-6 pb-4 border-b border-gray-100">
          <button
            onClick={() => setConversationMode(false)}
            className="flex items-center gap-1.5 text-sm text-gray-500 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            退出对话
          </button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#4F7CF0] to-[#7B5FE8] flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-gray-800 text-sm">AI 对话伙伴</div>
              <div className="text-xs text-green-400">● 在线</div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
          {conversationHistory.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#4F7CF0] text-white rounded-tr-none'
                    : 'bg-white shadow-sm border border-gray-100 text-gray-700 rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Input */}
        <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
          <input
            ref={inputRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="输入回复..."
            className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-sm outline-none text-gray-700 placeholder:text-gray-400"
          />
          <button
            onClick={handleVoiceInput}
            className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              isRecording ? 'bg-red-500' : 'bg-gray-100'
            }`}
          >
            <Mic className={`h-4 w-4 ${isRecording ? 'text-white animate-pulse' : 'text-gray-500'}`} />
          </button>
          <button
            onClick={sendMessage}
            disabled={!chatInput.trim()}
            className="h-10 w-10 rounded-full bg-[#4F7CF0] flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            <Send className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
    );
  }

  // Main Test View
  const typeLabel: Record<string, string> = {
    choice: '选择题',
    fill_blank: '填空题',
    qa: '问答题',
    open: '开放式对话',
  };
  const typeColors: Record<string, string> = {
    choice: 'bg-[#EEF2FF] text-[#4F7CF0]',
    fill_blank: 'bg-[#FFF8EE] text-[#F59E0B]',
    qa: 'bg-[#F0FFF4] text-[#34D399]',
    open: 'bg-[#FFF0F5] text-[#EC4899]',
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] pb-6">
      <div className="max-w-[430px] mx-auto px-4 pt-6">
        {/* Back + Progress */}
        <div className="flex items-center gap-3 mb-5">
          <Link to={`/scenes/${sceneId}`}>
            <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100">
              <ArrowLeft className="h-4 w-4 text-gray-500" />
            </div>
          </Link>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">
                题目 {currentIndex + 1} / {tests.length}
              </span>
              <span className="text-sm text-gray-400">{Math.round(progressPct)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4"
          >
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${typeColors[currentTest.type]}`}>
              {typeLabel[currentTest.type]}
            </span>

            <h3 className="text-gray-800 mt-4 mb-5 leading-relaxed">
              {currentTest.content.question}
            </h3>

            {/* Choice */}
            {currentTest.type === 'choice' && (
              <div className="space-y-2.5">
                {currentTest.content.options?.map((option, idx) => {
                  const isSelected = answers[currentIndex] === option;
                  return (
                    <button
                      key={idx}
                      onClick={() => !hasResult && handleAnswer(option)}
                      disabled={hasResult}
                      className={`w-full text-left px-4 py-3.5 rounded-2xl text-sm border-2 transition-all flex items-center gap-3 ${
                        isSelected && hasResult
                          ? testResults[currentIndex]?.isCorrect
                            ? 'border-[#34D399] bg-[#F0FFF4] text-gray-700'
                            : 'border-red-400 bg-red-50 text-gray-700'
                          : isSelected
                          ? 'border-[#4F7CF0] bg-[#EEF2FF] text-gray-700'
                          : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-[#4F7CF0]'
                      }`}
                    >
                      <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                        isSelected ? 'bg-[#4F7CF0] text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Fill Blank / QA */}
            {(currentTest.type === 'fill_blank' || currentTest.type === 'qa') && (
              <div className="space-y-3">
                <textarea
                  placeholder="请输入你的答案..."
                  value={answers[currentIndex] || ''}
                  onChange={(e) => handleAnswer(e.target.value)}
                  disabled={hasResult}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#4F7CF0] transition-colors resize-none min-h-[100px] placeholder:text-gray-400"
                />
                <button
                  onClick={handleVoiceInput}
                  disabled={hasResult || isRecording}
                  className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-2xl border transition-all ${
                    isRecording
                      ? 'bg-red-50 border-red-200 text-red-500'
                      : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-[#4F7CF0] hover:text-[#4F7CF0]'
                  }`}
                >
                  <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
                  {isRecording ? '正在录音...' : '语音输入'}
                </button>
              </div>
            )}

            {/* Open Conversation */}
            {currentTest.type === 'open' && !conversationMode && (
              <div className="text-center py-6">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#4F7CF0] to-[#7B5FE8] flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-white" />
                </div>
                {currentTest.content.context && (
                  <p className="text-sm text-gray-400 mb-5 leading-relaxed">{currentTest.content.context}</p>
                )}
                <button
                  onClick={startConversation}
                  className="bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-2xl px-8 py-3 font-medium text-sm"
                >
                  开始 AI 对话练习
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Result Card */}
        <AnimatePresence>
          {hasResult && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className={`rounded-2xl p-4 mb-4 border ${
                testResults[currentIndex].isCorrect
                  ? 'bg-[#F0FFF4] border-[#A7F3D0]'
                  : 'bg-[#FFF5F5] border-[#FCA5A5]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                    testResults[currentIndex].isCorrect ? 'bg-[#34D399]' : 'bg-red-400'
                  }`}
                >
                  {testResults[currentIndex].isCorrect ? (
                    <Check className="h-5 w-5 text-white" />
                  ) : (
                    <X className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 mb-1">
                    {testResults[currentIndex].isCorrect ? '回答正确！' : '回答错误'}{' '}
                    <span className="text-sm font-normal text-gray-500">
                      得分：{testResults[currentIndex].score}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{testResults[currentIndex].analysis}</p>
                  {!testResults[currentIndex].isCorrect && (
                    <div className="text-sm">
                      <span className="text-gray-500">参考答案：</span>
                      <span className="font-medium text-gray-700">{testResults[currentIndex].correctAnswer}</span>
                    </div>
                  )}
                  <div className="mt-2 bg-white/70 rounded-xl px-3 py-2 text-xs text-gray-500">
                    💡 {testResults[currentIndex].suggestion}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!hasResult && hasAnswered && currentTest.type !== 'open' && (
            <button
              className="flex-1 h-12 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-2xl font-medium disabled:opacity-50"
              onClick={evaluateAnswer}
              disabled={isEvaluating}
            >
              提交答案
            </button>
          )}
          {hasResult && (
            <button
              className="flex-1 h-12 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-2xl font-medium"
              onClick={handleNext}
            >
              {currentIndex < tests.length - 1 ? '下一题 →' : '查看结果'}
            </button>
          )}
        </div>

        {/* Explanation hint */}
        {currentTest.content.explanation && !hasResult && currentTest.type === 'fill_blank' && (
          <div className="mt-4 bg-[#FFF8EE] rounded-2xl p-3 text-xs text-[#92400E]">
            <span className="font-medium">提示：</span>{currentTest.content.context}
          </div>
        )}
      </div>

      {/* AI Evaluating Overlay */}
      <AnimatePresence>
        {isEvaluating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="bg-white rounded-2xl p-8 text-center mx-6 shadow-xl"
            >
              <Loader2 className="h-12 w-12 animate-spin text-[#4F7CF0] mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 mb-1">AI 正在评测...</h3>
              <p className="text-sm text-gray-400">请稍候片刻</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
