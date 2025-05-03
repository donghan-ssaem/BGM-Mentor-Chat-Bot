// pages/api/chat.js

import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';
import faiss from 'faiss-node'; // 로컬 FAISS 라이브러리 사용
import * as readline from 'readline';
import pickle from 'picklejs'; // 텍스트 pkl 로드용 라이브러리

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Missing question' });
  }

  try {
    // 1. 인덱스 및 텍스트 데이터 불러오기
    const indexPath = path.resolve('./index_file.index');
    const pklPath = path.resolve('./text_data.pkl');
    const index = await faiss.readIndex(indexPath);
    const textData = pickle.load(fs.readFileSync(pklPath));

    // 2. 질문을 벡터화
    const embed = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: question
    });
    const queryVector = embed.data[0].embedding;

    // 3. 관련 텍스트 찾기
    const { distances, labels } = await index.search(queryVector, 5);
    const relatedTexts = labels.map(i => textData[i]).filter(Boolean);

    // 4. GPT에 질문 + 관련 문서 같이 전달
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '너는 초등학교 수학 지도서를 기반으로만 대답해야 해.' },
        { role: 'user', content: `질문: ${question}\n\n관련 문서:\n${relatedTexts.join('\n---\n')}` }
      ]
    });

    return res.status(200).json({ answer: completion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
