import express from 'express';
import { createServer as createViteServer } from 'vite';
import admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let adminInitialized = false;
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
  if (Object.keys(serviceAccount).length > 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    adminInitialized = true;
  }
} catch (e) {
  console.warn("Firebase Admin not initialized: missing or invalid service account JSON");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function createServer() {
  const app = express();
  app.use(express.json());

  // Middleware to verify Firebase token
  const verifyToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!adminInitialized) {
      // If admin is not initialized, we allow the request in development mode or return a specific error
      return next(); 
    }
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) return res.status(401).send('Unauthorized');
    try {
      await admin.auth().verifyIdToken(idToken);
      next();
    } catch (error) {
      res.status(401).send('Unauthorized');
    }
  };

  // Proxy endpoint for research
  app.post('/api/research', verifyToken, async (req, res) => {
    const { ticker } = req.body;
    if (!ticker) return res.status(400).json({ error: 'Ticker is required' });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Provide deep institutional research for ${ticker}. Return ONLY a JSON object with keys: summary, sentiment, key_risks (array), and growth_drivers (array).`,
        config: { 
          tools: [{ googleSearch: {} }], 
          responseMimeType: "application/json" 
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error('Empty response from AI');
      }

      try {
        const cleanedJson = JSON.parse(text.replace(/```json|```/g, '').trim());
        res.json(cleanedJson);
      } catch (parseError) {
        console.error('JSON Parse Error from AI:', text);
        res.status(500).json({ error: 'AI returned invalid data format', raw: text });
      }
    } catch (error) {
      console.error('Research API Error:', error);
      res.status(500).json({ error: 'Failed to fetch research' });
    }
  });

  // Simple in-memory cache for news
  let newsCache: { data: any; timestamp: number } | null = null;
  const NEWS_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  // API route to securely fetch news from multiple providers
  app.get('/api/news-raw', async (req, res) => {
    try {
      // Check cache first
      if (newsCache && (Date.now() - newsCache.timestamp < NEWS_CACHE_DURATION)) {
        return res.json(newsCache.data);
      }

      const newsApiKey = process.env.NEWS_API_KEY;
      const mediaStackKey = process.env.MEDIASTACK_API_KEY;
      const nytKey = process.env.NYT_API_KEY;
      const guardianKey = process.env.GUARDIAN_API_KEY;

      // Try NewsAPI.org first (Primary)
      if (newsApiKey) {
        try {
          const response = await fetch(`https://newsapi.org/v2/top-headlines?country=us&category=business&apiKey=${newsApiKey}`);
          if (response.ok) {
            const data = await response.json();
            newsCache = { data, timestamp: Date.now() };
            return res.json(data);
          }
        } catch (e) { console.error("NewsAPI failed", e); }
      }

      // Try The Guardian (Secondary)
      if (guardianKey) {
        try {
          const response = await fetch(`https://content.guardianapis.com/search?api-key=${guardianKey}&show-fields=all&order-by=newest&page-size=10&q=finance OR business`);
          if (response.ok) {
            const data = await response.json();
            // Map Guardian format to NewsAPI format for the frontend
            const mapped = {
              articles: data.response.results.map((r: any) => ({
                title: r.webTitle,
                url: r.webUrl,
                source: { name: 'The Guardian' },
                publishedAt: r.webPublicationDate,
                description: r.fields?.trailText || '',
                urlToImage: r.fields?.thumbnail || null
              }))
            };
            newsCache = { data: mapped, timestamp: Date.now() };
            return res.json(mapped);
          }
        } catch (e) { console.error("Guardian API failed", e); }
      }

      // Try NYT (Tertiary)
      if (nytKey) {
        try {
          const response = await fetch(`https://api.nytimes.com/svc/topstories/v2/business.json?api-key=${nytKey}`);
          if (response.ok) {
            const data = await response.json();
            const mapped = {
              articles: data.results.map((r: any) => ({
                title: r.title,
                url: r.url,
                source: { name: 'New York Times' },
                publishedAt: r.published_date,
                description: r.abstract,
                urlToImage: r.multimedia?.[0]?.url || null
              }))
            };
            newsCache = { data: mapped, timestamp: Date.now() };
            return res.json(mapped);
          }
        } catch (e) { console.error("NYT API failed", e); }
      }

      console.warn("No news API keys available or all requests failed.");
      return res.json({ articles: [] });

    } catch (error) {
      console.error('API Error fetching news:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

createServer();
