import pickle
import json

# .pkl 파일 열기
with open('text_data.pkl', 'rb') as f:
    data = pickle.load(f)

# 리스트 그대로 텍스트 배열로 변환
json_data = [{"text": text} for text in data]

# 저장
with open('text_data.json', 'w', encoding='utf-8') as f:
    json.dump(json_data, f, ensure_ascii=False, indent=2)

print("✅ 변환 완료: text_data.json 생성됨")
