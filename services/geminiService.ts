
import { GoogleGenAI, Type } from "@google/genai";
import { StockDetail, NewsItem } from "../types";
import { getRealStockNews } from "./fmpService";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Cache to avoid hitting API limits too fast during demo
const newsCache: Record<string, StockDetail> = {};

export const fetchStockInsights = async (symbol: string, price: number, change: number, fmpApiKey?: string): Promise<StockDetail> => {
  const cacheKey = `${symbol}-${!!fmpApiKey}`;
  if (newsCache[cacheKey]) {
    return newsCache[cacheKey];
  }

  let realNews: NewsItem[] = [];
  if (fmpApiKey) {
    try {
      realNews = await getRealStockNews(symbol, fmpApiKey);
    } catch (e) {
      console.warn("Failed to fetch real news, falling back to generation");
    }
  }

  if (!apiKey) {
    // Fallback mock data if no GEMINI API key is provided
    console.warn("No Gemini API Key found, returning mock data.");
    return {
      peRatio: 25.4,
      marketCap: "2.4T",
      dividendYield: "0.5%",
      outlook: "Technical indicators suggest a consolidation phase. Moving averages are converging.",
      news: realNews.length > 0 ? realNews : [
        { headline: `${symbol} announces new strategic partnership`, source: "MarketWatch", sentiment: "positive" },
        { headline: "Tech sector faces headwinds amid rate hike fears", source: "Bloomberg", sentiment: "negative" },
        { headline: "Analyst upgrades price target", source: "Reuters", sentiment: "positive" }
      ]
    };
  }

  try {
    const model = 'gemini-2.5-flash';
    
    let prompt = "";
    
    if (realNews.length > 0) {
        // RAG: Use real news to generate outlook
        // We ask Gemini to retain the URL in the output if it selects the news
        const newsContext = realNews.map(n => `- ${n.headline} (${n.source}) [URL: ${n.url}]`).join('\n');
        prompt = `
          Analyze stock ${symbol} (Price: $${price}, Change: ${change}%).
          
          Here is the latest real news for this stock:
          ${newsContext}

          1. Based on this news and price action, provide a 2-sentence technical/fundamental outlook.
          2. Estimate realistic P/E, Market Cap, Dividend Yield if exact data not known, or use generic knowledge.
          3. Return the news items provided, classifying their sentiment. IMPORTANT: You MUST retain the URL field exactly as provided.
        `;
    } else {
        // Generation Mode
        prompt = `
          Generate a financial summary for stock ticker ${symbol} (Current Price: $${price}, Daily Change: ${change}%).
          1. Estimate realistic P/E Ratio, Market Cap, and Dividend Yield.
          2. Provide a 2-sentence technical outlook based on general market trends for this type of stock.
          3. Generate 3 likely news headlines that would explain today's price movement.
        `;
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            peRatio: { type: Type.NUMBER },
            marketCap: { type: Type.STRING },
            dividendYield: { type: Type.STRING },
            outlook: { type: Type.STRING },
            news: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  headline: { type: Type.STRING },
                  source: { type: Type.STRING },
                  sentiment: { type: Type.STRING, enum: ["positive", "negative", "neutral"] },
                  url: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as StockDetail;
      
      // Safety check: If we have real news but Gemini stripped URLs or failed to return news, fallback to raw real news
      if (realNews.length > 0) {
        if (!data.news || data.news.length === 0 || !data.news[0].url) {
             // Merge logic: Keep Gemini's sentiment/stats if possible, but restore original news structure
             data.news = realNews;
        }
      }
      
      newsCache[cacheKey] = data;
      return data;
    }
    throw new Error("No data returned");
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      peRatio: 0,
      marketCap: "N/A",
      dividendYield: "N/A",
      outlook: "Analysis currently unavailable.",
      news: realNews
    };
  }
};

export const fetchQuickNews = async (symbol: string, fmpApiKey?: string): Promise<NewsItem[]> => {
  // If we have real data access, fetch real news directly for speed
  if (fmpApiKey) {
      return await getRealStockNews(symbol, fmpApiKey);
  }
  
  // Otherwise use cached AI generated news
  if (newsCache[`${symbol}-false`]) return newsCache[`${symbol}-false`].news;
  
  // Or trigger a full fetch (expensive for just a tooltip, but necessary fallback)
  const details = await fetchStockInsights(symbol, 0, 0);
  return details.news;
};
