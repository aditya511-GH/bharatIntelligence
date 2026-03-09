// ─── NewsAPI Client ───────────────────────────────────────────────────
export interface NewsArticle {
    title: string;
    description: string | null;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    source: { name: string };
    author: string | null;
}

export async function fetchNews(keywords: string, pageSize = 10): Promise<NewsArticle[]> {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) throw new Error("NEWS_API_KEY not set");

    const q = encodeURIComponent(`${keywords} India`);
    const url = `https://newsapi.org/v2/everything?q=${q}&language=en&pageSize=${pageSize}&sortBy=publishedAt&apiKey=${apiKey}`;

    const res = await fetch(url, { next: { revalidate: 900 } }); // 15min cache
    if (!res.ok) throw new Error(`NewsAPI error: ${res.status}`);
    const data = await res.json();
    return (data.articles as NewsArticle[]).filter((a) => a.title && a.title !== "[Removed]");
}
