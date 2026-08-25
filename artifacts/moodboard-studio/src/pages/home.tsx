import { ArrowDown, ArrowRight, BookOpen, CircleDot, MoveUpRight, ScanLine, Sparkles } from 'lucide-react';
import velvetTexture from '@assets/velvet-maroon-texture.png';
import { Link } from 'wouter';

export default function HomePage() {
  return (
    <main className="grain min-h-[100dvh] overflow-hidden bg-[#5c1a03] text-[#c2dfdb]" style={{ backgroundImage: `linear-gradient(rgba(92,26,3,.84), rgba(92,26,3,.84)), url(${velvetTexture})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
      <section className="relative min-h-screen px-6 pb-20 pt-7 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-[1400px]">
          <header className="flex items-center justify-between border-b border-[#c2dfdb]/20 pb-5">
            <Link href="/" className="group flex items-center gap-3" data-testid="link-home-logo">
              <span className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#c2dfdb]/30 bg-[#5c1a03] text-[#fef7e5] shadow-sm">
                <span className="serif text-[27px] leading-none">M</span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[.22em]">Morrow studio</span>
            </Link>
            <nav className="flex items-center gap-5 text-[11px] font-bold uppercase tracking-[.16em] sm:gap-8">
              <Link href="/sign-in" className="rounded-full border border-[#c2dfdb]/30 px-4 py-2 transition-all hover:border-[#c2dfdb] hover:bg-[#c2dfdb] hover:text-[#5c1a03]" data-testid="link-sign-in">Sign in</Link>
            </nav>
          </header>

          <div className="grid items-end gap-12 pt-20 lg:grid-cols-[1.05fr_.95fr] lg:gap-20 lg:pt-28">
            <div className="relative z-10 max-w-[720px]">
              <h1 className="reveal reveal-delay-1 serif mt-8 max-w-[760px] text-[clamp(4rem,9vw,9.2rem)] leading-[.84] tracking-[-.065em] text-[#c2dfdb]">
                Stage<br /><em>your</em> ideas.
              </h1>
              <p className="reveal reveal-delay-2 mt-9 max-w-[470px] text-[15px] leading-7 text-[#c2dfdb] sm:text-[17px]">
                Morrow transforms early ideas into considered visual identities. Bring the starting point. Leave with a clear creative direction and a visual language built to stand apart
              </p>
              <div className="reveal reveal-delay-3 mt-10 flex flex-wrap items-center gap-4">
                <Link href="/sign-up" className="group flex items-center gap-3 rounded-full border border-[#c2dfdb]/40 bg-[#5c1a03] px-6 py-3.5 text-[11px] font-bold uppercase tracking-[.15em] text-[#fef7e5] transition-all hover:-translate-y-0.5 hover:bg-[#bca106] hover:text-[#5c1a03] hover:border-[#bca106]" data-testid="link-start-ritual">
                  Let's Begin!! <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <a href="#ritual" className="flex items-center gap-2 px-2 py-3 text-[11px] font-bold uppercase tracking-[.15em] text-[#c2dfdb] transition-colors hover:text-[#bca106]" data-testid="link-see-how">
                  See how it works <ArrowDown size={14} />
                </a>
              </div>
            </div>

            <div className="reveal reveal-delay-2 relative mx-auto w-full max-w-[510px] lg:mb-[-54px]">
              <div className="absolute -left-8 top-12 hidden h-16 w-16 rounded-full border border-[#c2dfdb]/20 lg:block" />
              <div className="relative rotate-[3.5deg] overflow-hidden border-[10px] border-[#e1e2d9]/70 bg-[#8295a0] shadow-[18px_25px_0_rgba(92,26,3,.12),0_32px_50px_rgba(92,26,3,.22)]">
                <img src={velvetTexture} alt="Deep maroon velvet texture" className="block aspect-square w-full object-cover opacity-90" data-testid="img-paper-texture" />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#5c1a03]/20 p-8 text-center text-[#fef7e5]">
                  <span className="eyebrow text-[#fef7e5]/70">No. 01  visual direction</span>
                  <span className="serif mt-5 text-[clamp(2rem,5vw,4.2rem)] leading-[.9]">begin<br /><em>anywhere</em></span>
                  <span className="mt-5 max-w-[240px] text-[10px] uppercase tracking-[.2em] text-[#fef7e5]/75">the first mark is enough</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="ritual" className="relative border-t border-[#c2dfdb]/20 bg-[#5c1a03] px-6 py-24 text-[#c2dfdb] sm:px-10 lg:px-16">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-14 lg:grid-cols-[.55fr_1fr] lg:gap-24">
            <div>
              <span className="eyebrow text-[#bca106]">A gentler starting point</span>
              <h2 className="serif mt-6 max-w-[440px] text-5xl leading-[.95] tracking-[-.04em] sm:text-6xl"><em>Not a brief.<br />A clear direction.</em></h2>
            </div>
            <div className="grid gap-0 sm:grid-cols-3">
              {[
                ['01', 'Define the idea', 'We start by understanding the project, its context, and what it needs to achieve.'],
                ['02', 'Establish the direction', 'We explore references, perspectives, and possibilities to identify a clear creative route.'],
                ['03', 'Build your board', 'The chosen direction becomes a distinct visual language, refined with purpose and consistency.'],
              ].map(([number, title, copy], index) => (
                <div key={number} className={`border-t border-[#c2dfdb]/25 py-6 sm:border-l sm:border-t-0 sm:pl-6 ${index > 0 ? 'mt-4 sm:mt-0' : ''}`} data-testid={`card-ritual-step-${number}`}>
                  <span className="text-[11px] tracking-[.18em] text-[#bca106]">{number}</span>
                  <h3 className="serif mt-10 text-2xl">{title}</h3>
                  <p className="mt-3 max-w-[210px] text-[13px] leading-6 text-[#c2dfdb]/65">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="flex flex-col justify-between gap-4 border-t border-[#c2dfdb]/20 bg-[#5c1a03] px-6 py-7 text-[10px] font-bold uppercase tracking-[.16em] text-[#c2dfdb] sm:flex-row sm:px-10 lg:px-16">
        <span>© 2025 Morrow  studio</span>
        <span className="text-[#bca106]">for ideas in their early light</span>
      </footer>
    </main>
  );
}
