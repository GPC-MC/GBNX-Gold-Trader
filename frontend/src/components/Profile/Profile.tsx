import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Award, TrendingUp, Calendar, Target } from 'lucide-react';

const Profile: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Total Trades', value: '247', icon: TrendingUp, color: 'text-blue-400' },
    { label: 'Win Rate', value: '68%', icon: Target, color: 'text-green-400' },
    { label: 'Total Profit', value: '$12,450', icon: Award, color: 'text-yellow-400' },
    { label: 'Days Active', value: '89', icon: Calendar, color: 'text-purple-400' }
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
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-2xl p-8 mb-8">
          <div className="flex items-center space-x-6">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-24 h-24 rounded-full border-4 border-yellow-500"
              />
            ) : (
              <div className="w-24 h-24 bg-yellow-500 rounded-full flex items-center justify-center">
                <User size={48} className="text-black" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{user?.name || 'Gold Trader Pro'}</h1>
              <p className="text-gray-300">Professional Gold Trader</p>
              <p className="text-sm text-gray-400">{user?.email || 'trader@goldai.com'}</p>
              <p className="text-sm text-gray-400">Member since January 2024</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
                <Icon className={color} size={24} />
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
              </div>
              <div className="text-gray-400 text-sm">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Achievements */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Award className="text-yellow-400" size={24} />
              <h2 className="text-xl font-semibold text-yellow-400">Achievements</h2>
            </div>
            
            <div className="space-y-4">
              {achievements.map((achievement, index) => (
                <div key={index} className={`bg-gray-700 rounded-xl p-4 border ${
                  achievement.earned ? 'border-yellow-500/30' : 'border-gray-600'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`font-medium ${achievement.earned ? 'text-yellow-400' : 'text-gray-400'}`}>
                        {achievement.title}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">{achievement.description}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      achievement.earned ? 'bg-yellow-500' : 'bg-gray-600'
                    }`}>
                      {achievement.earned ? '✓' : '○'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Trades */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <div className="flex items-center space-x-2 mb-6">
              <TrendingUp className="text-yellow-400" size={24} />
              <h2 className="text-xl font-semibold text-yellow-400">Recent Trades</h2>
            </div>
            
            <div className="space-y-3">
              {recentTrades.map((trade, index) => (
                <div key={index} className="bg-gray-700 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        trade.type === 'Buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.type}
                      </span>
                      <span className="text-white font-medium">{trade.amount}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {trade.date} • ${trade.price}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-semibold">{trade.profit}</div>
                    <div className="text-xs text-gray-400 capitalize">{trade.status}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl transition-colors duration-200">
              View All Trades
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;