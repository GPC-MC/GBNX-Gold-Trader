import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Bot, Shield, TrendingUp, Zap } from 'lucide-react';
import avatarImage from '../../../assets/avatar.png';

type IconComponent = React.ComponentType<{ className?: string; size?: number }>;

const FeatureCard: React.FC<{
  icon: IconComponent;
  title: string;
  description: string;
}> = ({ icon: Icon, title, description }) => (
  <div className="rounded-2xl bg-[#0B1220]/70 border border-[#D4AF37]/15 p-6 transition-all duration-300 hover:border-[#D4AF37]/30 hover:bg-[#0B1220]/85">
    <div className="inline-flex items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3">
      <Icon className="text-[#F2D27C]" size={20} />
    </div>
    <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
    <p className="mt-2 text-sm leading-relaxed text-gray-400">{description}</p>
  </div>
);

const StepCard: React.FC<{
  index: number;
  title: string;
  description: string;
}> = ({ index, title, description }) => (
  <div className="relative rounded-2xl bg-[#0B1220]/60 border border-[#D4AF37]/12 p-6">
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-[#F2D27C] font-semibold">
        {index}
      </div>
      <div>
        <div className="text-base font-semibold text-white">{title}</div>
        <div className="mt-1 text-sm leading-relaxed text-gray-400">{description}</div>
      </div>
    </div>
  </div>
);

const LandingPage: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen text-white">
      <div className="relative overflow-hidden">
        {/* Hero */}
        <section className="relative">
          <div className="mx-auto max-w-7xl px-6 pt-16 pb-20 sm:pt-20 sm:pb-24 lg:pt-28 lg:pb-32">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold tracking-[0.18em] text-[#D4AF37]">
                GOLD AI PLATFORM
              </div>
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center rounded-full border border-[#D4AF37]/25 bg-[#0B1220]/60 px-4 py-2 text-sm text-gray-200 transition hover:border-[#D4AF37]/45 hover:text-white"
              >
                Launch Platform
              </Link>
            </div>

            <div className="mt-12 grid items-center gap-12 lg:grid-cols-2">
              <div className="order-2 lg:order-1">
                <h1 className="text-4xl font-bold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                  AI-powered gold intelligence for confident portfolio decisions.
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-300">
                  Track gold assets, analyze performance, and let AI surface real-time insights—built
                  for clarity, control, and stability.
                </p>

                <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F2D27C] px-6 py-3 text-base font-semibold text-[#0B1220] shadow-[0_14px_40px_rgba(212,175,55,0.18)] transition-all duration-200 hover:shadow-[0_18px_55px_rgba(212,175,55,0.28)] hover:brightness-105 active:scale-[0.99]"
                  >
                    Launch Platform
                  </Link>
                  <a
                    href="#overview"
                    className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-base font-medium text-gray-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                  >
                    View Overview
                  </a>
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-[#D4AF37]/80" />
                    Security-first
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 size={14} className="text-[#D4AF37]/80" />
                    Transparent analytics
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-[#D4AF37]/80" />
                    Built for stability
                  </div>
                </div>
              </div>

              <div className="order-1 flex justify-center lg:order-2">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,_rgba(212,175,55,0.24),_transparent_62%)] blur-2xl" />

                  <div className="relative h-[320px] w-[320px] rounded-full bg-gradient-to-br from-[#D4AF37]/35 via-[#F2D27C]/10 to-transparent p-[1px] shadow-[0_0_90px_rgba(212,175,55,0.18)] sm:h-[360px] sm:w-[360px]">
                    <div className="relative flex h-full w-full items-center justify-center rounded-full bg-[#0B1220]">
                      <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_40%_30%,rgba(242,210,124,0.14),transparent_55%)]" />

                      {/* Mascot */}
                      <div className="relative">
                        <img
                          src={avatarImage}
                          alt="Gold Platform AI Mascot"
                          className="w-80 h-80 sm:w-96 sm:h-96 object-contain"
                          style={{ filter: 'drop-shadow(0 0 28px rgba(212,175,55,0.45))' }}
                        />
                        <div className="pointer-events-none absolute -top-10 -left-12 rounded-full border border-[#D4AF37]/15 bg-[#0B1220]/60 p-2">
                          <TrendingUp size={18} className="text-[#F2D27C]/70" />
                        </div>
                        <div className="pointer-events-none absolute -bottom-10 -right-12 rounded-full border border-[#D4AF37]/15 bg-[#0B1220]/60 p-2">
                          <Shield size={18} className="text-[#F2D27C]/70" />
                        </div>
                        <div className="pointer-events-none absolute -right-16 top-10 rounded-full border border-[#D4AF37]/15 bg-[#0B1220]/60 p-2">
                          <BarChart3 size={18} className="text-[#F2D27C]/70" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pointer-events-none absolute -left-6 -bottom-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,_rgba(212,175,55,0.10),transparent_62%)] blur-xl" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Overview */}
        <section id="overview" className="relative border-t border-[#D4AF37]/10">
          <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Designed for clarity and control</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">
                A refined dashboard experience that tracks gold performance, analyzes portfolio health, and
                delivers AI-driven insights—without feature overload.
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={TrendingUp}
                title="Track gold assets"
                description="Monitor holdings and market moves in real time with a premium, dashboard-aligned view."
              />
              <FeatureCard
                icon={BarChart3}
                title="Analyze performance"
                description="Understand trends, volatility, and portfolio behavior through clean analytics and charts."
              />
              <FeatureCard
                icon={Bot}
                title="AI-driven insights"
                description="Let AI surface the signals that matter—highlighting opportunities and risks with context."
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="relative border-t border-[#D4AF37]/10">
          <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-bold text-white sm:text-3xl">How it works</h2>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">
                  A simple flow designed to get you from introduction to execution in seconds.
                </p>
              </div>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#0B1220]/60 px-5 py-2.5 text-sm font-semibold text-gray-100 transition hover:border-[#D4AF37]/45 hover:text-white"
              >
                Launch Platform
              </Link>
            </div>

            <div className="relative mt-10 grid gap-6 lg:grid-cols-3">
              <div className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-[linear-gradient(to_right,transparent,rgba(212,175,55,0.22),transparent)] lg:block" />
              <StepCard
                index={1}
                title="Launch the platform"
                description="One click takes you into the live dashboard experience."
              />
              <StepCard
                index={2}
                title="View your portfolio"
                description="See gold positions, performance, and market context in a familiar layout."
              />
              <StepCard
                index={3}
                title="Let AI surface insights"
                description="Receive actionable signals with minimal noise—focused on stability and decision quality."
              />
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="relative border-t border-[#D4AF37]/10">
          <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Built for trust</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">
                Security, transparency, and professional usage are treated as defaults—not add-ons.
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={Shield}
                title="Security-first"
                description="Explore the dashboard in guest mode, with secure foundations ready when you enable authentication."
              />
              <FeatureCard
                icon={BarChart3}
                title="Transparent analytics"
                description="Clear performance views help you understand what’s changing and why—without ambiguity."
              />
              <FeatureCard
                icon={Zap}
                title="Real-time insight"
                description="Fast, responsive UI and AI assistance designed to support confident decisions."
              />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative border-t border-[#D4AF37]/10">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-400">© {year} Gold AI Platform</div>
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <a className="transition hover:text-white" href="#overview">
                  Overview
                </a>
                <Link className="transition hover:text-white" to="/dashboard">
                  Launch
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
