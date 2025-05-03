import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const dataPath = path.join(process.cwd(), 'text_data.json');
const raw = fs.readFileSync(dataPath, 'utf8');
const json = JSON.parse(raw);

// ✅ 여기가 핵심 수정 영역입니다
const embedAll = async () => {
  for (let [i, item] of json.entries()) {
    console.log(`🔄 ${i + 1}/${json.length} - "${item.text}" 임베딩 중...`);
    const res = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: item.text
    });
    item.embedding = res.data[0].embedding;
  }

  fs.writeFileSync('text_data.json', JSON.stringify(json, null, 2));
  console.log("✅ 임베딩 추가 완료");
};

embedAll();

