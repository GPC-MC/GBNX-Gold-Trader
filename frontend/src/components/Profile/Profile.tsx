import React from 'react';
import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';
import { User, Award, TrendingUp, Calendar, Target } from 'lucide-react';

const Profile: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Total Trades', value: '247', icon: TrendingUp, color: 'text-sky-300' },
    { label: 'Win Rate', value: '68%', icon: Target, color: 'text-emerald-300' },
    { label: 'Total Profit', value: '$12,450', icon: Award, color: 'text-gold-300' },
    { label: 'Days Active', value: '89', icon: Calendar, color: 'text-terminal-cyan' }
  ];

  const achievements = [
    { title: 'First Trade', description: 'Completed your first gold trade', earned: true },
    { title: 'Profit Streak', description: '5 profitable trades in a row', earned: true },
    { title: 'Risk Manager', description: 'Never exceeded 10% portfolio risk', earned: true },
    { title: 'AI Expert', description: 'Used AI assistant 50+ times', earned: false }
  ];

  const recentTrades = [
    { date: '2024-01-15', type: 'Buy', amount: '1.2 oz', price: '$2,340', profit: '+$180', status: 'closed' },
    { date: '2024-01-14', type: 'Sell', amount: '0.8 oz', price: '$2,335', profit: '+$95', status: 'closed' },
    { date: '2024-01-13', type: 'Buy', amount: '2.0 oz', price: '$2,320', profit: '+$320', status: 'closed' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header */}
      <div className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-8 mb-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-6">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-24 h-24 rounded-full border-2 border-gold-500/30"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border border-gold-500/25 bg-gold-500/10 flex items-center justify-center">
                <User size={46} className="text-gold-300" />
              </div>
            )}
            <div>
              <div className="text-xs font-semibold tracking-[0.18em] text-gold-500">PROFILE</div>
              <h1 className="mt-2 text-3xl font-bold text-white">{user?.name || 'Gold Trader Pro'}</h1>
              <p className="mt-1 text-sm text-gray-400">Professional Gold Trader</p>
              <p className="mt-1 text-sm text-gray-500">{user?.email || 'trader@goldai.com'}</p>
              <p className="mt-1 text-xs text-gray-500">Member since January 2024</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-gold-500/10 bg-ink-850/45 p-6 shadow-panel backdrop-blur-sm transition-all duration-200 hover:border-gold-500/20"
          >
            <div className="flex items-center justify-between mb-4">
              <Icon className={color} size={22} />
              <div className={clsx('text-2xl font-bold', color)}>{value}</div>
            </div>
            <div className="text-gray-400 text-sm">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Achievements */}
        <div className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <Award className="text-gold-300" size={22} />
            <h2 className="text-xl font-semibold text-white">Achievements</h2>
          </div>

          <div className="space-y-4">
            {achievements.map((achievement, index) => (
              <div
                key={index}
                className={clsx(
                  'rounded-xl p-4 border bg-ink-800/55',
                  achievement.earned ? 'border-gold-500/18' : 'border-gold-500/10'
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className={clsx('font-semibold', achievement.earned ? 'text-gray-100' : 'text-gray-400')}>
                      {achievement.title}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">{achievement.description}</p>
                  </div>
                  <div
                    className={clsx(
                      'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border',
                      achievement.earned
                        ? 'bg-gold-500/15 border-gold-500/25 text-gold-300'
                        : 'bg-gold-500/10 border-gold-500/20 text-gray-400'
                    )}
                  >
                    {achievement.earned ? '✓' : '•'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="rounded-2xl border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="text-gold-300" size={22} />
            <h2 className="text-xl font-semibold text-white">Recent Trades</h2>
          </div>

          <div className="space-y-3">
            {recentTrades.map((trade, index) => (
              <div
                key={index}
                className="rounded-xl border border-gold-500/10 bg-ink-800/55 p-4 flex items-center justify-between gap-6"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={clsx(
                        'px-2 py-1 rounded text-xs font-semibold border',
                        trade.type === 'Buy'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/20'
                      )}
                    >
                      {trade.type}
                    </span>
                    <span className="text-gray-100 font-semibold">{trade.amount}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {trade.date} • {trade.price}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-300 font-semibold">{trade.profit}</div>
                  <div className="text-xs text-gray-500 capitalize">{trade.status}</div>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-4 rounded-xl border border-gold-500/15 bg-ink-900/40 text-gray-100 py-2.5 font-semibold transition hover:bg-ink-850/45 hover:border-gold-500/25">
            View All Trades
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
