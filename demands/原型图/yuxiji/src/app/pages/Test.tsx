import { useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Mic,
  MicOff,
  Check,
  X,
  Loader2,
  MessageCircle,
  Send,
  RotateCcw,
  Trophy,
  ChevronRight,
  Volume2,
  AlertCircle,
} from 'lucide-react';
import { mockScenes, mockTests, difficultyConfig, categoryConfig } from '../data/mock-data';
import { TestResult } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { OpenTestDialog } from '../components/OpenTestDialog';

// ————— Helpers —————

const calcSimilarity = (s1: string, s2: string): number => {
  const a = s1.trim().toLowerCase().replace(/[^\w\s]/g, '');
  const b = s2.trim().toLowerCase().replace(/[^\w\s]/g, '');
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.88;
  const w1 = a.split(/\s+/);
  const w2 = b.split(/\s+/);
  const common = w1.filter((w) => w2.includes(w));
  return common.length / Math.max(w1.length, w2.length);
};

const speakText = (text: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US';
    utt.rate = 0.88;
    window.speechSynthesis.speak(utt);
  }
};

// ————— Sub-components —————

function EvaluatingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-white rounded-3xl p-8 text-center w-full max-w-[300px] shadow-2xl"
      >
        <div className="relative h-16 w-16 mx-auto mb-5">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#4F7CF0] to-[#7B5FE8] flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        </div>
        <h3 className="font-semibold text-gray-800 mb-2">AI 正在评测...</h3>
        <p className="text-sm text-gray-400 mb-4">请稍候片刻</p>
        <div className="flex items-center justify-center gap-1.5">
          {[0, 0.15, 0.3].map((delay, i) => (
            <motion.div
              key={i}
              className="h-2 w-2 rounded-full bg-[#4F7CF0]"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.9, repeat: Infinity, delay }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ResultCard({ result }: { result: TestResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border overflow-hidden ${
        result.isCorrect
          ? 'bg-[#F0FFF4] border-[#A7F3D0]'
          : 'bg-[#FFF5F5] border-[#FCA5A5]'
      }`}
    >
      {/* Result Header */}
      <div
        className={`flex items-center gap-3 px-4 py-3 ${
          result.isCorrect ? 'bg-[#DCFCE7]' : 'bg-[#FEE2E2]'
        }`}
      >
        <div
          className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
            result.isCorrect ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
          }`}
        >
          {result.isCorrect ? (
            <Check className="h-4 w-4 text-white" />
          ) : (
            <X className="h-4 w-4 text-white" />
          )}
        </div>
        <div className="flex-1">
          <span className={`font-semibold text-sm ${result.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
            {result.isCorrect ? '回答正确！' : '回答有误'}
          </span>
          <span className={`text-xs ml-2 ${result.isCorrect ? 'text-green-600' : 'text-red-500'}`}>
            得分 {result.score} 分
          </span>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        <p className="text-sm text-gray-700">{result.analysis}</p>

        {result.userAnswer && (
          <div className="bg-white/70 rounded-xl px-3 py-2 text-xs">
            <span className="text-gray-500">你的回答：</span>
            <span className="font-medium text-gray-700 ml-1">{result.userAnswer}</span>
          </div>
        )}

        {!result.isCorrect && result.correctAnswer && (
          <div className="bg-white/70 rounded-xl px-3 py-2 text-xs">
            <span className="text-gray-500">参考答案：</span>
            <span className="font-medium text-[#4F7CF0] ml-1">{result.correctAnswer}</span>
          </div>
        )}

        <div className="bg-white/70 rounded-xl px-3 py-2 text-xs text-gray-600 flex items-start gap-1.5">
          <span className="shrink-0">💡</span>
          <span>{result.suggestion}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ————— Open Conversation Mode —————

interface ConversationViewProps {
  sceneId: string;
  testContext: string;
  onFinish: (result: TestResult) => void;
  onBack: () => void;
}

function ConversationView({ sceneId, testContext, onFinish, onBack }: ConversationViewProps) {
  const [history, setHistory] = useState<Array<{ role: 'ai' | 'user'; text: string }>>([
    {
      role: 'ai',
      text: "Hi there! I'm your AI conversation partner. Let's practice together! 😊 " +
        "Feel free to introduce yourself or respond to me naturally.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const MAX_TURNS = 4;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isThinking]);

  const aiResponses = [
    "That's great to hear! Could you tell me a bit more about yourself?",
    "Interesting! Where are you from originally?",
    "I see! And what do you do for work or study?",
    "Wonderful! It's been great chatting with you. You did really well!",
  ];

  const sendMessage = async (text: string) => {
    if (!text.trim() || isThinking) return;
    setInput('');
    const newHistory = [...history, { role: 'user' as const, text: text.trim() }];
    setHistory(newHistory);
    setIsThinking(true);
    const nextTurn = turnCount + 1;
    setTurnCount(nextTurn);

    await new Promise((r) => setTimeout(r, 1200));

    if (nextTurn >= MAX_TURNS) {
      setIsThinking(false);
      setIsFinished(true);
      return;
    }

    const reply = aiResponses[Math.min(nextTurn, aiResponses.length - 1)];
    setHistory((prev) => [...prev, { role: 'ai', text: reply }]);
    setIsThinking(false);
    speakText(reply);
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别功能（建议使用Chrome浏览器）');
      return;
    }
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setInput(t);
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  const finishConversation = () => {
    onFinish({
      isCorrect: true,
      score: 85,
      analysis: '你完成了完整的英语对话练习！表达流畅，互动自然。',
      suggestion: '继续多练习，尝试使用更多样化的词汇和句型来丰富表达。',
    });
  };

  if (isFinished) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center h-full px-6 py-10 text-center"
      >
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#4F7CF0] to-[#7B5FE8] flex items-center justify-center mb-5 shadow-lg">
          <Trophy className="h-10 w-10 text-white" />
        </div>
        <h3 className="font-semibold text-gray-800 mb-2">对话练习完成！</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          你完成了 {MAX_TURNS} 轮对话练习，表现非常棒！
        </p>
        <div className="space-y-2 w-full">
          <button
            onClick={finishConversation}
            className="w-full h-12 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-2xl font-medium"
          >
            查看评测结果
          </button>
          <button
            onClick={onBack}
            className="w-full h-12 border border-gray-200 text-gray-500 rounded-2xl font-medium text-sm"
          >
            返回题目
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white px-4 pt-5 pb-3 border-b border-gray-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          退出对话
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#4F7CF0] to-[#7B5FE8] flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-gray-800 text-sm">AI 对话伙伴</div>
              <div className="flex items-center gap-1 text-xs text-green-500">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />
                在线
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            {turnCount}/{MAX_TURNS} 轮
          </div>
        </div>

        {/* Context hint */}
        <div className="mt-3 bg-[#EEF2FF] rounded-xl px-3 py-2">
          <p className="text-xs text-[#4F7CF0] leading-relaxed line-clamp-2">{testContext}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {history.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'ai' && (
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#4F7CF0] to-[#7B5FE8] flex items-center justify-center mr-2 shrink-0 mt-0.5">
                <MessageCircle className="h-3.5 w-3.5 text-white" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#4F7CF0] text-white rounded-tr-none'
                  : 'bg-white shadow-sm border border-gray-100 text-gray-700 rounded-tl-none'
              }`}
            >
              {msg.text}
            </div>
            {msg.role === 'user' && (
              <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center ml-2 shrink-0 mt-0.5">
                <span className="text-xs text-gray-500">我</span>
              </div>
            )}
          </motion.div>
        ))}

        {isThinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#4F7CF0] to-[#7B5FE8] flex items-center justify-center mr-2 shrink-0">
              <MessageCircle className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="bg-white shadow-sm border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1.5">
              {[0, 0.15, 0.3].map((d, i) => (
                <motion.div
                  key={i}
                  className="h-2 w-2 rounded-full bg-gray-300"
                  animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.1, 0.8] }}
                  transition={{ duration: 0.7, repeat: Infinity, delay: d }}
                />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
        <div className="flex-1 flex items-center bg-gray-100 rounded-2xl px-3 py-2 gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isThinking && sendMessage(input)}
            placeholder="用英语回复..."
            className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400"
          />
          {isRecording && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="h-2 w-2 rounded-full bg-red-500 shrink-0"
            />
          )}
        </div>
        <button
          onClick={handleVoiceInput}
          disabled={isThinking}
          className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
            isRecording
              ? 'bg-red-500 shadow-lg shadow-red-200'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          {isRecording ? (
            <MicOff className="h-4 w-4 text-white" />
          ) : (
            <Mic className="h-4 w-4 text-gray-500" />
          )}
        </button>
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isThinking}
          className="h-10 w-10 rounded-full bg-[#4F7CF0] flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
        >
          <Send className="h-4 w-4 text-white" />
        </button>
      </div>
    </div>
  );
}

// ————— Main Test Page —————

export default function Test() {
  const { sceneId } = useParams();
  const navigate = useNavigate();
  const scene = mockScenes.find((s) => s.id === sceneId);
  const tests = mockTests.filter((t) => t.sceneId === sceneId).sort((a, b) => a.order - b.order);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [testResults, setTestResults] = useState<Record<number, TestResult>>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [showFinalResult, setShowFinalResult] = useState(false);
  const [conversationMode, setConversationMode] = useState(false);

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
  const currentAnswer = answers[currentIndex] || '';
  const hasAnswered = currentAnswer !== '';
  const currentResult = testResults[currentIndex];
  const hasResult = currentResult !== undefined;

  const typeLabel: Record<string, string> = {
    choice: '选择题',
    fill_blank: '填空题',
    qa: '问答题',
    open: '开放式对话',
  };
  const typeColors: Record<string, string> = {
    choice: 'bg-[#EEF2FF] text-[#4F7CF0]',
    fill_blank: 'bg-[#FFF8EE] text-[#D97706]',
    qa: 'bg-[#F0FFF4] text-[#16A34A]',
    open: 'bg-[#FDF4FF] text-[#9333EA]',
  };

  const handleAnswer = (answer: string) => {
    setAnswers((prev) => ({ ...prev, [currentIndex]: answer }));
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别（建议使用Chrome浏览器）');
      return;
    }
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      handleAnswer(t);
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  // Choice: immediate evaluation (no overlay)
  const handleChoiceSelect = (option: string) => {
    if (hasResult) return;
    handleAnswer(option);
    const isCorrect = option === currentTest.content.answer;
    const result: TestResult = {
      isCorrect,
      score: isCorrect ? 100 : 0,
      analysis: isCorrect
        ? '✓ 选择正确！' + (currentTest.content.explanation ? ` ${currentTest.content.explanation}` : '')
        : `选择有误。${currentTest.content.explanation || ''}`,
      suggestion: isCorrect ? '继续保持，很棒！' : `正确答案是：${currentTest.content.answer}`,
      userAnswer: option,
      correctAnswer: currentTest.content.answer,
    };
    setTestResults((prev) => ({ ...prev, [currentIndex]: result }));
  };

  // Text/QA: async evaluation with overlay
  const evaluateAnswer = async () => {
    if (!currentAnswer.trim()) return;
    setIsEvaluating(true);
    await new Promise((r) => setTimeout(r, 1800));

    const sim = calcSimilarity(currentAnswer, currentTest.content.answer);
    const isCorrect = sim > 0.65;
    const score = Math.round(Math.max(sim, isCorrect ? 0.7 : 0) * 100);

    let analysis = '';
    let suggestion = '';

    if (isCorrect) {
      if (score >= 90) {
        analysis = '非常棒！你的回答非常准确，与参考答案高度吻合。';
        suggestion = score === 100 ? '完美！继续保持！' : '表达很地道，可以尝试更多变体说法。';
      } else {
        analysis = '回答基本正确！意思表达准确，但用词可以更地道。';
        suggestion = `参考更标准的表达：${currentTest.content.answer}`;
      }
    } else {
      analysis = '回答与参考答案有一定差距，请注意关键词的使用。';
      suggestion = currentTest.content.explanation || `参考答案：${currentTest.content.answer}`;
    }

    const result: TestResult = {
      isCorrect,
      score,
      analysis,
      suggestion,
      userAnswer: currentAnswer,
      correctAnswer: currentTest.content.answer,
    };
    setTestResults((prev) => ({ ...prev, [currentIndex]: result }));
    setIsEvaluating(false);
  };

  const handleConversationFinish = (result: TestResult) => {
    setTestResults((prev) => ({ ...prev, [currentIndex]: result }));
    setConversationMode(false);
  };

  const handleNext = () => {
    if (currentIndex < tests.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowFinalResult(true);
    }
  };

  // ——— Final Result ———
  if (showFinalResult) {
    const results = Object.values(testResults);
    const finalScore = results.length
      ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
      : 0;
    const correctCount = results.filter((r) => r.isCorrect).length;

    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-sm p-8 w-full max-w-[430px] text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
            className="h-20 w-20 rounded-full bg-gradient-to-br from-[#4F7CF0] to-[#7B5FE8] flex items-center justify-center mx-auto mb-5 shadow-lg"
          >
            <Trophy className="h-10 w-10 text-white" />
          </motion.div>

          <h2 className="text-gray-800 mb-1">测试完成！</h2>
          <p className="text-sm text-gray-400 mb-8">恭喜你完成了「{scene.name}」场景测试</p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { val: finalScore, unit: '分', label: '综合得分', color: 'text-[#4F7CF0]', bg: 'bg-[#EEF2FF]' },
              { val: correctCount, unit: '题', label: '答对数量', color: 'text-[#22C55E]', bg: 'bg-[#F0FFF4]' },
              { val: tests.length, unit: '题', label: '总题数', color: 'text-[#F59E0B]', bg: 'bg-[#FFFBEB]' },
            ].map(({ val, unit, label, color, bg }) => (
              <div key={label} className={`${bg} rounded-2xl py-4`}>
                <div className={`text-2xl font-semibold ${color}`}>
                  {val}<span className="text-base">{unit}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Score bar */}
          <div className="mb-8">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>答题得分</span>
              <span>{finalScore} / 100</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${finalScore}%` }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
            </div>
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
                setShowFinalResult(false);
              }}
              className="w-full h-12 border border-gray-200 text-gray-600 rounded-2xl font-medium flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              重新测试
            </button>
            <button
              onClick={() => navigate('/scenes')}
              className="w-full h-12 text-gray-400 rounded-2xl font-medium text-sm"
            >
              浏览更多场景
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ——— Conversation Mode ———
  if (conversationMode && currentTest.type === 'open') {
    return (
      <OpenTestDialog
        scene={scene}
        testContext={currentTest.content.context || currentTest.content.question}
        onFinish={handleConversationFinish}
        onBack={() => setConversationMode(false)}
      />
    );
  }

  // ——— Main Test View ———
  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <div className="max-w-[430px] mx-auto px-4 pt-6 pb-10">

        {/* Back + Progress */}
        <div className="flex items-center gap-3 mb-5">
          <Link to={`/scenes/${sceneId}`}>
            <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100 shrink-0">
              <ArrowLeft className="h-4 w-4 text-gray-500" />
            </div>
          </Link>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-700">
                {scene.name}
              </span>
              <span className="text-sm text-gray-400">
                {currentIndex + 1} / {tests.length}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] rounded-full"
                initial={{ width: `${((currentIndex) / tests.length) * 100}%` }}
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
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.28 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4"
          >
            {/* Type Badge */}
            <div className="flex items-center justify-between mb-4">
              <span
                className={`text-xs font-semibold px-3 py-1.5 rounded-full ${typeColors[currentTest.type]}`}
              >
                {typeLabel[currentTest.type]}
              </span>
              {currentTest.type !== 'open' && (
                <button
                  onClick={() => speakText(currentTest.content.question)}
                  className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <Volume2 className="h-3.5 w-3.5 text-gray-500" />
                </button>
              )}
            </div>

            {/* Question */}
            <p className="text-gray-800 text-sm leading-relaxed mb-5 whitespace-pre-line">
              {currentTest.content.question}
            </p>

            {/* ———— Choice ———— */}
            {currentTest.type === 'choice' && (
              <div className="space-y-2.5">
                {currentTest.content.options?.map((option, idx) => {
                  const isSelected = currentAnswer === option;
                  const isCorrectOpt = option === currentTest.content.answer;
                  let optStyle =
                    'border-gray-100 bg-gray-50 text-gray-700 hover:border-[#4F7CF0]/50';
                  if (hasResult) {
                    if (isCorrectOpt)
                      optStyle = 'border-[#22C55E] bg-[#F0FFF4] text-gray-800';
                    else if (isSelected)
                      optStyle = 'border-red-400 bg-red-50 text-gray-700';
                    else optStyle = 'border-gray-100 bg-gray-50 text-gray-400 opacity-60';
                  } else if (isSelected) {
                    optStyle = 'border-[#4F7CF0] bg-[#EEF2FF] text-gray-800';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleChoiceSelect(option)}
                      disabled={!!hasResult}
                      className={`w-full text-left px-4 py-3 rounded-2xl text-sm border-2 transition-all flex items-center gap-3 ${optStyle}`}
                    >
                      <span
                        className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                          hasResult && isCorrectOpt
                            ? 'bg-[#22C55E] text-white'
                            : hasResult && isSelected && !isCorrectOpt
                            ? 'bg-red-400 text-white'
                            : isSelected
                            ? 'bg-[#4F7CF0] text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {hasResult && isCorrectOpt ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : hasResult && isSelected && !isCorrectOpt ? (
                          <X className="h-3.5 w-3.5" />
                        ) : (
                          String.fromCharCode(65 + idx)
                        )}
                      </span>
                      <span className="flex-1">{option}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ———— Fill Blank / QA ———— */}
            {(currentTest.type === 'fill_blank' || currentTest.type === 'qa') && (
              <div className="space-y-3">
                {/* Input Mode Toggle */}
                {!hasResult && (
                  <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl">
                    {(['text', 'voice'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setInputMode(mode)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${
                          inputMode === mode
                            ? 'bg-white shadow-sm text-gray-800'
                            : 'text-gray-400'
                        }`}
                      >
                        {mode === 'text' ? (
                          <>✏️ 文字输入</>
                        ) : (
                          <>🎤 语音输入</>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Text Input */}
                {inputMode === 'text' && !hasResult && (
                  <textarea
                    placeholder={
                      currentTest.type === 'fill_blank'
                        ? '请填入正确答案...'
                        : '请用英语完整回答...'
                    }
                    value={currentAnswer}
                    onChange={(e) => handleAnswer(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#4F7CF0] transition-colors resize-none min-h-[100px] placeholder:text-gray-400"
                  />
                )}

                {/* Voice Input */}
                {inputMode === 'voice' && !hasResult && (
                  <div className="flex flex-col items-center py-4 gap-4">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleVoiceInput}
                      disabled={isRecording}
                      className={`h-20 w-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                        isRecording
                          ? 'bg-red-500 shadow-red-200'
                          : 'bg-gradient-to-br from-[#4F7CF0] to-[#7B5FE8] shadow-blue-200'
                      }`}
                    >
                      {isRecording ? (
                        <motion.div
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        >
                          <MicOff className="h-8 w-8 text-white" />
                        </motion.div>
                      ) : (
                        <Mic className="h-8 w-8 text-white" />
                      )}
                    </motion.button>
                    {isRecording ? (
                      <div className="flex items-center gap-2 text-sm text-red-500">
                        <motion.div
                          className="h-2 w-2 rounded-full bg-red-500"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity }}
                        />
                        正在录音中...
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">
                        {currentAnswer ? '点击重新录音' : '点击开始录音'}
                      </p>
                    )}
                  </div>
                )}

                {/* Answer Preview */}
                {currentAnswer && !hasResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-[#EEF2FF] rounded-2xl px-4 py-3 flex items-start gap-2"
                  >
                    <span className="text-[#4F7CF0] text-sm shrink-0">📝</span>
                    <div>
                      <p className="text-xs text-[#4F7CF0] font-medium mb-0.5">你的答案预览</p>
                      <p className="text-sm text-gray-700">{currentAnswer}</p>
                    </div>
                  </motion.div>
                )}

                {/* Context hint */}
                {currentTest.content.context && !hasResult && (
                  <div className="flex items-start gap-2 bg-[#FFFBEB] rounded-xl px-3 py-2.5">
                    <AlertCircle className="h-4 w-4 text-[#D97706] shrink-0 mt-0.5" />
                    <p className="text-xs text-[#92400E] leading-relaxed">
                      {currentTest.content.context}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ———— Open Conversation ———— */}
            {currentTest.type === 'open' && !hasResult && (
              <div className="text-center py-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#4F7CF0] to-[#7B5FE8] flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <MessageCircle className="h-8 w-8 text-white" />
                </div>
                {currentTest.content.context && (
                  <p className="text-sm text-gray-500 mb-5 leading-relaxed text-left bg-gray-50 rounded-2xl p-4">
                    {currentTest.content.context}
                  </p>
                )}
                <button
                  onClick={() => setConversationMode(true)}
                  className="bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-2xl px-8 py-3 font-medium text-sm w-full shadow-sm"
                >
                  🎯 开始 AI 对话练习
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Result Card */}
        <AnimatePresence>
          {hasResult && (
            <div className="mb-4">
              <ResultCard result={currentResult} />
            </div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {/* Submit button for fill_blank/qa */}
          {!hasResult &&
            hasAnswered &&
            (currentTest.type === 'fill_blank' || currentTest.type === 'qa') && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={evaluateAnswer}
                disabled={isEvaluating}
                className="flex-1 h-12 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-2xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    评测中...
                  </>
                ) : (
                  '提交答案'
                )}
              </motion.button>
            )}

          {/* Next button after result */}
          {hasResult && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleNext}
              className="flex-1 h-12 bg-gradient-to-r from-[#4F7CF0] to-[#7B5FE8] text-white rounded-2xl font-medium flex items-center justify-center gap-1.5 shadow-sm"
            >
              {currentIndex < tests.length - 1 ? (
                <>下一题 <ChevronRight className="h-4 w-4" /></>
              ) : (
                '查看最终结果 🏆'
              )}
            </motion.button>
          )}
        </div>
      </div>

      {/* Evaluating Overlay */}
      <AnimatePresence>
        {isEvaluating && <EvaluatingOverlay />}
      </AnimatePresence>
    </div>
  );
}