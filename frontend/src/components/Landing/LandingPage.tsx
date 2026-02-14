import React, { useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bot,
  Shield,
  TrendingUp,
  Zap,
  CandlestickChart,
  Gauge,
  Clock3
} from 'lucide-react';
import LoginModal from '../Auth/LoginModal';
import styles from './LandingPage.module.scss';

type IconComponent = React.ComponentType<{ className?: string; size?: number }>;

const FeatureCard: React.FC<{
  icon: IconComponent;
  title: string;
  description: string;
}> = ({ icon: Icon, title, description }) => (
  <div className="terminal-panel rounded-lg p-5">
    <div className="inline-flex items-center justify-center rounded-md border border-gold-500/25 bg-gold-500/10 p-2.5">
      <Icon className="text-gold-300" size={18} />
    </div>
    <h3 className="mt-4 text-base font-semibold text-gray-100">{title}</h3>
    <p className="mt-2 text-sm leading-relaxed text-gray-400">{description}</p>
  </div>
);

const StepCard: React.FC<{
  index: number;
  title: string;
  description: string;
}> = ({ index, title, description }) => (
  <div className="terminal-panel rounded-lg p-5">
    <div className="mb-4 flex items-center gap-3">
      <div className="grid h-8 w-8 place-items-center rounded-md border border-gold-500/30 bg-gold-500/10 font-mono text-sm font-semibold text-gold-300">
        {index}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">Execution Flow</div>
    </div>
    <h3 className="text-base font-semibold text-gray-100">{title}</h3>
    <p className="mt-2 text-sm text-gray-400">{description}</p>
  </div>
);

const TickerRow: React.FC<{ symbol: string; price: string; change: string; up?: boolean }> = ({
  symbol,
  price,
  change,
  up = true
}) => (
  <div className="terminal-ticker flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">{symbol}</span>
      <span className="font-mono text-base font-semibold text-gray-100">{price}</span>
    </div>
    <span className={up ? 'font-mono text-xs text-emerald-300' : 'font-mono text-xs text-rose-300'}>{change}</span>
  </div>
);

const LandingPage: React.FC = () => {
  const year = new Date().getFullYear();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  return (
    <div className={`${styles.page} min-h-screen text-white`}>
      <div className="border-b border-gold-500/15 bg-ink-975/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold-400">Live Trading Interface</div>
            <div className="font-display text-2xl tracking-[0.16em] text-white">
              GBNX <span className="text-gold-400">TERMINAL</span>
            </div>
          </div>
          <button
            onClick={openLoginModal}
            className="rounded-md border border-gold-500/30 bg-gold-500/15 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-gold-200 transition hover:bg-gold-500/25"
          >
            Launch Workspace
          </button>
        </div>
      </div>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-16 pt-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="terminal-chip">Institutional Gold Desk</div>
          <h1 className="mt-6 max-w-2xl text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
            Terminal-grade analytics for gold traders and portfolio teams.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-gray-300">
            Track spot flows, monitor account balances, and operate AI agents from a single command-view interface inspired by professional desks.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={openLoginModal}
              className="rounded-md border border-gold-500/40 bg-gold-500/15 px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-gold-200 transition hover:bg-gold-500/25"
            >
              Open Terminal
            </button>
            <a
              href="#overview"
              className="rounded-md border border-gold-500/20 bg-ink-900/75 px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-gray-300 transition hover:border-gold-500/35 hover:text-gray-100"
            >
              View Modules
            </a>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <div className={`${styles.infoPanel} rounded-md px-4 py-3`}>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">Signals</div>
              <div className="mt-2 flex items-center gap-2 text-sm text-emerald-300">
                <Activity size={14} /> Live
              </div>
            </div>
            <div className={`${styles.infoPanel} rounded-md px-4 py-3`}>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">Latency</div>
              <div className="mt-2 flex items-center gap-2 text-sm text-terminal-cyan">
                <Gauge size={14} /> 42ms
              </div>
            </div>
            <div className={`${styles.infoPanel} rounded-md px-4 py-3`}>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">Session</div>
              <div className="mt-2 flex items-center gap-2 text-sm text-gold-300">
                <Clock3 size={14} /> NY + LDN
              </div>
            </div>
          </div>
        </div>

        <div className="terminal-frame rounded-lg p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="terminal-header">Market Monitor</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">Realtime</div>
          </div>

          <div className="space-y-3">
            <TickerRow symbol="XAUUSD" price="$2,389.74" change="+0.82%" />
            <TickerRow symbol="XAGUSD" price="$31.43" change="+0.34%" />
            <TickerRow symbol="DXY" price="103.21" change="-0.27%" up={false} />
            <TickerRow symbol="US10Y" price="4.12%" change="-0.09%" up={false} />
          </div>

          <div className="my-5 terminal-divider" />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-gold-500/15 bg-ink-900/80 p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">Flow Bias</div>
              <div className="mt-2 flex items-center gap-2 text-sm text-emerald-300">
                <TrendingUp size={14} /> Safe-haven demand
              </div>
            </div>
            <div className="rounded-md border border-gold-500/15 bg-ink-900/80 p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">Volatility</div>
              <div className="mt-2 flex items-center gap-2 text-sm text-gold-300">
                <CandlestickChart size={14} /> Moderate
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-md border border-gold-500/20 bg-ink-900/85 px-4 py-3">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">AI Prompt Queue</div>
            <div className="flex items-start justify-between gap-3 text-sm text-gray-200">
              <span>Summarize macro catalysts affecting XAU in the next 48h.</span>
              <ArrowUpRight size={16} className="text-gold-300" />
            </div>
          </div>
        </div>
      </section>

      <section id="overview" className="border-y border-gold-500/10 bg-ink-975/70">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="max-w-2xl">
            <div className="terminal-header">Core Modules</div>
            <h2 className="mt-3 text-3xl text-white">Built for execution clarity</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              Each workspace module is designed to mimic a desk workflow: monitor, decide, execute, and review.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={BarChart3}
              title="Market Surveillance"
              description="Track multi-asset signals and spot shifts in volatility, yields, and dollar strength."
            />
            <FeatureCard
              icon={Bot}
              title="Agent Workbench"
              description="Use specialized AI agents for macro, technicals, risk, and sentiment."
            />
            <FeatureCard
              icon={Shield}
              title="Risk Controls"
              description="Check balances, estimate exposure, and keep trade execution aligned with limits."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8 max-w-2xl">
          <div className="terminal-header">Workflow</div>
          <h2 className="mt-3 text-3xl text-white">From signal to order in three steps</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StepCard
            index={1}
            title="Scan"
            description="Use market and news boards to identify directional pressure and catalyst windows."
          />
          <StepCard
            index={2}
            title="Validate"
            description="Query AI agents for scenario analysis, risk sizing, and confidence checks."
          />
          <StepCard
            index={3}
            title="Execute"
            description="Route to trade and balances screens with clear account-level context."
          />
        </div>
      </section>

      <footer className="border-t border-gold-500/15 bg-ink-975/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 text-xs font-mono uppercase tracking-[0.15em] text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Copyright {year} GBNX Gold Trader</span>
          <div className="flex items-center gap-4">
            <span className="text-emerald-300">Feed Online</span>
            <button onClick={openLoginModal} className="text-gold-300 transition hover:text-gold-200">
              Launch Terminal
            </button>
          </div>
        </div>
      </footer>

      <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
    </div>
  );
};

export default LandingPage;
