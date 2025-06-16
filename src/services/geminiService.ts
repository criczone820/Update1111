export interface ExtractedTradeData {
  symbol: string;
  type: string;
  volumeLot: number;
  openPrice: number;
  closePrice: number | null;
  tp: number | null;
  sl: number | null;
  position: string;
  openTime: string;
  closeTime: string | null;
  reason: string;
  pnlUsd: number;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

class GeminiService {
  private readonly API_KEY = 'AIzaSyBimJ-AkVtckt-yUpKd38oXqAmHnAJVOPo';
  private readonly API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

  async extractTradeDataFromImage(base64Image: string): Promise<ExtractedTradeData> {
    const prompt = `Analyze this trading screenshot and extract ALL visible trade information. Look carefully for:

- Currency pairs, stock symbols, or crypto symbols (e.g., XAUUSD, EURUSD, BTCUSD)
- Buy/Sell or Long/Short positions
- Volume/Lot size (e.g., 0.01, 1.0, 10.0)
- Open price and Close price (if position is closed)
- Take Profit (TP) and Stop Loss (SL) levels
- Position status (Open/Closed)
- Open time and Close time (full date/time strings)
- Reason for closure (TP, SL, Early Close, Other)
- Profit & Loss in USD

CRITICAL: Return ONLY valid JSON in this EXACT format. Do not include any explanations or markdown formatting:

{
  "symbol": "extracted_symbol",
  "type": "Buy_or_Sell",
  "volumeLot": number_value,
  "openPrice": number_value,
  "closePrice": number_or_null,
  "tp": number_or_null,
  "sl": number_or_null,
  "position": "Open_or_Closed",
  "openTime": "full_datetime_string",
  "closeTime": "full_datetime_string_or_null",
  "reason": "TP_or_SL_or_Early_Close_or_Other",
  "pnlUsd": number_value
}

Rules:
- Use null for missing values
- Extract only clear, visible numbers
- Convert Buy→Buy, Sell→Sell
- Position is "Closed" if closePrice exists, otherwise "Open"
- Reason should be "TP" if closed at take profit, "SL" if stopped out, "Early Close" if manually closed, "Other" if unclear`;

    try {
      const response = await fetch(`${this.API_URL}?key=${this.API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Image
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 32,
            topP: 1,
            maxOutputTokens: 1000,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                symbol: { type: "string" },
                type: { type: "string" },
                volumeLot: { type: "number" },
                openPrice: { type: "number" },
                closePrice: { type: ["number", "null"] },
                tp: { type: ["number", "null"] },
                sl: { type: ["number", "null"] },
                position: { type: "string" },
                openTime: { type: "string" },
                closeTime: { type: ["string", "null"] },
                reason: { type: "string" },
                pnlUsd: { type: "number" }
              },
              required: ["symbol", "type", "volumeLot", "openPrice", "position", "openTime", "reason", "pnlUsd"]
            }
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data: GeminiResponse = await response.json();
      const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!extractedText) {
        throw new Error('No response from Gemini API');
      }

      // Parse the JSON response
      const extractedData: ExtractedTradeData = JSON.parse(extractedText);
      
      // Validate required fields
      if (!extractedData.symbol || !extractedData.type || !extractedData.openPrice) {
        throw new Error('Missing required trade data in extraction');
      }

      return extractedData;
    } catch (error) {
      console.error('Gemini extraction error:', error);
      throw new Error('Failed to extract trade data from image. Please ensure the image shows clear trading information.');
    }
  }

  async getChatResponse(message: string, context?: string): Promise<string> {
    const systemPrompt = `You are Sydney, a professional AI trading assistant. You are knowledgeable about financial markets, trading strategies, risk management, and market analysis. 

${context ? `Context: ${context}` : ''}

Respond in a helpful, professional manner. Keep responses concise but informative. Use appropriate emojis sparingly to maintain professionalism.`;

    try {
      const response = await fetch(`${this.API_URL}?key=${this.API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\nUser message: ${message}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 500,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data: GeminiResponse = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I cannot process your request right now.';
    } catch (error) {
      console.error('Gemini chat error:', error);
      return 'I apologize, but I cannot process your request right now. Please try again later.';
    }
  }
}

export const geminiService = new GeminiService();