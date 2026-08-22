import { ArrowDown, ArrowRight, BookOpen, CircleDot, MoveUpRight, ScanLine, Sparkles } from 'lucide-react';
import paperTexture from '@assets/moodboard-paper-blank.png';
import { Link } from 'wouter';

export default function HomePage() {
  return (
    <main className="grain min-h-[100dvh] overflow-hidden bg-[#d2dadd] text-[#263d49]" style={{ backgroundImage: `linear-gradient(rgba(210,218,221,.84), rgba(210,218,221,.84)), url(${paperTexture})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
      <section className="relative min-h-[720px] px-6 pb-20 pt-7 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-[1400px]">
          <header className="flex items-center justify-between border-b border-[#263d49]/20 pb-5">
            <Link href="/" className="group flex items-center gap-3" data-testid="link-home-logo">
              <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#263d49] text-[#f1e5c9] shadow-sm">
                <span className="serif text-[27px] leading-none">M</span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[.22em]">Morrow / studio</span>
            </Link>
            <nav className="flex items-center gap-5 text-[11px] font-bold uppercase tracking-[.16em] sm:gap-8">
              <a href="#ritual" className="hidden transition-colors hover:text-[#b36b57] sm:block" data-testid="link-about-ritual">The ritual</a>
              <Link href="/sign-in" className="rounded-full border border-[#263d49]/30 px-4 py-2 transition-all hover:border-[#263d49] hover:bg-[#263d49] hover:text-[#f1e5c9]" data-testid="link-sign-in">Sign in</Link>
            </nav>
          </header>

          <div className="grid items-end gap-12 pt-20 lg:grid-cols-[1.05fr_.95fr] lg:gap-20 lg:pt-28">
            <div className="relative z-10 max-w-[720px]">
              <div className="reveal flex items-center gap-3 text-[#b36b57]">
                <CircleDot size={13} strokeWidth={1.5} />
                <span className="eyebrow">A private creative ritual</span>
              </div>
              <h1 className="reveal reveal-delay-1 serif mt-8 max-w-[760px] text-[clamp(4rem,9vw,9.2rem)] leading-[.84] tracking-[-.065em] text-[#263d49]">
                Stage your <em>ideas</em>.
              </h1>
              <p className="reveal reveal-delay-2 mt-9 max-w-[470px] text-[15px] leading-7 text-[#435b65] sm:text-[17px]">
                Morrow transforms early ideas into considered visual identities. Bring the starting point. Leave with a clear creative direction and a visual language built to stand apart.
              </p>
              <div className="reveal reveal-delay-3 mt-10 flex flex-wrap items-center gap-4">
                <Link href="/sign-up" className="group flex items-center gap-3 rounded-full bg-[#263d49] px-6 py-3.5 text-[11px] font-bold uppercase tracking-[.15em] text-[#f1e5c9] transition-all hover:-translate-y-0.5 hover:bg-[#b36b57]" data-testid="link-start-ritual">
                  Begin the ritual <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <a href="#ritual" className="flex items-center gap-2 px-2 py-3 text-[11px] font-bold uppercase tracking-[.15em] text-[#435b65] transition-colors hover:text-[#b36b57]" data-testid="link-see-how">
                  See how it works <ArrowDown size={14} />
                </a>
              </div>
            </div>

            <div className="reveal reveal-delay-2 relative mx-auto w-full max-w-[510px] lg:mb-[-54px]">
              <div className="absolute -left-8 top-12 hidden h-16 w-16 rounded-full border border-[#263d49]/20 lg:block" />
              <div className="relative rotate-[3.5deg] overflow-hidden border-[10px] border-[#e1e2d9]/70 bg-[#8295a0] shadow-[18px_25px_0_rgba(38,61,73,.12),0_32px_50px_rgba(38,61,73,.22)]">
                <img src={paperTexture} alt="Aged blue-gray editorial paper texture" className="block aspect-square w-full object-cover opacity-90" data-testid="img-paper-texture" />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#526b78]/10 p-8 text-center text-[#f1e5c9]">
                  <span className="eyebrow text-[#f1e5c9]/70">No. 01 / visual direction</span>
                  <span className="serif mt-5 text-[clamp(2rem,5vw,4.2rem)] leading-[.9]">begin<br /><em>anywhere</em></span>
                  <span className="mt-5 max-w-[240px] text-[10px] uppercase tracking-[.2em] text-[#f1e5c9]/75">the first mark is enough</span>
                </div>
              </div>
              <div className="absolute -bottom-11 -right-2 flex rotate-[-5deg] items-center gap-2 bg-[#f1e5c9] px-4 py-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#263d49] shadow-md sm:-right-12" data-testid="text-studio-note">
                <ScanLine size={14} className="text-[#b36b57]" /> made for the in-between
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="ritual" className="relative border-t border-[#263d49]/20 bg-[#263d49] px-6 py-24 text-[#f1e5c9] sm:px-10 lg:px-16">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-14 lg:grid-cols-[.55fr_1fr] lg:gap-24">
            <div>
              <span className="eyebrow text-[#d7a491]">A gentler starting point</span>
              <h2 className="serif mt-6 max-w-[440px] text-5xl leading-[.95] tracking-[-.04em] sm:text-6xl">Not a brief.<br /><em>A beginning.</em></h2>
            </div>
            <div className="grid gap-0 sm:grid-cols-3">
              {[
                ['01', 'Describe the idea', 'A few sentences are enough. Tell us what you\u2019re building and why it matters.'],
                ['02', 'Set the direction', 'Pick the visual styles that fit. Mix and match freely.'],
                ['03', 'Refine the board', 'Your moodboard takes shape instantly. Adjust it until it\u2019s exactly right.'],
              ].map(([number, title, copy], index) => (
                <div key={number} className={`border-t border-[#f1e5c9]/25 py-6 sm:border-l sm:border-t-0 sm:pl-6 ${index > 0 ? 'mt-4 sm:mt-0' : ''}`} data-testid={`card-ritual-step-${number}`}>
                  <span className="text-[11px] tracking-[.18em] text-[#d7a491]">{number}</span>
                  <h3 className="serif mt-10 text-2xl">{title}</h3>
                  <p className="mt-3 max-w-[210px] text-[13px] leading-6 text-[#f1e5c9]/65">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="paper-wash px-6 py-24 sm:px-10 lg:px-16" style={{ backgroundImage: `linear-gradient(rgba(241,229,201,.56), rgba(241,229,201,.56)), url(${paperTexture})` }}>
        <div className="mx-auto grid max-w-[1400px] items-center gap-16 lg:grid-cols-[1fr_.8fr]">
          <div className="relative max-w-[690px]">
            <div className="absolute -left-4 top-[-28px] text-[#b36b57]"><Sparkles size={28} strokeWidth={1.2} /></div>
            <span className="eyebrow text-[#b36b57]">The studio promise</span>
            <p className="serif mt-6 text-[clamp(2.7rem,5.4vw,5.6rem)] leading-[.94] tracking-[-.05em] text-[#263d49]">
              Leave the blank page behind. Keep the <em>possibility.</em>
            </p>
          </div>
          <div className="border-t border-[#263d49]/25 pt-6 lg:mt-10">
            <BookOpen size={22} strokeWidth={1.2} className="text-[#b36b57]" />
            <p className="mt-5 max-w-[330px] text-[14px] leading-7 text-[#435b65]">Your boards are yours alone: a private shelf of directions, saved in the moment they become clear.</p>
            <Link href="/sign-up" className="mt-8 inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[.16em] text-[#263d49] transition-colors hover:text-[#b36b57]" data-testid="link-create-board">
              Open your studio <MoveUpRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="flex flex-col justify-between gap-4 bg-[#d2dadd] px-6 py-7 text-[10px] font-bold uppercase tracking-[.16em] text-[#435b65] sm:flex-row sm:px-10 lg:px-16">
        <span>© 2025 Morrow / studio</span>
        <span className="text-[#b36b57]">for ideas in their early light</span>
      </footer>
    </main>
  );
}