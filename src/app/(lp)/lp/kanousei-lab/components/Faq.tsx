/**
 * S8 — Faq
 * Server Component. <details>/<summary> accordion — no JS required.
 * Keyboard accessible via native HTML. Custom marker styling in lp.css (.lp-faq-item).
 * Copy exact from plan §3 S8.
 */

interface FaqItem {
  question: string
  answer: string
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: '本当に無料ですか？',
    answer: 'はい。診断・フィードバック・面談まですべて無料です。費用が発生することはありません。',
  },
  {
    question: 'しつこく勧誘されませんか？',
    answer: 'いいえ。診断はあなたの現在地を知るためのもので、その場で売り込むことはしません。面談も希望者のみです。',
  },
  {
    question: '転職するか決めていなくても大丈夫？',
    answer: 'もちろんです。「まだ迷っている」段階の方こそ歓迎します。まずは自分を知ることから。',
  },
  {
    question: '営業以外の職種でも相談できますか？',
    answer: '可能です。20〜30代で転職を考えている方なら、職種を問わずご相談いただけます。',
  },
  {
    question: 'どれくらい時間がかかりますか？',
    answer: '診断は約3分。面談はオンラインで30分です。',
  },
]

export function Faq() {
  return (
    <section className="lp-section" aria-labelledby="faq-heading">
      <div className="lp-container">
        {/* Heading */}
        <h2 id="faq-heading" className="lp-h2 text-center mb-10">
          よくあるご質問
        </h2>

        {/* Accordion list — native <details>/<summary>, no JS */}
        <div
          className="max-w-2xl mx-auto"
          role="list"
          aria-label="よくあるご質問"
        >
          {FAQ_ITEMS.map(({ question, answer }, i) => (
            <details
              key={i}
              className="lp-faq-item"
              role="listitem"
            >
              <summary>
                <span className="text-base md:text-lg">{question}</span>
              </summary>
              <div className="lp-faq-answer">
                <p>{answer}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
