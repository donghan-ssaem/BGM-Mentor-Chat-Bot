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
    const jsonUrl = 'https://drive.google.com/uc?export=download&id=1u1gnMOKjxfSHuf7ySBzWHvC_N85Sxdgu';
    const response = await fetch(jsonUrl);
    const textData = await response.json();    
    

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
      
      const SIMILARITY_THRESHOLD = 0.75;
      const bestScore = scored[0]?.score || 0;
      
      if (topTexts.length > 0 && bestScore > SIMILARITY_THRESHOLD) {
        systemPrompt = '너는 초등 수학 지도서를 참고하여 질문에 답하는 챗봇이야. 질문에 대해 초등학생이 이해할 수 있게 핵심만 간단히 말해줘. 설명이 너무 길어지지 않도록 주의해. 하지만 질문과 지도서 내용이 정확히 일치하지 않으면, 일반적인 설명도 함께 해줘. 한 번의 응답은 180자 이내로 제한해줘.';
        userPrompt = `질문: ${question}\n\n참고 가능한 지도서 내용:\n${topTexts.join('\n---\n')}`;
      } else {
        systemPrompt = '너는 친절하고 지적인 AI 챗봇이야. 초등학생이나 선생님이 이해할 수 있도록 설명하되, 핵심만 간단히 말해줘.';
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
    console.error('❌ 오류 발생:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
