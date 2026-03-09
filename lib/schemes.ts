// ─── MyScheme India API Client ────────────────────────────────────────
export interface Scheme {
    id: string;
    title: string;
    ministry: string;
    description: string;
    beneficiaries: string;
    deadline: string | null;
    applicationUrl: string;
    category: string;
    tags: string[];
}

export async function fetchSchemes(keyword?: string, limit = 20): Promise<Scheme[]> {
    try {
        const q = encodeURIComponent(keyword ?? "india government scheme");
        const url = `https://api.myscheme.gov.in/search/v4/schemes?lang=en&q=${q}&keyword=${q}&nextPage=0&size=${limit}`;
        const res = await fetch(url, {
            headers: { Accept: "application/json" },
            next: { revalidate: 3600 },
        });
        if (!res.ok) throw new Error("MyScheme API failed");
        const data = await res.json();
        const hits = data?.data?.hits ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return hits.map((h: any) => ({
            id: h?.id ?? Math.random().toString(36).slice(2),
            title: h?.schemeName ?? h?.["Scheme Name"] ?? "Unknown Scheme",
            ministry: h?.nodalMinistryName ?? h?.ministry ?? "Ministry of India",
            description: h?.briefDescription ?? h?.description ?? "No description available.",
            beneficiaries: h?.beneficiary ?? "All citizens",
            deadline: h?.applicationDeadline ?? null,
            applicationUrl: h?.applicationLink ?? "https://myscheme.gov.in",
            category: h?.level ?? "Central",
            tags: (h?.tags ?? []).slice(0, 4),
        }));
    } catch (err) {
        console.error("Schemes API error:", err);
        return [];
    }
}
