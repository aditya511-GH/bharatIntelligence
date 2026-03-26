// ─── MyScheme India API Client (with curated fallback) ────────────────
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

const CURATED_SCHEMES: Scheme[] = [
    { id: "pmay-u", title: "PM Awas Yojana (Urban)", ministry: "Ministry of Housing & Urban Affairs", description: "Provides affordable housing to urban poor, EWS, LIG, and MIG categories through credit-linked subsidy and direct beneficiary support.", beneficiaries: "Urban poor, EWS/LIG/MIG families", deadline: "2026-12-31", applicationUrl: "https://pmaymis.gov.in", category: "Central", tags: ["housing", "subsidy", "urban", "welfare"] },
    { id: "pmjdy", title: "PM Jan Dhan Yojana", ministry: "Ministry of Finance", description: "Universal banking access initiative providing zero-balance accounts, RuPay debit cards, and ₹2 lakh accidental insurance to unbanked citizens.", beneficiaries: "Unbanked citizens, rural poor", deadline: null, applicationUrl: "https://pmjdy.gov.in", category: "Central", tags: ["banking", "finance", "rural", "insurance"] },
    { id: "pm-kisan", title: "PM-KISAN Samman Nidhi", ministry: "Ministry of Agriculture", description: "Provides ₹6,000 per year in three equal installments directly to small and marginal farmers' bank accounts.", beneficiaries: "Small & marginal farmers", deadline: null, applicationUrl: "https://pmkisan.gov.in", category: "Central", tags: ["farming", "agriculture", "income support", "rural"] },
    { id: "ayushman", title: "Ayushman Bharat — PM-JAY", ministry: "Ministry of Health & Family Welfare", description: "World's largest health insurance scheme providing ₹5 lakh annual health cover to 55 crore beneficiaries for secondary and tertiary hospitalisation.", beneficiaries: "Bottom 40% economically vulnerable families", deadline: null, applicationUrl: "https://pmjay.gov.in", category: "Central", tags: ["health", "insurance", "hospital", "welfare"] },
    { id: "ujjwala", title: "PM Ujjwala Yojana 2.0", ministry: "Ministry of Petroleum & Natural Gas", description: "Provides free LPG connections to Below Poverty Line (BPL) households to protect health of women and children from indoor pollution.", beneficiaries: "BPL women, rural households", deadline: null, applicationUrl: "https://pmuy.gov.in", category: "Central", tags: ["LPG", "women", "energy", "rural"] },
    { id: "jjm", title: "Jal Jeevan Mission", ministry: "Ministry of Jal Shakti", description: "Aims to provide tap water connections to every rural household by 2024 through functional household tap connections (FHTC).", beneficiaries: "Rural households without piped water", deadline: "2026-03-31", applicationUrl: "https://jaljeevanmission.gov.in", category: "Central", tags: ["water", "rural", "infrastructure", "sanitation"] },
    { id: "sbm", title: "Swachh Bharat Mission (Urban 2.0)", ministry: "Ministry of Housing & Urban Affairs", description: "Targets achieving ODF+ and ODF++ cities, solid waste management, and wastewater treatment for urban India.", beneficiaries: "Urban citizens, municipalities", deadline: "2026-03-31", applicationUrl: "https://swachhbharatmission.gov.in", category: "Central", tags: ["sanitation", "cleanliness", "urban", "waste"] },
    { id: "mudra", title: "PM MUDRA Yojana", ministry: "Ministry of Finance", description: "Non-corporate, non-farm micro enterprises can avail loans up to ₹10 lakh (Shishu/Kishor/Tarun) through Micro Units Development & Refinance Agency.", beneficiaries: "Micro-entrepreneurs, small business owners", deadline: null, applicationUrl: "https://mudra.org.in", category: "Central", tags: ["loan", "startup", "MSME", "entrepreneurship"] },
    { id: "skill-india", title: "Pradhan Mantri Kaushal Vikas Yojana 4.0", ministry: "Ministry of Skill Development", description: "Free skill training under 30+ industry sectors with placement support and ₹8,000 post-training reward for certified candidates.", beneficiaries: "Youth aged 15–45, school dropouts", deadline: "2026-12-31", applicationUrl: "https://pmkvyofficial.org", category: "Central", tags: ["skill", "training", "youth", "employment"] },
    { id: "solar-rooftop", title: "PM Surya Ghar — Free Electricity Scheme", ministry: "Ministry of New & Renewable Energy", description: "Provides rooftop solar panels to 1 crore households with up to ₹78,000 subsidy. Families get 300 units free electricity monthly.", beneficiaries: "Home-owning families", deadline: "2027-03-31", applicationUrl: "https://pmsuryaghar.gov.in", category: "Central", tags: ["solar", "energy", "subsidy", "electricity"] },
    { id: "nps", title: "National Pension Scheme (NPS)", ministry: "Ministry of Finance", description: "Voluntary long-term retirement savings scheme with tax benefits under Sec 80C, professional fund management, and government co-contribution options.", beneficiaries: "All Indian citizens 18–70 years", deadline: null, applicationUrl: "https://npstrust.org.in", category: "Central", tags: ["pension", "retirement", "savings", "tax"] },
    { id: "dbt-fertilizer", title: "DBT Fertilizer Subsidy", ministry: "Ministry of Chemicals & Fertilizers", description: "Direct Benefit Transfer for fertilizer subsidy to farmers through point-of-sale machines at retail shops using Aadhaar biometric authentication.", beneficiaries: "Farmers purchasing subsidized fertilizers", deadline: null, applicationUrl: "https://fertilizer.nic.in", category: "Central", tags: ["fertilizer", "agriculture", "subsidy", "DBT"] },
];

export async function fetchSchemes(keyword?: string, limit = 20): Promise<Scheme[]> {
    // Try real API first
    try {
        const q = encodeURIComponent(keyword ?? "india government scheme");
        const url = `https://api.myscheme.gov.in/search/v4/schemes?lang=en&q=${q}&keyword=${q}&nextPage=0&size=${limit}`;
        const res = await fetch(url, {
            headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
            next: { revalidate: 3600 },
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error("MyScheme API failed");
        const data = await res.json();
        const hits = data?.data?.hits ?? [];
        if (hits.length === 0) throw new Error("Empty response");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return hits.slice(0, limit).map((h: any) => ({
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
    } catch {
        // Fallback: filter curated list by keyword
        if (!keyword) return CURATED_SCHEMES;
        const kw = keyword.toLowerCase();
        const filtered = CURATED_SCHEMES.filter((s) =>
            s.title.toLowerCase().includes(kw) ||
            s.description.toLowerCase().includes(kw) ||
            s.tags.some((t) => t.toLowerCase().includes(kw)) ||
            s.ministry.toLowerCase().includes(kw)
        );
        return filtered.length > 0 ? filtered : CURATED_SCHEMES;
    }
}

