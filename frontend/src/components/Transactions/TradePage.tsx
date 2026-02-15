import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ArrowLeftRight, RefreshCcw } from 'lucide-react';
import { usePrice } from '../../contexts/PriceContext';

const OZ_PER_GRAM = 1 / 31.1034768;

interface BalanceEntry {
  asset: string;
  balance: number;
}

interface AccountBalance {
  account: string;
  balances: BalanceEntry[];
}

const formatNumber = (value: number, digits = 2) =>
  value.toLocaleString(undefined, { maximumFractionDigits: digits });

const formatSigned = (value: number, digits = 2) => {
  const formatted = formatNumber(Math.abs(value), digits);
  return `${value < 0 ? '-' : ''}${formatted}`;
};

const parseErrorMessage = async (res: Response): Promise<string> => {
  try {
    const json = await res.json();
    return json.detail || `Request failed: ${res.status}`;
  } catch {
    return (await res.text()) || `Request failed: ${res.status}`;
  }
};

const TradePage: React.FC = () => {
  const apiBaseUrl = useMemo(() => {
    const raw = (import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined) || '';
    return raw.replace(/\/+$/, '');
  }, []);

  // Use real-time WebSocket price
  const { goldPrice: liveGoldPrice, goldBid, goldAsk, lastUpdate, isConnected } = usePrice();

  const [goldGrams, setGoldGrams] = useState('');
  const [loading, setLoading] = useState(false);
  const [txnId, setTxnId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');

  // Use live price from WebSocket
  const goldPrice = liveGoldPrice;
  const goldPriceAt = lastUpdate;

  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState<string | null>(null);
  const [lastTrade, setLastTrade] = useState<{ type: 'buy' | 'sell'; grams: number; estUsd: number } | null>(null);

  const grams = Number(goldGrams || 0);
  const estOz = grams * OZ_PER_GRAM;
  const estUsd = goldPrice ? estOz * goldPrice : 0;

  const fetchBalances = async () => {
    if (!apiBaseUrl) return;
    setBalancesLoading(true);
    setBalancesError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/transactions/balances`);
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }
      const data = (await res.json()) as AccountBalance[];
      setBalances(data);
    } catch (err) {
      setBalancesError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setBalancesLoading(false);
    }
  };

  useEffect(() => {
    void fetchBalances();
  }, [apiBaseUrl]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBaseUrl) {
      setError('Missing VITE_BACKEND_API_BASE_URL');
      return;
    }

    setError(null);
    setTxnId(null);
    setLastTrade(null);

    if (grams <= 0) {
      setError('Gold quantity must be greater than zero.');
      return;
    }
    if (!goldPrice) {
      setError('Gold price has not been fetched yet.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${apiBaseUrl}/transactions/${tradeType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gold_grams: grams,
          price_usd_per_oz: goldPrice
        })
      });

      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }

      const data = await res.json();
      setTxnId(data.transaction_id);
      setLastTrade({ type: tradeType, grams, estUsd });
      setGoldGrams('');
      void fetchBalances();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const mcBalance = balances.find((balance) => balance.account === 'MC');
  const houseBalance = balances.find((balance) => balance.account === 'House Admin');

  const mcXauBalance = mcBalance?.balances.find((e) => e.asset === 'XAU')?.balance ?? 0;
  const mcUsdBalance = mcBalance?.balances.find((e) => e.asset === 'USD')?.balance ?? 0;
  const insufficientBalance =
    grams > 0 && goldPrice
      ? tradeType === 'buy'
        ? estUsd > mcUsdBalance
        : estOz > mcXauBalance
      : false;

  const assetRows = ['XAU', 'USD'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="text-xs font-semibold tracking-[0.18em] text-gold-500">TRADE</div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-white">Gold Trade Desk</h1>
          <p className="mt-2 text-sm text-gray-400">Create buys and sells while monitoring balance flow between MC and House.</p>
        </div>
        <button
          onClick={() => { void fetchBalances(); }}
          className="inline-flex items-center gap-2 rounded-xl border border-gold-500/20 bg-ink-850/55 px-4 py-2 text-sm font-semibold text-gold-300 hover:bg-gold-500/10 transition"
        >
          <RefreshCcw size={16} />
          Refresh Balances
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
        <form onSubmit={onSubmit} className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6">
          <div className="text-xs font-semibold tracking-[0.18em] text-gold-500">
            {tradeType === 'buy' ? 'BUY GOLD' : 'SELL GOLD'}
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-white">Execute trade</h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {(['buy', 'sell'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setTradeType(type);
                  setError(null);
                  setTxnId(null);
                  setLastTrade(null);
                }}
                className={clsx(
                  'rounded-full border px-4 py-1.5 text-xs font-semibold tracking-[0.16em] transition',
                  tradeType === type
                    ? type === 'sell'
                      ? 'border-rose-500/50 bg-rose-500/15 text-rose-200'
                      : 'border-gold-500/50 bg-gold-500/15 text-gold-300'
                    : 'border-ink-700/80 bg-ink-800/60 text-gray-400 hover:text-gold-300'
                )}
              >
                {type === 'buy' ? 'BUY' : 'SELL'}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4">
            <label className="text-sm text-gray-300">
              Gold (grams)
              <input
                value={goldGrams}
                onChange={(e) => { setGoldGrams(e.target.value); setTxnId(null); setLastTrade(null); }}
                type="number"
                step="0.01"
                min="0"
                className="mt-2 w-full rounded-xl bg-ink-800/60 border border-gold-500/10 px-3 py-2 text-white"
              />
            </label>

            <div className="rounded-xl bg-ink-800/60 border border-gold-500/10 px-3 py-2.5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Live price (USD / oz)</span>
                  <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                </div>
                {goldPriceAt && <div className="text-xs text-gray-500">Updated {goldPriceAt.toLocaleTimeString()}</div>}
                {!isConnected && <div className="text-xs text-amber-300">Connecting to price feed...</div>}
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gold-300">
                  {goldPrice ? `$${formatNumber(goldPrice, 2)}` : 'Waiting...'}
                </div>
                {goldBid && goldAsk && (
                  <div className="text-xs text-gray-500">
                    Bid: ${formatNumber(goldBid, 2)} / Ask: ${formatNumber(goldAsk, 2)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {insufficientBalance && (
            <div className="mt-4 text-xs text-rose-300">
              {tradeType === 'buy'
                ? `Insufficient USD balance. Available: $${formatNumber(mcUsdBalance)} · Required: $${formatNumber(estUsd)}`
                : `Insufficient XAU balance. Available: ${formatNumber(mcXauBalance, 3)} oz · Required: ${formatNumber(estOz, 3)} oz`}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={loading || !goldPrice || insufficientBalance}
              className={clsx(
                'inline-flex items-center justify-center rounded-xl border font-semibold px-5 py-2.5 transition disabled:opacity-60',
                tradeType === 'sell'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-200 hover:bg-rose-500/25'
                  : 'bg-gold-500/15 border-gold-500/30 text-gold-300 hover:bg-gold-500/25'
              )}
            >
              {loading ? 'Submitting...' : tradeType === 'buy' ? 'Buy Gold' : 'Sell Gold'}
            </button>
            <div className="text-sm text-gray-400">
              1 oz = 31.1035 g · {tradeType === 'buy' ? 'Est. USD total' : 'Est. USD proceeds'}:{' '}
              <span className="text-emerald-300 font-semibold">${formatNumber(estUsd)}</span>
            </div>
          </div>

          {error && <div className="mt-4 text-sm text-rose-300">{error}</div>}
          {txnId && lastTrade && (
            <div className="mt-6 rounded-xl border border-gold-500/20 bg-ink-800/60 p-4">
              <div className="text-xs font-semibold text-gold-400">Trade Confirmed</div>
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Type</span>
                  <span className={lastTrade.type === 'buy' ? 'font-semibold text-gold-300' : 'font-semibold text-rose-300'}>
                    {lastTrade.type === 'buy' ? 'Buy' : 'Sell'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Gold</span>
                  <span className="text-white">{formatNumber(lastTrade.grams, 2)} g</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Est. USD</span>
                  <span className="text-white">${formatNumber(lastTrade.estUsd)}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gold-500/10">
                <div className="text-xs text-gray-500">Transaction ID</div>
                <div className="mt-1 text-xs text-white break-all">{txnId}</div>
              </div>
            </div>
          )}
        </form>

        <div className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold tracking-[0.18em] text-gray-500">BALANCE SNAPSHOT</div>
              <h3 className="mt-2 text-xl font-semibold text-white">MC ↔ House</h3>
            </div>
            <ArrowLeftRight className="text-gold-400" size={20} />
          </div>

          {balancesError && <div className="mt-4 text-sm text-rose-300">{balancesError}</div>}
          {balancesLoading && <div className="mt-4 text-sm text-gray-400">Loading balances...</div>}

          {!balancesLoading && balances.length === 0 && !balancesError && (
            <div className="mt-4 text-sm text-gray-400">No ledger activity yet.</div>
          )}

          {(mcBalance || houseBalance) && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[mcBalance, houseBalance].filter((a): a is AccountBalance => !!a).map((account) => (
                <div
                  key={account.account}
                  className="rounded-xl border border-gold-500/10 bg-ink-800/60 p-4"
                >
                  <div className="text-sm font-semibold text-white">{account.account}</div>
                  <div className="mt-3 space-y-2 text-sm">
                    {account.balances.map((entry) => (
                      <div key={`${account.account}-${entry.asset}`} className="flex items-center justify-between">
                        <span className="text-gray-400">{entry.asset}</span>
                        <span
                          className={clsx(
                            'font-semibold',
                            entry.balance >= 0 ? 'text-emerald-300' : 'text-rose-300'
                          )}
                        >
                          {formatSigned(entry.balance, entry.asset === 'XAU' ? 3 : 2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {(mcBalance || houseBalance) && (
            <div className="mt-6 rounded-xl border border-gold-500/10 bg-ink-800/60 p-4">
              <div className="text-xs font-semibold tracking-[0.18em] text-gray-500">FLOW BY ASSET</div>
              <div className="mt-4 space-y-3">
                {assetRows.map((asset) => {
                  const mcEntry = mcBalance?.balances.find((entry) => entry.asset === asset);
                  const houseEntry = houseBalance?.balances.find((entry) => entry.asset === asset);
                  const mcValue = mcEntry?.balance ?? 0;
                  const houseValue = houseEntry?.balance ?? 0;
                  const mcPositive = mcValue >= 0;

                  return (
                    <div key={asset} className="flex items-center gap-3">
                      <div className="w-12 text-xs text-gray-400">{asset}</div>
                      <div
                        className={clsx(
                          'flex-1 rounded-full border px-4 py-2 text-sm font-semibold',
                          asset === 'XAU'
                            ? 'border-gold-500/30 text-gold-300'
                            : 'border-emerald-500/30 text-emerald-300'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span>MC {formatSigned(mcValue, asset === 'XAU' ? 3 : 2)}</span>
                          <span className="text-gray-500">→</span>
                          <span>House {formatSigned(houseValue, asset === 'XAU' ? 3 : 2)}</span>
                        </div>
                      </div>
                      <div className={clsx('text-xs', mcPositive ? 'text-emerald-300' : 'text-rose-300')}>
                        {mcPositive ? 'MC gains' : 'MC pays'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradePage;
