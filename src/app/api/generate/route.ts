import { NextResponse } from 'next/server';

// 这里应该使用环境变量存储API密钥
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 简单的内容审核函数
function moderateContent(text: string): boolean {
  // 这里应该实现更复杂的内容审核逻辑
  // 当前仅做简单示例，检查是否包含某些敏感词
  const sensitiveWords = ['政治家', '国家领导人', '种族歧视', '恐怖主义'];
  return !sensitiveWords.some(word => text.includes(word));
}

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    // 获取最新的用户消息作为当前prompt
    const prompt = messages && messages.length > 0 
      ? messages[messages.length - 1].content 
      : '';
    
    // 输入内容审核
    if (!moderateContent(prompt)) {
      return NextResponse.json(
        { error: '输入内容包含敏感词，请调整后重试。' },
        { status: 400 }
      );
    }

    if (!DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: 'API密钥未配置' },
        { status: 500 }
      );
    }

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: [
          {
            role: 'system',
            content: '你是百度贴吧嘴臭老哥,你现在在帮外国网友骂人，网友会给你一些信息。请你根据网友给的信息，来相处攻击性拉满，极致嘴臭的骂人语句。并且要融合语言习惯，融合相应语言的历史典故或者梗，回复相应的语言。'
          },
          // 传递完整的对话历史
          ...(messages || [{
            role: 'user',
            content: prompt
          }]),
        ],
        temperature: 0.8,
        top_p: 0.9,
        max_tokens: 800,
        presence_penalty: 0.6,
        frequency_penalty: 0.5
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('DeepSeek API Error:', error);
      throw new Error(error.error?.message || '调用AI服务失败');
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;

    // 生成内容的审核
    if (!moderateContent(generatedText)) {
      return NextResponse.json(
        { error: '生成的内容不符合社区规范，请重试。' },
        { status: 400 }
      );
    }

    return NextResponse.json({ result: generatedText });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: '服务器处理请求时出错，请稍后重试。' },
      { status: 500 }
    );
  }
}