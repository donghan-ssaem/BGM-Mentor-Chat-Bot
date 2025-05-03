import fs from 'fs';
import path from 'path';
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// 🔄 텍스트 데이터 불러오기
const textDataPath = path.resolve(process.cwd(), 'text_data.pkl');
let textData = [];

try {
  const raw = fs.readFileSync(textDataPath);
  textData = JSON.parse(raw.toString());
} catch (e) {
  console.error("❌ 텍스트 데이터 로딩 실패", e);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  // 지도서 내용 일부 활용 (임시로 앞 5개 청크)
  const context = textData.slice(0, 5).join('\n\n');

  const prompt = `너는 초등학교 수학 지도서만 기반으로 대답하는 AI 튜터야.\n\n[지도서 내용]\n${context}\n\n[질문]\n${query}\n\n[답변]`;

  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '너는 지도서 내용만 바탕으로 답변하는 AI 튜터야.' },
        { role: 'user', content: prompt }
      ]
    });

    const answer = completion.data.choices[0].message.content;
    res.status(200).json({ answer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
