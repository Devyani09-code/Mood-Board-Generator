import { ArrowDown, ArrowRight, MoveUpRight, Sparkles } from 'lucide-react';
import heroImage from '@assets/image_1789900858371.png';
import collageImage from '@assets/image_1789901025192.png';
import { Link } from 'wouter';

export default function HomePage() {
  return (
    <main className="grain min-h-[100dvh] overflow-hidden bg-[#ece8df] text-[#7b3131]">
      <section className="relative min-h-screen px-5 pb-16 pt-6 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-[1440px]">
          <header className="flex items-center justify-between border-b border-[#7b3131]/25 pb-5">
            <Link href="/" className="group flex items-center gap-3" data-testid="link-home-logo">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#7b3131]/40 text-[#7b3131]">
                <span className="serif text-[27px] leading-none">T</span>
              </span>
              <span className="text-[12px] font-bold uppercase tracking-[.24em]">Tinge</span>
            </Link>
            <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] sm:gap-5">
              <a href="#about" className="nav-info-tab" data-testid="link-nav-about"><span>About</span><span className="nav-tab-detail">a visual starting point</span></a>
              <a href="#ritual" className="nav-info-tab" data-testid="link-nav-process"><span>Process</span><span className="nav-tab-detail">brief to board</span></a>
              <Link href="/sign-in" className="nav-info-tab" data-testid="link-sign-in"><span>Log in</span><span className="nav-tab-detail">return to studio</span></Link>
              <Link href="/sign-up" className="rounded-full bg-[#7b3131] px-4 py-2.5 text-[#ece8df] transition-transform hover:-translate-y-0.5" data-testid="link-sign-up">Sign up</Link>
            </nav>
          </header>

          <div className="grid items-center gap-12 pt-16 lg:grid-cols-[.82fr_1.18fr] lg:gap-16 lg:pt-24">
            <div className="relative z-10 max-w-[650px]">
              <span className="reveal eyebrow text-[#7b3131]/70">Tinge / visual direction studio</span>
              <h1 className="reveal reveal-delay-1 serif mt-8 max-w-[720px] text-[clamp(4.5rem,10vw,10rem)] leading-[.79] tracking-[-.075em]">
                Make room<br /><em>for the feeling.</em>
              </h1>
              <p className="reveal reveal-delay-2 mt-9 max-w-[470px] text-[15px] leading-7 text-[#7b3131]/85 sm:text-[17px]">
                Tinge turns an unfinished thought into a visual direction you can see, share, and keep shaping.
              </p>
              <div className="reveal reveal-delay-3 mt-10 flex flex-wrap items-center gap-5">
                <Link href="/sign-up" className="group flex items-center gap-3 rounded-full bg-[#7b3131] px-6 py-3.5 text-[11px] font-bold uppercase tracking-[.15em] text-[#ece8df] transition-all hover:-translate-y-0.5 hover:bg-[#5f2020]" data-testid="link-start-ritual">
                  Begin your board <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <a href="#ritual" className="flex items-center gap-2 px-2 py-3 text-[11px] font-bold uppercase tracking-[.15em] text-[#7b3131] transition-colors hover:text-[#5f2020]" data-testid="link-see-how">
                  See the process <ArrowDown size={14} />
                </a>
              </div>
            </div>

            <div className="reveal reveal-delay-2 relative mx-auto w-full max-w-[760px]">
              <div className="absolute -right-3 -top-5 hidden h-28 w-28 rounded-full border border-[#7b3131]/25 lg:block" />
              <div className="hero-art relative overflow-hidden border-[10px] border-[#ece8df] bg-[#7b3131] shadow-[18px_25px_0_rgba(123,49,49,.18),0_32px_50px_rgba(123,49,49,.18)]">
                <img src={heroImage} alt="A warm editorial collage of visual references" className="block aspect-[16/9] w-full object-cover opacity-75" data-testid="img-hero" />
                <div className="hero-art-mask" aria-hidden="true" />
                <div className="absolute inset-x-[18%] top-[37%] z-10 border-y border-[#7b3131]/25 py-3 text-center text-[#7b3131]">
                  <span className="eyebrow">Tinge / visual direction</span>
                </div>
              </div>
              <div className="absolute -bottom-7 -left-5 bg-[#7b3131] px-5 py-3 text-[#ece8df] shadow-lg">
                <span className="eyebrow">No. 01 / start anywhere</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="relative border-t border-[#ece8df]/20 bg-[#7b3131] px-5 py-24 text-[#ece8df] sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-[1440px] gap-14 lg:grid-cols-[.55fr_1fr] lg:gap-24">
          <div>
            <span className="eyebrow text-[#ece8df]/65">A quieter way in</span>
            <h2 className="serif mt-6 max-w-[440px] text-5xl leading-[.92] tracking-[-.05em] sm:text-6xl"><em>Not a brief.<br />A clear direction.</em></h2>
          </div>
          <div className="grid gap-0 sm:grid-cols-3">
            {[
              ['01', 'Name the feeling', 'Start with the idea as it is. A sentence is enough to begin.'],
              ['02', 'Choose the weather', 'Select the visual instincts that keep returning to the thought.'],
              ['03', 'Shape the board', 'Move, replace, and refine until the direction feels like yours.'],
            ].map(([number, title, copy], index) => (
              <div key={number} className={`border-t border-[#ece8df]/40 py-6 sm:border-l sm:border-t-0 sm:pl-6 ${index > 0 ? 'mt-4 sm:mt-0' : ''}`} data-testid={`card-ritual-step-${number}`}>
                <span className="text-[11px] tracking-[.18em] text-[#ece8df]/65">{number}</span>
                <h3 className="serif mt-10 text-2xl">{title}</h3>
                <p className="mt-3 max-w-[210px] text-[13px] leading-6 text-[#ece8df]/78">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ritual" className="collage-grid px-5 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-[1440px] items-center gap-10 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <span className="eyebrow text-[#ece8df]/70">The finished feeling</span>
            <h2 className="serif mt-5 max-w-[470px] text-5xl leading-[.9] text-[#ece8df] sm:text-7xl"><em>See the thread<br />take shape.</em></h2>
            <p className="mt-6 max-w-[330px] text-[14px] leading-6 text-[#ece8df]/80">Every board is a starting point you can carry into a conversation, a pitch, or the next creative pass.</p>
          </div>
          <div className="overflow-hidden border-[10px] border-[#ece8df] shadow-[16px_18px_0_rgba(236,232,223,.12)]">
            <img src={collageImage} alt="A completed Tinge moodboard collage" className="block w-full" data-testid="img-final-collage" />
          </div>
        </div>
      </section>

      <footer className="flex flex-col justify-between gap-4 bg-[#7b3131] px-5 py-8 text-[10px] font-bold uppercase tracking-[.16em] text-[#ece8df] sm:flex-row sm:px-10 lg:px-16">
        <span>© 2026 Tinge studio</span>
        <span className="text-[#ece8df]/65">for ideas in their early light</span>
      </footer>
    </main>
  );
}
