import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { RefreshCcw } from 'lucide-react';

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

const BalancesPage: React.FC = () => {
  const apiBaseUrl = useMemo(() => {
    const raw = (import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined) || '';
    return raw.replace(/\/+$/, '');
  }, []);

  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeAccount, setActiveAccount] = useState('MC');
  const [detail, setDetail] = useState<AccountBalance | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchBalances = async () => {
    if (!apiBaseUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/transactions/balances`);
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }
      const data = (await res.json()) as AccountBalance[];
      setBalances(data);
      if (!data.find((entry) => entry.account === activeAccount) && data.length > 0) {
        setActiveAccount(data[0].account);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (account: string) => {
    if (!apiBaseUrl || !account) return;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/transactions/balance/${encodeURIComponent(account)}`);
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }
      const data = (await res.json()) as AccountBalance;
      setDetail(data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    void fetchBalances();
  }, [apiBaseUrl]);

  useEffect(() => {
    if (activeAccount) {
      void fetchDetail(activeAccount);
    }
  }, [activeAccount, apiBaseUrl]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="text-xs font-semibold tracking-[0.18em] text-gold-500">BALANCES</div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-white">Ledger Balance Overview</h1>
          <p className="mt-2 text-sm text-gray-400">Live ledger sums per account and asset.</p>
        </div>
        <button
          onClick={fetchBalances}
          className="inline-flex items-center gap-2 rounded-xl border border-gold-500/20 bg-ink-850/55 px-4 py-2 text-sm font-semibold text-gold-300 hover:bg-gold-500/10 transition"
        >
          <RefreshCcw size={16} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
        <div className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold tracking-[0.18em] text-gray-500">ALL ACCOUNTS</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">Snapshot</h2>
            </div>
          </div>

          {error && <div className="mt-4 text-sm text-rose-300">{error}</div>}
          {loading && <div className="mt-4 text-sm text-gray-400">Loading balances...</div>}

          {!loading && balances.length === 0 && !error && (
            <div className="mt-4 text-sm text-gray-400">No ledger activity yet.</div>
          )}

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {balances.map((account) => (
              <button
                key={account.account}
                onClick={() => setActiveAccount(account.account)}
                className={clsx(
                  'rounded-xl border p-4 text-left transition',
                  activeAccount === account.account
                    ? 'border-gold-500/30 bg-gold-500/5'
                    : 'border-gold-500/10 bg-ink-800/60 hover:bg-ink-800/80'
                )}
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
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6">
          <div className="text-xs font-semibold tracking-[0.18em] text-gray-500">ACCOUNT DETAIL</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">{activeAccount || 'Select account'}</h2>

          {detailError && <div className="mt-4 text-sm text-rose-300">{detailError}</div>}
          {detailLoading && <div className="mt-4 text-sm text-gray-400">Loading account detail...</div>}

          {!detailLoading && detail && (
            <div className="mt-6 rounded-xl border border-gold-500/10 bg-ink-800/60 p-4">
              <div className="text-xs font-semibold tracking-[0.18em] text-gray-500">ASSETS</div>
              <div className="mt-4 space-y-3">
                {detail.balances.length === 0 && (
                  <div className="text-sm text-gray-400">No balances yet for this account.</div>
                )}
                {detail.balances.map((entry) => (
                  <div key={`${detail.account}-${entry.asset}`} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-300">{entry.asset}</div>
                      <div className="text-xs text-gray-500">Ledger sum</div>
                    </div>
                    <div
                      className={clsx(
                        'text-lg font-semibold',
                        entry.balance >= 0 ? 'text-emerald-300' : 'text-rose-300'
                      )}
                    >
                      {formatSigned(entry.balance, entry.asset === 'XAU' ? 3 : 2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BalancesPage;
