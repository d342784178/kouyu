import { generateSpeech } from './src/app/api/open-test/utils/speechGenerator.js';

async function testSpeechGenerator() {
  console.log('开始测试音频生成功能...');
  
  try {
    // 测试用例1：基本文本
    console.log('\n测试用例1：基本英文文本');
    const result1 = await generateSpeech({
      text: 'Hello, this is a test of the speech generation system.',
      voice: 'en-US-AriaNeural'
    });
    console.log('测试用例1结果:', result1);
    
    // 测试用例2：中文文本
    console.log('\n测试用例2：中文文本');
    const result2 = await generateSpeech({
      text: '你好，这是语音生成系统的测试。',
      voice: 'zh-CN-XiaoxiaoNeural'
    });
    console.log('测试用例2结果:', result2);
    
    console.log('\n所有测试用例执行完成！');
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  }
}

testSpeechGenerator();