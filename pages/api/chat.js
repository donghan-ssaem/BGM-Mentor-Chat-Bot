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

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '너는 초등학교 수학 지도서를 기반으로만 대답해야 해.' },
        { role: 'user', content: `질문: ${question}\n\n관련 문서:\n${topTexts.join('\n---\n')}` }
      ]
    });

    return res.status(200).json({ answer: completion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
