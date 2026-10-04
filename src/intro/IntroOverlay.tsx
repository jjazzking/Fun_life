import { useEffect, useRef, useState } from 'react';
import { INTRO_COPY as copy } from './introCopy';
import './intro.css';

const SEEN_KEY = 'fun-life:intro-seen:v1';
const FADE_MS = 700;

function hasSeenIntro(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markIntroSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // 저장이 막힌 환경이면 다음 방문에 다시 보여줄 뿐이다
  }
}

function AsIsDiagram() {
  return (
    <figure className="intro-diagram as-is" aria-label={`${copy.diagram.asIsLabel}: ${copy.diagram.asIs.join(' → ')}`}>
      <figcaption>
        <span className="intro-diagram-label">AS-IS · {copy.diagram.asIsLabel}</span>
      </figcaption>
      <ol className="intro-chain" aria-hidden="true">
        {copy.diagram.asIs.map((node, i) => (
          <li key={node}>
            {i > 0 && <span className="intro-arrow">→</span>}
            <span className="intro-node struck">{node}</span>
          </li>
        ))}
      </ol>
      <p className="intro-diagram-caption">{copy.diagram.asIsCaption}</p>
    </figure>
  );
}

function ToBeDiagram() {
  return (
    <figure className="intro-diagram to-be">
      <figcaption>
        <span className="intro-diagram-label">TO-BE · {copy.diagram.toBeLabel}</span>
      </figcaption>
      {copy.diagram.toBe.map((route, i) => (
        <div
          key={route.from}
          className={`intro-route route-${i + 1}`}
          aria-label={`${route.from}에서 ${route.via}를 거쳐 ${route.to}(${route.toNote})로`}
        >
          <span className={`intro-node start ${i === 1 ? 'money' : ''}`}>{route.from}</span>
          <span className="intro-link" aria-hidden="true">
            <span className="intro-link-line" />
            <span className="intro-link-label">{route.via}</span>
          </span>
          <span className="intro-node fun">
            {route.to}
            <small>{route.toNote}</small>
          </span>
        </div>
      ))}
      <p className="intro-diagram-caption">{copy.diagram.toBeCaption}</p>
    </figure>
  );
}

/**
 * 첫 접속 시 전체 화면으로 뜨는 선언문.
 * CTA를 누르면 페이드아웃되고, 화면 구석의 [?] 기획의도 버튼으로 언제든 다시 연다.
 */
export function IntroOverlay() {
  const [open, setOpen] = useState(() => !hasSeenIntro());
  const [leaving, setLeaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  function close() {
    if (leaving) return;
    markIntroSeen();
    setLeaving(true);
    window.setTimeout(() => {
      setOpen(false);
      setLeaving(false);
      returnFocus.current = true;
    }, FADE_MS);
  }

  useEffect(() => {
    if (!open) {
      // 트리거는 오버레이가 닫힌 뒤에야 보이므로 렌더 후에 포커스를 돌려준다
      if (returnFocus.current) triggerRef.current?.focus();
      returnFocus.current = false;
      return;
    }
    dialogRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
    // close는 매 렌더 새로 만들어지지만 open 상태 동안의 동작은 같다
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        className="intro-trigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        hidden={open}
      >
        <span aria-hidden="true">?</span> {copy.reopen}
      </button>

      {open && (
        <div
          ref={dialogRef}
          className={`intro-overlay ${leaving ? 'leaving' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="intro-title"
          tabIndex={-1}
        >
          <div className="intro-inner">
            <header className="intro-header intro-reveal">
              <p className="intro-eyebrow">{copy.eyebrow}</p>
              <h1 id="intro-title">{copy.title}</h1>
              <blockquote className="intro-quote">
                <p>{copy.quote.text}</p>
                <cite>— {copy.quote.author}</cite>
              </blockquote>
            </header>

            <ol className="intro-steps">
              {copy.steps.map((step) => (
                <li key={step.index} className="intro-step intro-reveal">
                  <span className="intro-step-index">{step.index}</span>
                  <div>
                    <h2>{step.title}</h2>
                    <p>{step.body}</p>
                    {step.source && <p className="intro-step-source">{step.source}</p>}
                  </div>
                </li>
              ))}
            </ol>

            <section className="intro-diagrams intro-reveal" aria-label="도식 비교">
              <AsIsDiagram />
              <ToBeDiagram />
            </section>

            <footer className="intro-footer intro-reveal">
              <p className="intro-howto">{copy.howTo}</p>
              <button className="intro-cta" onClick={close}>
                <span aria-hidden="true">[</span> {copy.cta} <span aria-hidden="true">]</span>
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
