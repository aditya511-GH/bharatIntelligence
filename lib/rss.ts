// ─── RSS Feed Client ─────────────────────────────────────────────────────────
// Replaces NewsAPI. No API keys needed, no rate limits.
// Feeds are mapped per domain to trusted Indian/global sources.

import RSSParser from "rss-parser";

export interface RssArticle {
    title: string;
    description: string | null;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    source: { name: string };
    author: string | null;
}

// Per-domain RSS feeds — ordered by relevance
const DOMAIN_FEEDS: Record<string, { name: string; url: string }[]> = {
    geopolitics: [
        { name: "MEA India", url: "https://www.mea.gov.in/rssfeed/press-releases.xml" },
        { name: "The Hindu", url: "https://www.thehindu.com/news/international/feeder/default.rss" },
        { name: "Reuters India", url: "https://feeds.reuters.com/reuters/INtopNews" },
        { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
        { name: "NDTV World", url: "https://feeds.feedburner.com/ndtvnews-world" },
    ],
    economics: [
        { name: "Economic Times", url: "https://economictimes.indiatimes.com/rssfeedsdefault.cms" },
        { name: "Mint", url: "https://www.livemint.com/rss/economy" },
        { name: "Business Standard", url: "https://www.business-standard.com/rss/economy-policy-102.rss" },
        { name: "Financial Express", url: "https://www.financialexpress.com/feed/" },
        { name: "Reuters Business", url: "https://feeds.reuters.com/reuters/businessNews" },
    ],
    defense: [
        { name: "The Hindu National", url: "https://www.thehindu.com/news/national/feeder/default.rss" },
        { name: "Indian Express", url: "https://indianexpress.com/section/india/feed/" },
        { name: "NDTV India", url: "https://feeds.feedburner.com/ndtvnews-india" },
        { name: "Reuters World", url: "https://feeds.reuters.com/Reuters/worldNews" },
        { name: "BBC India", url: "https://feeds.bbci.co.uk/news/world/asia/india/rss.xml" },
    ],
    technology: [
        { name: "Inc42", url: "https://inc42.com/feed/" },
        { name: "Economic Times Tech", url: "https://economictimes.indiatimes.com/tech/rssfeeds/78570550.cms" },
        { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
        { name: "The Ken", url: "https://the-ken.com/feed/" },
        { name: "Mint Tech", url: "https://www.livemint.com/rss/technology" },
    ],
    climate: [
        { name: "Down To Earth", url: "https://www.downtoearth.org/rss/latest-news" },
        { name: "Mongabay India", url: "https://india.mongabay.com/feed/" },
        { name: "BBC Environment", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml" },
        { name: "The Hindu Environment", url: "https://www.thehindu.com/sci-tech/energy-and-environment/feeder/default.rss" },
        { name: "Reuters Environment", url: "https://feeds.reuters.com/reuters/environment" },
    ],
    society: [
        { name: "The Wire", url: "https://thewire.in/feed" },
        { name: "IndiaSpend", url: "https://www.indiaspend.com/feed/" },
        { name: "The Hindu National", url: "https://www.thehindu.com/news/national/feeder/default.rss" },
        { name: "NDTV India", url: "https://feeds.feedburner.com/ndtvnews-india" },
        { name: "Scroll India", url: "https://scroll.in/feed" },
    ],
};

const parser = new RSSParser({
    timeout: 8000,
    customFields: {
        item: [
            ["media:content", "mediaContent", { keepArray: false }],
            ["media:thumbnail", "mediaThumbnail", { keepArray: false }],
            ["enclosure", "enclosure", { keepArray: false }],
        ],
    },
    headers: {
        "User-Agent": "BharatIntelligencePlatform/1.0 (https://bharat-intel.gov.in)",
        Accept: "application/rss+xml, application/xml, text/xml",
    },
});

function extractImage(item: Record<string, unknown>): string | null {
    // 1. media:content url attribute
    const mc = item.mediaContent as { $?: { url?: string }; url?: string } | undefined;
    if (mc?.["$"]?.url) return mc["$"].url;
    if (typeof mc?.url === "string") return mc.url;

    // 2. media:thumbnail
    const mt = item.mediaThumbnail as { $?: { url?: string }; url?: string } | undefined;
    if (mt?.["$"]?.url) return mt["$"].url;

    // 3. enclosure (podcasts / image enclosures)
    const enc = item.enclosure as { url?: string; type?: string } | undefined;
    if (enc?.url && enc.type?.startsWith("image")) return enc.url;
    if (enc?.url) return enc.url;

    // 4. Try to scrape first <img> from content field
    const content = (item.content ?? item["content:encoded"] ?? "") as string;
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch?.[1]) return imgMatch[1];

    return null;
}

async function fetchOneFeed(
    name: string,
    url: string
): Promise<RssArticle[]> {
    try {
        const feed = await parser.parseURL(url);
        return (feed.items ?? [])
            .slice(0, 6)
            .filter((item) => item.title && item.title !== "[Removed]")
            .map((item) => ({
                title: item.title ?? "",
                description:
                    item.contentSnippet ?? item.summary ?? item.content ?? null,
                url: item.link ?? item.guid ?? "",
                urlToImage: extractImage(item as unknown as Record<string, unknown>),
                publishedAt: item.pubDate
                    ? new Date(item.pubDate).toISOString()
                    : new Date().toISOString(),
                source: { name },
                author: (item as unknown as Record<string, string | undefined>).author
                    ?? (item as unknown as Record<string, string | undefined>).creator
                    ?? null,
            }));
    } catch {
        return [];
    }
}

export async function fetchRssArticles(
    domain: string,
    pageSize = 12
): Promise<RssArticle[]> {
    const feeds = DOMAIN_FEEDS[domain] ?? DOMAIN_FEEDS.geopolitics;

    // Fetch up to 3 feeds in parallel, then merge + dedupe
    const results = await Promise.all(
        feeds.slice(0, 3).map((f) => fetchOneFeed(f.name, f.url))
    );

    const seen = new Set<string>();
    const merged: RssArticle[] = [];

    for (const batch of results) {
        for (const a of batch) {
            if (!seen.has(a.title) && a.url) {
                seen.add(a.title);
                merged.push(a);
            }
        }
    }

    // Sort newest first, cap at pageSize
    merged.sort(
        (a, b) =>
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    return merged.slice(0, pageSize);
}
