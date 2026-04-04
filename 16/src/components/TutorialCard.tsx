type TutorialCardProps = {
  onDismiss: () => void;
};

export function TutorialCard({ onDismiss }: TutorialCardProps) {
  return (
    <section className="pg-rounded-[28px] pg-border pg-border-cyan-300/20 pg-bg-cyan-300/8 pg-p-4">
      <div className="pg-flex pg-flex-wrap pg-items-start pg-justify-between pg-gap-3">
        <div>
          <p className="pg-m-0 pg-text-[11px] pg-font-semibold pg-uppercase pg-tracking-[0.18em] pg-text-cyan-200/80">Quick start</p>
          <h3 className="pg-mb-0 pg-mt-2 pg-text-lg pg-font-semibold pg-text-white">How the archive works</h3>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="pg-rounded-full pg-border pg-border-white/12 pg-bg-white/[0.04] pg-px-4 pg-py-2 pg-text-sm pg-font-semibold pg-text-white transition hover:pg-border-white/20 hover:pg-bg-white/[0.08]"
        >
          Hide
        </button>
      </div>
      <div className="pg-mt-4 pg-grid pg-gap-3 md:pg-grid-cols-3">
        <Hint title="Scratch the seal" body="Brush the cover until the reveal line lights up." />
        <Hint title="Spend your coins" body="Buy upgrades often so the next panel feels close." />
        <Hint title="Unlock automation" body="Auto systems turn your manual loop into steady growth." />
      </div>
    </section>
  );
}

function Hint({ title, body }: { title: string; body: string }) {
  return (
    <div className="pg-rounded-[22px] pg-border pg-border-white/10 pg-bg-black/12 pg-p-4">
      <div className="pg-text-sm pg-font-semibold pg-text-white">{title}</div>
      <div className="pg-mt-2 pg-text-sm pg-leading-6 pg-text-slate-300">{body}</div>
    </div>
  );
}
