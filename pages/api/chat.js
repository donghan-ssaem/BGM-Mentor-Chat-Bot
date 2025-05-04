import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';

function cosineSimilarity(vec1, vec2) {
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const normA = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (normA * normB);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    const dataPath = path.join(process.cwd(), 'text_data.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const textData = JSON.parse(rawData);

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: question
    });
    const questionEmbedding = embeddingResponse.data[0].embedding;

    const scored = textData.map(item => ({
      text: item.text,
      score: cosineSimilarity(questionEmbedding, item.embedding)
    }));
    const topTexts = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.text);

    let systemPrompt = '';
    let userPrompt = '';

    if (topTexts.length > 0 && scored[0].score > 0.75) {
      // 벡터 유사도 높은 자료가 있을 때 → 지도서 기반 답변
      systemPrompt = '너는 초등학교 수학 지도서를 바탕으로 질문에 답하는 수학 전문 챗봇이야.';
      userPrompt = `질문: ${question}\n\n지도서 발췌 내용:\n${topTexts.join('\n---\n')}`;
    } else {
      // 벡터 검색 결과가 불충분할 경우 → 일반 답변으로 fallback
      systemPrompt = '너는 친절하고 지적인 AI 챗봇이야. 초등학생이나 선생님이 이해할 수 있도록 설명해줘.';
      userPrompt = `질문: ${question}`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    return res.status(200).json({ answer: completion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
