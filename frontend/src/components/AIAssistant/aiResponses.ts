export const generateAIResponse = (userMessage: string): string => {
  const message = userMessage.toLowerCase();
  
  if (message.includes('trade') || message.includes('idea') || message.includes('suggestion')) {
    return `Based on current technicals, I see strong support at $2,320 and resistance at $2,360.

➡️ **Suggested Trade:**
• Entry: Buy near $2,325
• Target: $2,355  
• Stop Loss: $2,310
• Risk Level: Medium

The RSI is showing bullish momentum, but watch for any break below support.`;
  }
  
  if (message.includes('risk') || message.includes('danger') || message.includes('safe')) {
    return `**Current Risk Assessment:**

• Risk Level: Medium 📊
• Volatility Index: 14%
• Market Sentiment: Bullish but cautious

**Recommendation:** Consider using only 15% of your capital for this trade. The market is showing strength but maintain proper position sizing.`;
  }
  
  if (message.includes('chart') || message.includes('technical') || message.includes('analysis')) {
    return `**Technical Analysis Summary:**

📈 **Trend:** Short-term bullish
📊 **RSI:** 62 (showing momentum)
🎯 **MACD:** Positive crossover
📉 **Bollinger Bands:** Price near upper band

Support levels: $2,320, $2,300
Resistance levels: $2,360, $2,380

Overall outlook is positive for the next 24-48 hours.`;
  }
  
  if (message.includes('news') || message.includes('market') || message.includes('update')) {
    return `**Latest Gold Market News:**

🏦 **Federal Reserve:** Inflation data shows slight cooling
💱 **USD Index:** Weakening, supporting gold prices
🌍 **Global Events:** Geopolitical tensions remain elevated
📊 **Investment Flow:** ETF inflows increased 12% this week

These factors are currently supporting gold's bullish momentum.`;
  }
  
  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    return `Hello! 👋 I'm here to help with your gold trading decisions. 

Current market snapshot:
• Gold: $2,345 (+0.8%)
• Trend: Bullish
• Next support: $2,320

What would you like to know? I can provide trade ideas, risk analysis, or market updates!`;
  }
  
  if (message.includes('price') || message.includes('forecast') || message.includes('prediction')) {
    return `**Price Outlook:**

📊 **Short-term (24-48h):** $2,355-$2,370
📈 **Weekly target:** $2,380-$2,400
⚠️ **Key support:** $2,320 (must hold)

Factors to watch:
• USD strength/weakness
• Fed policy signals  
• Global economic data

The trend remains bullish as long as we stay above $2,320.`;
  }
  
  // Default response
  return `I understand you're asking about "${userMessage}". 

I can help you with:
• Trade ideas and entry/exit points
• Risk assessment and position sizing
• Technical analysis and chart patterns
• Market news and updates
• Price forecasts and targets

What specific aspect would you like me to focus on?`;
};