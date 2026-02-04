import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ArrowLeftRight, RefreshCcw } from 'lucide-react';

const OZ_PER_GRAM = 1 / 31.1035;

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

  const [goldGrams, setGoldGrams] = useState('');
  const [loading, setLoading] = useState(false);
  const [txnId, setTxnId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [goldPrice, setGoldPrice] = useState<number | null>(null);
  const [goldPriceLoading, setGoldPriceLoading] = useState(false);
  const [goldPriceError, setGoldPriceError] = useState<string | null>(null);

  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState<string | null>(null);

  const grams = Number(goldGrams || 0);
  const estUsd = goldPrice ? grams * OZ_PER_GRAM * goldPrice : 0;

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

  const fetchGoldPrice = async () => {
    if (!apiBaseUrl) return;
    setGoldPriceLoading(true);
    setGoldPriceError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/transactions/gold-price`);
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }
      const data = (await res.json()) as { price_usd_per_oz: number };
      setGoldPrice(data.price_usd_per_oz);
    } catch (err) {
      setGoldPriceError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setGoldPriceLoading(false);
    }
  };

  useEffect(() => {
    void fetchBalances();
    void fetchGoldPrice();
  }, [apiBaseUrl]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBaseUrl) {
      setError('Missing VITE_BACKEND_API_BASE_URL');
      return;
    }

    setError(null);
    setTxnId(null);

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
      const res = await fetch(`${apiBaseUrl}/transactions/buy`, {
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

  const assetRows = ['XAU', 'USD'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="text-xs font-semibold tracking-[0.18em] text-gold-500">TRADE</div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-white">Gold Trade Desk</h1>
          <p className="mt-2 text-sm text-gray-400">Create buys and monitor balance flow between MC and House.</p>
        </div>
        <button
          onClick={() => { void fetchBalances(); void fetchGoldPrice(); }}
          className="inline-flex items-center gap-2 rounded-xl border border-gold-500/20 bg-ink-850/55 px-4 py-2 text-sm font-semibold text-gold-300 hover:bg-gold-500/10 transition"
        >
          <RefreshCcw size={16} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
        <form onSubmit={onSubmit} className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6">
          <div className="text-xs font-semibold tracking-[0.18em] text-gold-500">BUY GOLD</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">Execute trade</h2>

          <div className="mt-6 grid gap-4">
            <label className="text-sm text-gray-300">
              Gold (grams)
              <input
                value={goldGrams}
                onChange={(e) => setGoldGrams(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                className="mt-2 w-full rounded-xl bg-ink-800/60 border border-gold-500/10 px-3 py-2 text-white"
              />
            </label>

            <div className="rounded-xl bg-ink-800/60 border border-gold-500/10 px-3 py-2.5 flex items-center justify-between">
              <span className="text-sm text-gray-400">Live price (USD / oz)</span>
              <span className="text-sm font-semibold text-gold-300">
                {goldPriceLoading ? 'Fetching...' : goldPriceError ? '—' : goldPrice ? `$${formatNumber(goldPrice, 2)}` : '—'}
              </span>
            </div>
            {goldPriceError && <div className="text-xs text-rose-300">{goldPriceError}</div>}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={loading || !goldPrice}
              className="inline-flex items-center justify-center rounded-xl bg-gold-500/15 border border-gold-500/30 text-gold-300 font-semibold px-5 py-2.5 hover:bg-gold-500/25 transition disabled:opacity-60"
            >
              {loading ? 'Submitting...' : 'Buy Gold'}
            </button>
            <div className="text-sm text-gray-400">
              1 oz = 31.1035 g · Est. USD total: <span className="text-emerald-300 font-semibold">${formatNumber(estUsd)}</span>
            </div>
          </div>

          {error && <div className="mt-4 text-sm text-rose-300">{error}</div>}
          {txnId && (
            <div className="mt-6 rounded-xl border border-gold-500/20 bg-ink-800/60 p-4">
              <div className="text-xs text-gold-400">Transaction ID</div>
              <div className="mt-1 text-sm text-white break-all">{txnId}</div>
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
