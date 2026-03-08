import { GoogleGenAI } from "@google/genai";
import { NewsItem } from '../types';

// IMPORTANT: All Gemini API calls must be made from the client-side.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

let newsCache: { data: NewsItem[]; timestamp: number } | null = null;
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes

/**
 * Fetches raw news articles from the server-side proxy.
 */
async function fetchRawNewsFromServer(): Promise<any[]> {
  try {
    const response = await fetch('/api/news-raw');
    if (!response.ok) {
      console.error(`Failed to fetch raw news with status: ${response.status}`);
      return [];
    }
    const data = await response.json();
    return data.articles || [];
  } catch (error) {
    console.error("Error fetching raw news:", error);
    return [];
  }
}

/**
 * Analyzes a batch of raw news articles using the Gemini API on the client-side.
 */
async function analyzeNewsWithGemini(articles: any[]): Promise<NewsItem[]> {
  if (articles.length === 0) {
    return [];
  }

  // Limit to top 8 articles to significantly speed up processing
  const topArticles = articles.slice(0, 8);

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the following news articles and return a JSON array of objects with these fields: title, url, source, publishedAt (ISO), region (WEST/EAST/GLOBAL), sentiment (POSITIVE/NEGATIVE/NEUTRAL), impactExplanation (1 sentence), impactScore (-100 to 100), image (use original if available). Articles: ${JSON.stringify(topArticles.map(a => ({ title: a.title, content: a.description, url: a.url, source: a.source.name, publishedAt: a.publishedAt, urlToImage: a.urlToImage })))}`,
      config: { responseMimeType: "application/json" }
    });
    
    const parsed = JSON.parse(result.text);

    if (Array.isArray(parsed)) {
      return parsed.map((item: any, idx: number) => ({
        id: String(idx),
        title: item.title || "Market Update",
        url: item.url || "#",
        source: item.source || "Feed",
        publishedAt: item.publishedAt || new Date().toISOString(),
        region: item.region || "GLOBAL",
        sentiment: item.sentiment || "NEUTRAL",
        impactExplanation: item.impactExplanation || "",
        impactScore: item.impactScore || 0,
        image: item.image || `https://picsum.photos/seed/${idx}/800/600`,
        sourceType: "NEWS_API_HYBRID"
      }));
    }
    return [];
  } catch (error) {
    console.error("Error analyzing news with Gemini:", error);
    return [];
  }
}

/**
 * Fetches news directly from Gemini Search as a fallback when raw news APIs are missing.
 */
async function fetchNewsFromGeminiSearch(): Promise<NewsItem[]> {
  try {
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search for the latest global financial and macroeconomic news from the last 24 hours. 
      Return a JSON array of 10 objects with these fields: title, url, source, publishedAt (ISO), region (WEST/EAST/GLOBAL), sentiment (POSITIVE/NEGATIVE/NEUTRAL), impactExplanation (1 sentence), impactScore (-100 to 100), image (use a relevant stock photo URL if none found).`,
      config: { 
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json" 
      }
    });
    
    const parsed = JSON.parse(result.text);

    if (Array.isArray(parsed)) {
      return parsed.map((item: any, idx: number) => ({
        id: `gemini-${idx}-${Date.now()}`,
        title: item.title || "Market Update",
        url: item.url || "#",
        source: item.source || "Gemini Intelligence",
        publishedAt: item.publishedAt || new Date().toISOString(),
        region: item.region || "GLOBAL",
        sentiment: item.sentiment || "NEUTRAL",
        impactExplanation: item.impactExplanation || "",
        impactScore: item.impactScore || 0,
        image: item.image || `https://picsum.photos/seed/gemini-${idx}/800/600`,
        sourceType: "GEMINI_SEARCH_FALLBACK"
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching news from Gemini Search:", error);
    return [];
  }
}

/**
 * Final fallback news items if all APIs and Gemini Search fail.
 */
const getStaticFallbackNews = (): NewsItem[] => [
  {
    id: 'static-1',
    title: 'Global Markets Await Central Bank Guidance Amid Inflation Data',
    url: '#',
    source: 'LUMIA Intelligence',
    publishedAt: new Date().toISOString(),
    region: 'GLOBAL',
    sentiment: 'NEUTRAL',
    impactExplanation: 'Market participants are pricing in potential rate adjustments based on upcoming CPI releases.',
    impactScore: 5,
    image: 'https://picsum.photos/seed/market1/800/600',
    sourceType: 'STATIC_FALLBACK'
  },
  {
    id: 'static-2',
    title: 'Tech Sector Momentum Continues as AI Infrastructure Spending Surges',
    url: '#',
    source: 'LUMIA Intelligence',
    publishedAt: new Date().toISOString(),
    region: 'WEST',
    sentiment: 'POSITIVE',
    impactExplanation: 'Increased capital expenditure in data centers is driving growth across the semiconductor supply chain.',
    impactScore: 15,
    image: 'https://picsum.photos/seed/tech1/800/600',
    sourceType: 'STATIC_FALLBACK'
  },
  {
    id: 'static-3',
    title: 'Energy Markets Stabilize Following Supply Chain Optimization Reports',
    url: '#',
    source: 'LUMIA Intelligence',
    publishedAt: new Date().toISOString(),
    region: 'GLOBAL',
    sentiment: 'NEUTRAL',
    impactExplanation: 'Improved logistics and inventory management are offsetting geopolitical volatility in crude markets.',
    impactScore: -2,
    image: 'https://picsum.photos/seed/energy1/800/600',
    sourceType: 'STATIC_FALLBACK'
  }
];

/**
 * Main function to get processed news, using a client-side cache.
 */
export async function getProcessedNews() {
  if (newsCache && (Date.now() - newsCache.timestamp < CACHE_TTL)) {
    return newsCache.data;
  }

  try {
    const rawArticles = await fetchRawNewsFromServer();
    let processedNews: NewsItem[] = [];

    if (rawArticles.length === 0) {
      console.log("No raw news articles found. Falling back to Gemini Search...");
      processedNews = await fetchNewsFromGeminiSearch();
    } else {
      processedNews = await analyzeNewsWithGemini(rawArticles);
    }

    // Final safety check: if still empty, use static fallback
    if (processedNews.length === 0) {
      console.log("Gemini Search fallback failed or returned no results. Using static fallback.");
      processedNews = getStaticFallbackNews();
    }

    if (processedNews.length > 0) {
      newsCache = { data: processedNews, timestamp: Date.now() };
    }
    return processedNews;
  } catch (error) {
    console.error("Error in getProcessedNews pipeline:", error);
    if (newsCache) return newsCache.data;
    return getStaticFallbackNews(); // Return static fallback on total failure
  }
}
