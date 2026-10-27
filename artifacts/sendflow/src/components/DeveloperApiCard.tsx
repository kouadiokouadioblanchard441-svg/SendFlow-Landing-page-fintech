type DeveloperApiCardProps = {
  eyebrow: string;
  title: string;
  body: string;
  codeLabel: string;
  code: string;
  reveal?: boolean;
};

export default function DeveloperApiCard({
  eyebrow,
  title,
  body,
  codeLabel,
  code,
  reveal = true,
}: DeveloperApiCardProps) {
  return (
    <section
      id="developer-api"
      aria-labelledby="developer-api-title"
      className="scroll-mt-28 px-5 pb-12 sm:px-8 sm:pb-16"
      data-testid="section-developer-api"
    >
      <div className={`${reveal ? 'reveal ' : ''}mx-auto max-w-[1240px]`}>
        <article className="grid overflow-hidden rounded-[28px] border border-[#d6c8e9] bg-[#fbf8ef] shadow-[0_18px_50px_rgba(58,38,83,.08)] lg:grid-cols-[.82fr_1.18fr]">
          <div className="order-2 flex flex-col justify-center p-6 sm:p-10 lg:order-1">
            <span className="w-fit rounded-full border border-[#6d35d8]/15 bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#5b21b6]">
              {eyebrow}
            </span>
            <h2
              id="developer-api-title"
              className="mt-5 max-w-[480px] text-3xl font-extrabold leading-[1.02] tracking-[-.065em] text-[#17131f] sm:text-4xl"
            >
              {title}
            </h2>
            <p className="mt-4 max-w-[460px] text-[15px] font-semibold leading-7 text-[#3d4654] sm:text-[16px]">
              {body}
            </p>
          </div>

          <div className="order-1 min-w-0 bg-[#211d2c] p-3 sm:p-5 lg:order-2">
            <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#17131f] shadow-[0_18px_40px_rgba(15,12,28,.24)]">
              <div className="flex min-h-12 items-center justify-between gap-3 border-b border-white/10 px-4 sm:px-5">
                <div className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f28b82]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f8d66d]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#81c995]" />
                </div>
                <span className="min-w-0 truncate text-[11px] font-bold uppercase tracking-[.12em] text-[#c8bdd7] sm:text-[12px]">
                  {codeLabel}
                </span>
                <span className="shrink-0 rounded-full bg-[#6d35d8]/25 px-2.5 py-1 text-[10px] font-bold text-[#d8c6ff]">
                  API
                </span>
              </div>
              <div className="max-h-[390px] overflow-auto">
                <pre
                  className="whitespace-pre-wrap break-words px-4 py-5 font-mono text-[12px] leading-[1.8] text-[#e9e2f4] [overflow-wrap:anywhere] sm:px-6 sm:py-6 sm:text-[14px]"
                  data-testid="text-developer-api-code"
                >
                  <code>{code}</code>
                </pre>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
