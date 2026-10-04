import { useEffect, useMemo, useState } from 'react';
import { buildReflectionPrompt, renderSchemaText } from '../domain/reflectionPrompt';
import { buildFunSchema } from '../domain/schema';
import type { ActionCard } from '../domain/types';
import { navigate } from '../router';
import { cardRepository } from '../storage';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SchemaPage() {
  const [cards, setCards] = useState<ActionCard[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    cardRepository.list().then(setCards);
  }, []);

  const schema = useMemo(() => (cards ? buildFunSchema(cards) : null), [cards]);
  const prompt = useMemo(() => (schema ? buildReflectionPrompt(schema) : ''), [schema]);

  if (!schema) return <main className="schema-page">불러오는 중…</main>;

  const { summary } = schema;
  const empty = summary.actionCards === 0;

  async function handleCopy(text: string, done: string) {
    const ok = await copyText(text);
    setNotice(ok ? done : '복사하지 못했어요. 아래 내용을 직접 선택해서 복사해 주세요.');
  }

  function handleDownload() {
    const date = schema!.exportedAt.slice(0, 10);
    downloadJson(schema, `fun-schema-${date}.json`);
    setNotice('재미 도식 데이터를 내려받았어요.');
  }

  return (
    <main className="schema-page">
      <button className="back" onClick={() => navigate('/')}>
        ← 목록
      </button>
      <h1>내 재미 도식</h1>
      <p className="subtitle">
        카드들을 모으면 나만의 재미 도식이 됩니다. 이것을 AI에게 건네, 내가 어떤 존재로 살기를 선택하고 있는지
        돌아보세요.
      </p>

      {empty ? (
        <p className="empty">아직 행동 카드가 없어요. 카드를 만들고 재미까지 이어 본 다음 다시 와 주세요.</p>
      ) : (
        <>
          <dl className="stats">
            <div>
              <dt>재미에 닿은 행동</dt>
              <dd>
                {summary.connectedCards} / {summary.actionCards}
              </dd>
            </div>
            <div>
              <dt>감정 박스</dt>
              <dd>{summary.emotionBoxes}</dd>
            </div>
            <div>
              <dt>효용 박스</dt>
              <dd>{summary.utilityBoxes}</dd>
            </div>
            <div>
              <dt>돈을 거친 행동</dt>
              <dd>{summary.viaMoneyCards}</dd>
            </div>
            {summary.worryCards > 0 && (
              <div>
                <dt>그럼에도에 닿은 걱정</dt>
                <dd>
                  {summary.resolvedWorryCards} / {summary.worryCards}
                </dd>
              </div>
            )}
          </dl>

          <div className="actions">
            <button type="submit" onClick={() => handleCopy(prompt, 'AI 성찰 프롬프트를 복사했어요. AI 대화창에 붙여넣어 보세요.')}>
              AI 성찰 프롬프트 복사
            </button>
            <button onClick={handleDownload}>데이터 내려받기 (JSON)</button>
            <button onClick={() => handleCopy(renderSchemaText(schema), '재미 도식을 텍스트로 복사했어요.')}>도식만 텍스트로 복사</button>
          </div>
          {notice && <p className="info">{notice}</p>}
          <p className="hint">
            복사한 프롬프트를 Claude, ChatGPT 같은 AI 대화창에 붙여넣으세요. 데이터는 이 기기에만 저장되어 있고,
            직접 붙여넣기 전에는 어디에도 보내지지 않아요.
          </p>

          <h2>프롬프트 미리보기</h2>
          <textarea className="prompt-preview" readOnly value={prompt} onFocus={(e) => e.currentTarget.select()} />
        </>
      )}
    </main>
  );
}
