/**
 * 재미 도식을 AI에게 건네 실존주의적 성찰을 요청하는 프롬프트.
 *
 * 이 앱의 목적은 재미 자체가 아니라 실존주의적 삶의 태도를 완성해 가는 것이다.
 * 그래서 프롬프트는 AI가 평가하거나 처방하기보다, 유저가 스스로 돌아볼 거리를 건네도록 설계한다.
 */
import { CARD_STATUS_LABEL } from './card';
import type { FunSchema, SchemaStep } from './schema';

const STEP_TAG: Record<SchemaStep['kind'], string> = {
  action: '',
  emotion: '[감정] ',
  utility: '[효용] ',
  money: '[돈] ',
  fun: '',
};

function renderPath(path: SchemaStep[]): string {
  return path.map((s) => `${STEP_TAG[s.kind]}${s.label}`).join(' → ');
}

/** 사람과 AI가 모두 읽기 쉬운 텍스트 형태의 재미 도식 */
export function renderSchemaText(schema: FunSchema): string {
  const { summary } = schema;
  const lines: string[] = [
    `- 행동 카드 ${summary.actionCards}개 중 재미까지 이어진 카드 ${summary.connectedCards}개` +
      (summary.viaMoneyCards ? ` (그중 돈을 거쳐 이어진 카드 ${summary.viaMoneyCards}개)` : ''),
    `- 행동 카드에 만든 박스: 감정 ${summary.emotionBoxes}개, 효용 ${summary.utilityBoxes}개, 돈 ${summary.moneyBoxes}개`,
  ];
  if (summary.recurring.length) {
    lines.push(
      `- 여러 행동에서 반복해서 나타난 것: ` +
        summary.recurring.map((r) => `"${r.label}"(${r.cards.join(', ')})`).join(', '),
    );
  }

  for (const card of schema.cards) {
    const heading = card.kind === 'money' ? `돈 카드 (돈이 어떻게 재미로 이어지는가)` : `행동 카드: ${card.title}`;
    lines.push('', `### ${heading} — ${CARD_STATUS_LABEL[card.status]}`);
    if (card.paths.length) {
      lines.push(...card.paths.map((p) => `- ${renderPath(p)}`));
    } else {
      lines.push('- (아직 이어진 경로 없음)');
    }
    if (card.unconnected.length) {
      lines.push(
        `- 아직 어디에도 잇지 못한 박스: ` +
          card.unconnected.map((b) => `${STEP_TAG[b.kind]}${b.label}`).join(', '),
      );
    }
  }
  return lines.join('\n');
}

export function buildReflectionPrompt(schema: FunSchema): string {
  return `저는 "Fun Life"라는 앱으로 제 삶의 행동들을 하나씩 카드로 만들고, 각 행동이 주는 감정과 효용을 박스로 꺼내 결국 "재미"에 닿도록 이어 보았습니다. 아래는 그렇게 그린 저의 재미 도식입니다.

이 앱은 재미를 늘리는 것이 목적이 아니라, 실존주의적 삶의 태도를 완성해 가기 위한 수단입니다. 그러니 이 도식을 "어떻게 하면 더 재밌게/효율적으로 살까"가 아니라, "나는 어떤 존재로 살기를 선택하고 있는가"를 돌아보는 재료로 읽어 주세요.

## 앱의 규칙 (도식을 읽을 때 참고)
- 카드 하나는 행동 하나입니다. 처음에는 [행동]과 [재미] 박스만 있고, 그 사이를 제가 직접 찾은 감정·효용으로 채웁니다.
- 행동에서 재미로 바로 이을 수는 없습니다. 반드시 그 행동이 직접 주는 무언가를 거쳐야 합니다.
- 돈이나 경제적 성공은 [돈] 박스로 따로 표시되고, 거기서 더 이어지지 않습니다. 돈이 어떻게 재미로 이어지는지는 별도의 "돈 카드"에서 그립니다.
- "아직 어디에도 잇지 못한 박스"는 느끼긴 했지만 재미와의 관계를 아직 찾지 못한 것들입니다.

## 나의 재미 도식
${renderSchemaText(schema)}

## 부탁드리는 것
실존주의(사르트르, 카뮈, 키르케고르, 하이데거, 니체, 보부아르 등)의 관점에서 아래를 함께 돌아봐 주세요. 철학자의 이름이나 개념은 저를 이해하는 데 정말 도움이 될 때만 짧게 쓰고, 설명보다 저의 도식에 붙어서 이야기해 주세요.

1. **자유와 선택**: 이 도식에서 제가 스스로 선택한 의미로 보이는 것과, 남들이 좋다고 하니까 따라온 것("세인", 자기기만)처럼 보이는 것은 무엇인가요? 근거가 되는 경로를 짚어 주세요.
2. **결과가 아닌 과정**: 행동 그 자체 안에서 재미를 찾은 경로와, 결과나 보상(돈, 인정 등)을 거쳐야만 재미에 닿는 경로를 구분해 주세요. 결과가 사라져도 남는 것이 있는 행동은 무엇인가요? (시지프스처럼)
3. **돈의 자리**: 돈이 제 재미 도식에서 어떤 역할을 하고 있나요? 돈 카드가 그리는 재미가 행동 카드들에서 이미 직접 얻고 있는 것과 겹친다면, 그 점이 무엇을 말해 주나요?
4. **반복되는 것**: 여러 행동에 반복해서 나타난 감정이나 효용은, 제가 아직 이름 붙이지 않은 저의 가치일 수 있습니다. 그것을 무엇이라고 부를 수 있을까요?
5. **비어 있는 곳**: 아직 재미에 닿지 못한 카드, 잇지 못한 박스, 혹은 도식에 아예 없는 삶의 영역(관계, 몸, 죽음과 유한성, 타인에 대한 책임 등)에서 제가 외면하고 있는 것은 없을까요?
6. **나에게 던지는 질문**: 마지막으로, 제가 앞으로 일주일 동안 품고 지낼 만한 질문 3개를 주세요. 정답이 있는 질문이 아니라, 제가 스스로 선택하게 만드는 질문이면 좋겠습니다. 다음에 만들어 볼 만한 행동 카드가 떠오른다면 1~2개 제안해 주세요.

## 주의해 주세요
- 저를 진단하거나 평가하지 말고, 제가 스스로 볼 수 있도록 비춰 주세요.
- 생산성, 자기계발 팁, 성공 전략으로 흐르지 말아 주세요.
- 돈을 거친 재미를 무조건 나쁘다고 보지 말고, 그것이 제 선택인지 아닌지에 집중해 주세요.
- 도식에 없는 사실을 지어내지 말고, 추측할 때는 추측이라고 밝혀 주세요.
- 한국어로, 따뜻하지만 솔직하게 답해 주세요.`;
}
