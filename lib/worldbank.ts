// ─── World Bank API Client ────────────────────────────────────────────
export interface WorldBankDataPoint {
    year: string;
    value: number | null;
}

export async function fetchWorldBankIndicator(
    indicator: string,
    country = "IND",
    years = 14
): Promise<WorldBankDataPoint[]> {
    // Request last 14 years with explicit date range to ensure 2024/2025 data is included
    const url = `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?format=json&mrv=${years}&date=2012:2025&per_page=${years}`;
    const res = await fetch(url, { next: { revalidate: 3600 } }); // 1hr cache
    if (!res.ok) throw new Error(`WorldBank API error: ${res.status}`);
    const data = await res.json();
    const records = data[1] as { date: string; value: number | null }[];
    if (!records) return [];
    return records
        .filter((r) => r.value !== null)
        .map((r) => ({ year: r.date, value: r.value }))
        .sort((a, b) => parseInt(a.year) - parseInt(b.year));
}

// ─── IMF World Economic Outlook ───────────────────────────────────────
export async function fetchIMFData(indicator: string): Promise<{ label: string; value: number }[]> {
    // IMF WEO API — India specific — includes 2025 projections
    const url = `https://www.imf.org/external/datamapper/api/v1/${indicator}?periods=2021,2022,2023,2024,2025`;
    try {
        const res = await fetch(url, { next: { revalidate: 3600 } });
        if (!res.ok) return [];
        const data = await res.json();
        const indiaData = data?.values?.[indicator]?.IND;
        if (!indiaData) return [];
        return Object.entries(indiaData).map(([year, val]) => ({
            label: year,
            value: Number(val),
        }));
    } catch {
        return [];
    }
}
