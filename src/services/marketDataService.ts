export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  last_updated: string;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdated: string;
}

export interface ForexRate {
  from: string;
  to: string;
  rate: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

export interface SearchResult {
  title: string;
  content: string;
  url: string;
}

export interface WebSearchResponse {
  answer: string;
  results: SearchResult[];
}

class MarketDataService {
  private readonly COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
  private readonly ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
  private readonly ALPHA_VANTAGE_API_KEY = 'T9C1HLZ9UPRJH2OB';
  private readonly TAVILY_API_URL = 'https://api.tavily.com/search';
  private readonly TAVILY_API_KEY = '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';

  // Crypto price mapping for common symbols
  private readonly CRYPTO_MAPPING: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'ADA': 'cardano',
    'DOT': 'polkadot',
    'LINK': 'chainlink',
    'XRP': 'ripple',
    'LTC': 'litecoin',
    'BCH': 'bitcoin-cash',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'MATIC': 'matic-network',
    'AVAX': 'avalanche-2',
    'ATOM': 'cosmos',
    'DOGE': 'dogecoin',
    'SHIB': 'shiba-inu',
    'USDT': 'tether',
    'USDC': 'usd-coin',
    'LUNA': 'terra-luna',
    'NEAR': 'near',
    'FTT': 'ftx-token'
  };

  async getCryptoPrice(symbol: string): Promise<CryptoPrice | null> {
    try {
      const coinId = this.CRYPTO_MAPPING[symbol.toUpperCase()] || symbol.toLowerCase();
      
      const response = await fetch(
        `${this.COINGECKO_BASE_URL}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch crypto price');
      }
      
      const data = await response.json();
      const coinData = data[coinId];
      
      if (!coinData) {
        return null;
      }
      
      return {
        id: coinId,
        symbol: symbol.toUpperCase(),
        name: coinId.charAt(0).toUpperCase() + coinId.slice(1).replace('-', ' '),
        current_price: coinData.usd,
        price_change_24h: coinData.usd_24h_change || 0,
        price_change_percentage_24h: coinData.usd_24h_change || 0,
        last_updated: new Date(coinData.last_updated_at * 1000).toISOString()
      };
    } catch (error) {
      console.error('Error fetching crypto price:', error);
      return null;
    }
  }

  async getStockPrice(symbol: string): Promise<StockQuote | null> {
    try {
      const response = await fetch(
        `${this.ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.ALPHA_VANTAGE_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch stock price');
      }
      
      const data = await response.json();
      const quote = data['Global Quote'];
      
      if (!quote || Object.keys(quote).length === 0) {
        return null;
      }
      
      const price = parseFloat(quote['05. price']);
      const change = parseFloat(quote['09. change']);
      const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
      
      return {
        symbol: quote['01. symbol'],
        price,
        change,
        changePercent,
        volume: parseInt(quote['06. volume']),
        lastUpdated: quote['07. latest trading day']
      };
    } catch (error) {
      console.error('Error fetching stock price:', error);
      return null;
    }
  }

  async getForexRate(from: string, to: string = 'USD'): Promise<ForexRate | null> {
    try {
      const response = await fetch(
        `${this.ALPHA_VANTAGE_BASE_URL}?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${this.ALPHA_VANTAGE_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch forex rate');
      }
      
      const data = await response.json();
      const exchangeRate = data['Realtime Currency Exchange Rate'];
      
      if (!exchangeRate) {
        return null;
      }
      
      return {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate: parseFloat(exchangeRate['5. Exchange Rate']),
        change: 0, // Alpha Vantage doesn't provide 24h change for forex in this endpoint
        changePercent: 0,
        lastUpdated: exchangeRate['6. Last Refreshed']
      };
    } catch (error) {
      console.error('Error fetching forex rate:', error);
      return null;
    }
  }

  async searchWeb(query: string): Promise<WebSearchResponse | null> {
    try {
      const response = await fetch(this.TAVILY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          api_key: this.TAVILY_API_KEY,
          query: query,
          search_depth: 'advanced',
          include_answer: true,
          max_results: 5,
          include_domains: ['reuters.com', 'bloomberg.com', 'cnbc.com', 'marketwatch.com', 'yahoo.com', 'cnn.com', 'bbc.com']
        })
      });

      if (!response.ok) {
        throw new Error('Failed to search web');
      }

      const data = await response.json();
      
      return {
        answer: data.answer || '',
        results: (data.results || []).map((r: any) => ({
          title: r.title,
          content: r.content,
          url: r.url
        }))
      };
    } catch (error) {
      console.error('Error searching web:', error);
      return null;
    }
  }

  // Enhanced detection of what type of asset/query the user is asking about
  detectQueryType(query: string): { type: 'crypto' | 'stock' | 'forex' | 'search' | 'news' | 'chat', symbol?: string, from?: string, to?: string, query?: string } {
    const normalizedQuery = query.toLowerCase();
    
    // News/search queries (check first to catch trading news)
    if (normalizedQuery.includes('news') || 
        normalizedQuery.includes('latest') || 
        normalizedQuery.includes('what happened') || 
        normalizedQuery.includes('search') ||
        normalizedQuery.includes('breaking') ||
        normalizedQuery.includes('market update') ||
        normalizedQuery.includes('economic') ||
        normalizedQuery.includes('fed') ||
        normalizedQuery.includes('inflation') ||
        normalizedQuery.includes('earnings')) {
      return { type: 'search', query: query };
    }
    
    // Common crypto keywords
    if (normalizedQuery.includes('bitcoin') || normalizedQuery.includes('btc')) {
      return { type: 'crypto', symbol: 'BTC' };
    }
    if (normalizedQuery.includes('ethereum') || normalizedQuery.includes('eth')) {
      return { type: 'crypto', symbol: 'ETH' };
    }
    if (normalizedQuery.includes('dogecoin') || normalizedQuery.includes('doge')) {
      return { type: 'crypto', symbol: 'DOGE' };
    }
    if (normalizedQuery.includes('cardano') || normalizedQuery.includes('ada')) {
      return { type: 'crypto', symbol: 'ADA' };
    }
    if (normalizedQuery.includes('solana') || normalizedQuery.includes('sol')) {
      return { type: 'crypto', symbol: 'SOL' };
    }
    
    // Stock queries with company names
    if (normalizedQuery.includes('apple') || normalizedQuery.includes('aapl')) {
      return { type: 'stock', symbol: 'AAPL' };
    }
    if (normalizedQuery.includes('tesla') || normalizedQuery.includes('tsla')) {
      return { type: 'stock', symbol: 'TSLA' };
    }
    if (normalizedQuery.includes('microsoft') || normalizedQuery.includes('msft')) {
      return { type: 'stock', symbol: 'MSFT' };
    }
    if (normalizedQuery.includes('google') || normalizedQuery.includes('googl') || normalizedQuery.includes('alphabet')) {
      return { type: 'stock', symbol: 'GOOGL' };
    }
    if (normalizedQuery.includes('amazon') || normalizedQuery.includes('amzn')) {
      return { type: 'stock', symbol: 'AMZN' };
    }
    if (normalizedQuery.includes('nvidia') || normalizedQuery.includes('nvda')) {
      return { type: 'stock', symbol: 'NVDA' };
    }
    if (normalizedQuery.includes('spy') || normalizedQuery.includes('s&p 500') || normalizedQuery.includes('s&p')) {
      return { type: 'stock', symbol: 'SPY' };
    }
    if (normalizedQuery.includes('qqq') || normalizedQuery.includes('nasdaq')) {
      return { type: 'stock', symbol: 'QQQ' };
    }
    
    // Forex queries
    if (normalizedQuery.includes('eurusd') || normalizedQuery.includes('eur/usd') || normalizedQuery.includes('euro dollar')) {
      return { type: 'forex', from: 'EUR', to: 'USD' };
    }
    if (normalizedQuery.includes('gbpusd') || normalizedQuery.includes('gbp/usd') || normalizedQuery.includes('pound dollar')) {
      return { type: 'forex', from: 'GBP', to: 'USD' };
    }
    if (normalizedQuery.includes('usdjpy') || normalizedQuery.includes('usd/jpy') || normalizedQuery.includes('dollar yen')) {
      return { type: 'forex', from: 'USD', to: 'JPY' };
    }
    if (normalizedQuery.includes('gold') || normalizedQuery.includes('xauusd') || normalizedQuery.includes('xau/usd')) {
      return { type: 'forex', from: 'XAU', to: 'USD' };
    }
    if (normalizedQuery.includes('silver') || normalizedQuery.includes('xagusd') || normalizedQuery.includes('xag/usd')) {
      return { type: 'forex', from: 'XAG', to: 'USD' };
    }
    if (normalizedQuery.includes('oil') || normalizedQuery.includes('crude') || normalizedQuery.includes('wti')) {
      return { type: 'forex', from: 'CL', to: 'USD' };
    }
    
    // Extract symbol patterns for unknown symbols
    const symbolMatch = query.match(/\b([A-Z]{2,5})\b/);
    if (symbolMatch) {
      const symbol = symbolMatch[1];
      
      // Check if it's a known crypto
      if (this.CRYPTO_MAPPING[symbol]) {
        return { type: 'crypto', symbol };
      }
      
      // Check for forex pairs
      if (symbol.length === 6 && /^[A-Z]{6}$/.test(symbol)) {
        return { type: 'forex', from: symbol.substring(0, 3), to: symbol.substring(3, 6) };
      }
      
      // Assume it's a stock
      return { type: 'stock', symbol };
    }
    
    return { type: 'chat' };
  }

  formatPriceResponse(data: CryptoPrice | StockQuote | ForexRate, type: 'crypto' | 'stock' | 'forex'): string {
    if (type === 'crypto') {
      const crypto = data as CryptoPrice;
      const changeEmoji = crypto.price_change_percentage_24h >= 0 ? '📈' : '📉';
      const changeSign = crypto.price_change_percentage_24h >= 0 ? '+' : '';
      
      return `🔸 **${crypto.name} (${crypto.symbol})**: $${crypto.current_price.toLocaleString()}
${changeEmoji} **24h Change**: ${changeSign}${crypto.price_change_percentage_24h.toFixed(2)}% (${changeSign}$${crypto.price_change_24h.toFixed(2)})
⏰ **Last Updated**: ${new Date(crypto.last_updated).toLocaleTimeString()}`;
    }
    
    if (type === 'stock') {
      const stock = data as StockQuote;
      const changeEmoji = stock.changePercent >= 0 ? '📈' : '📉';
      const changeSign = stock.changePercent >= 0 ? '+' : '';
      
      return `📊 **${stock.symbol}**: $${stock.price.toFixed(2)}
${changeEmoji} **Change**: ${changeSign}${stock.changePercent.toFixed(2)}% (${changeSign}$${stock.change.toFixed(2)})
📈 **Volume**: ${stock.volume.toLocaleString()}
⏰ **Last Updated**: ${stock.lastUpdated}`;
    }
    
    if (type === 'forex') {
      const forex = data as ForexRate;
      
      return `💱 **${forex.from}/${forex.to}**: ${forex.rate.toFixed(4)}
⏰ **Last Updated**: ${new Date(forex.lastUpdated).toLocaleTimeString()}`;
    }
    
    return 'Unable to format price data';
  }

  formatSearchResponse(searchData: WebSearchResponse): string {
    let response = '';
    
    if (searchData.answer) {
      response += `📰 **Latest Information:**\n${searchData.answer}\n\n`;
    }
    
    if (searchData.results && searchData.results.length > 0) {
      response += `📚 **Sources:**\n`;
      searchData.results.slice(0, 3).forEach((result, index) => {
        response += `${index + 1}. **${result.title}**\n`;
        response += `   ${result.content.substring(0, 150)}...\n`;
        response += `   🔗 [Read more](${result.url})\n\n`;
      });
    }
    
    return response;
  }

  async handleUserMessage(message: string): Promise<{ enrichedPrompt: string, hasLiveData: boolean }> {
    const queryType = this.detectQueryType(message);
    let enrichedPrompt = message;
    let hasLiveData = false;
    
    try {
      switch (queryType.type) {
        case 'crypto':
          if (queryType.symbol) {
            const cryptoData = await this.getCryptoPrice(queryType.symbol);
            if (cryptoData) {
              const formattedData = this.formatPriceResponse(cryptoData, 'crypto');
              enrichedPrompt = `User asked: "${message}"\n\n**LIVE MARKET DATA:**\n${formattedData}\n\nPlease respond naturally incorporating this live data.`;
              hasLiveData = true;
            }
          }
          break;
          
        case 'stock':
          if (queryType.symbol) {
            const stockData = await this.getStockPrice(queryType.symbol);
            if (stockData) {
              const formattedData = this.formatPriceResponse(stockData, 'stock');
              enrichedPrompt = `User asked: "${message}"\n\n**LIVE MARKET DATA:**\n${formattedData}\n\nPlease respond naturally incorporating this live data.`;
              hasLiveData = true;
            }
          }
          break;
          
        case 'forex':
          if (queryType.from && queryType.to) {
            const forexData = await this.getForexRate(queryType.from, queryType.to);
            if (forexData) {
              const formattedData = this.formatPriceResponse(forexData, 'forex');
              enrichedPrompt = `User asked: "${message}"\n\n**LIVE MARKET DATA:**\n${formattedData}\n\nPlease respond naturally incorporating this live data.`;
              hasLiveData = true;
            }
          }
          break;
          
        case 'search':
          if (queryType.query) {
            const searchResults = await this.searchWeb(queryType.query);
            if (searchResults) {
              const formattedSearch = this.formatSearchResponse(searchResults);
              enrichedPrompt = `User asked: "${message}"\n\n**LIVE WEB SEARCH RESULTS:**\n${formattedSearch}\n\nPlease respond naturally incorporating this information. Summarize the key points and provide insights.`;
              hasLiveData = true;
            }
          }
          break;
      }
    } catch (error) {
      console.error('Data fetch error:', error);
      // Continue with original message if data fetch fails
    }
    
    return { enrichedPrompt, hasLiveData };
  }
}

export const marketDataService = new MarketDataService();