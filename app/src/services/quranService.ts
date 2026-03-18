import { openDB, IDBPDatabase } from 'idb';

const QURAN_COM_API = 'https://api.quran.com/api/v4';
const AUDIO_BASE = 'https://verses.quran.com/';
const FONT_BASE = 'https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/';

// ─── Offline Storage ─────────────────────────────────────────────────────────

const DB_NAME = 'QuranOfflineV1';
const STORE_PAGES = 'mushaf_pages';

async function getDB() {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            db.createObjectStore(STORE_PAGES);
        },
    });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Surah {
    number: number;
    name: string;           // Arabic name (e.g. الفاتحة)
    englishName: string;    // Simple English name (e.g. Al-Fatihah)
    versesCount: number;
    revelationType: string; // 'مكية' | 'مدنية'
    pages: [number, number];// [firstPage, lastPage]
    bismillahPre: boolean;  // true = surah is preceded by bismillah
}

export interface MushafWord {
    id: number;
    position: number;
    audioUrl: string | null;    // relative mp3 path, e.g. "wbw/112_001_001.mp3"
    charTypeName: 'word' | 'end';
    codeV1: string;
    codeV2: string;
    lineNumber: number;
    pageNumber: number;
    text: string;           // Glyph code or text
    textUthmani: string;    // Standard Unicode Arabic text
    translationText?: string;
    verseNumber: number;
}

export interface MushafVerse {
    id: number;             // absolute verse number in the whole Quran
    verseNumber: number;    // verse number within its surah
    verseKey: string;       // e.g. "112:1"
    chapterId: number;
    pageNumber: number;
    juzNumber: number;
    hizbNumber: number;
    rubElHizbNumber: number;
    textUthmani: string;
    words: MushafWord[];
    audioUrl?: string;      // full URL: https://verses.quran.com/Alafasy/mp3/112001.mp3
    tafsirs?: { [id: number]: string };
}

/** Legacy Verse type — kept for list-mode & HomeScreen daily verse */
export interface Verse {
    number: number;
    numberInSurah: number;
    text: string;
    translation?: string;
    tafsir?: string;
    tafsirs?: { ibn_kathir?: string; qurtubi?: string };
    audio?: string;
    surahAudio?: string;
    surahName: string;
    surahNumber: number;
    page: number;
    juz?: number;
    words?: Word[];
}

export interface Word {
    id: number;
    text: string;
    line_number: number;
    page_number: number;
    location: string;
    char_type_name: string;
    code_v1?: string;
    code_v2?: string;
    text_qpc_v2?: string;
}

export interface Reciter {
    id: string;             // quran.com recitation ID
    name: string;
    arabicName: string;
    islamicNetworkId: string; // cdn.islamic.network fallback
}

export const RECITERS: Reciter[] = [
    { id: '7', name: 'Mishary Rashid Alafasy', arabicName: 'مشاري راشد العفاسي', islamicNetworkId: 'ar.alafasy' },
    { id: '11', name: 'Yasser Al-Dosari', arabicName: 'ياسر الدوسري', islamicNetworkId: 'ar.yasseraldossari' },
    { id: '3', name: 'Abdurrahman Al-Sudais', arabicName: 'عبد الرحمن السديس', islamicNetworkId: 'ar.abdurrahmaansudais' },
    { id: '10', name: 'Saud Al-Shuraim', arabicName: 'سعود الشريم', islamicNetworkId: 'ar.saoodshuraym' },
    { id: '2', name: 'Abdul Basit (Murattal)', arabicName: 'عبد الباسط عبد الصمد (مرتل)', islamicNetworkId: 'ar.abdulbasitmurattal' },
    { id: '1', name: 'Abdul Basit (Mujawwad)', arabicName: 'عبد الباسط عبد الصمد (مجود)', islamicNetworkId: 'ar.abdulsamad' },
    { id: '9', name: 'Mohamed Siddiq Al Minshawy', arabicName: 'محمد صديق المنشاوي', islamicNetworkId: 'ar.minshawi' },
    { id: '8', name: 'Mohamed Siddiq Al Minshawy (Mujawwad)', arabicName: 'محمد صديق المنشاوي (مجود)', islamicNetworkId: 'ar.minshawimujawwad' },
    { id: '6', name: 'Mahmoud Khalil Al-Husary', arabicName: 'محمود خليل الحصري', islamicNetworkId: 'ar.husary' },
    { id: '12', name: 'Mahmoud Khalil Al-Husary (Muallim)', arabicName: 'محمود خليل الحصري (معلم)', islamicNetworkId: 'ar.husarymujawwad' },
    { id: '4', name: 'Abu Bakr al-Shatri', arabicName: 'أبو بكر الشاطري', islamicNetworkId: 'ar.shaatree' },
    { id: '5', name: 'Hani ar-Rifai', arabicName: 'هاني الرفاعي', islamicNetworkId: 'ar.hanirifai' },
    { id: '11', name: 'Mohamed al-Tablawi', arabicName: 'محمد محمود الطبلاوي', islamicNetworkId: 'ar.muhammadayyoub' }, // Fallback to Ayyoub as Tablawi is not in islamic.network
    { id: '7', name: 'Ahmed ibn Ali al-Ajamy', arabicName: 'أحمد بن علي العجمي', islamicNetworkId: 'ar.ahmedajamy' }, // Using Alafasy ID for quran.com as Ajamy is not in v4 recitations list, but works in islamic.network
    { id: '7', name: 'Maher Al Muaiqly', arabicName: 'ماهر المعيقلي', islamicNetworkId: 'ar.mahermuaiqly' },
    { id: '7', name: 'Ali Abdur-Rahman al-Huthaify', arabicName: 'علي بن عبدالرحمن الحذيفي', islamicNetworkId: 'ar.hudhaify' },
    { id: '7', name: 'Muhammad Jibreel', arabicName: 'محمد جبريل', islamicNetworkId: 'ar.muhammadjibreel' },
    { id: '7', name: 'Abdullah Basfar', arabicName: 'عبد الله بصفر', islamicNetworkId: 'ar.abdullahbasfar' },
    { id: '7', name: 'Ibrahim Akhdar', arabicName: 'إبراهيم الأخضر', islamicNetworkId: 'ar.ibrahimakhbar' },
    { id: '7', name: 'Ayman Sowaid', arabicName: 'أيمن سويد', islamicNetworkId: 'ar.aymanswoaid' },
];

export const TAFSIR_SOURCES = [
    { id: 14, name: 'تفسير ابن كثير', slug: 'ibn-kathir' },
    { id: 90, name: 'تفسير القرطبي', slug: 'qurtubi' },
];

// ─── Font helpers ─────────────────────────────────────────────────────────────

export function getMushafFontFamily(pageNumber: number): string {
    return `QCF2${String(pageNumber).padStart(3, '0')}`;
}

export function getMushafFontUrl(pageNumber: number): string {
    return `${FONT_BASE}p${pageNumber}.woff2`;
}

/** Inject a @font-face for the given page if not already done */
export function injectPageFont(pageNumber: number): void {
    const id = `qcf2-font-${pageNumber}`;
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@font-face{font-family:'${getMushafFontFamily(pageNumber)}';src:url('${getMushafFontUrl(pageNumber)}') format('woff2');font-display:swap;}`;
    document.head.appendChild(style);
}

// ─── Surahs / Chapters ────────────────────────────────────────────────────────

const SURAHS_CACHE_KEY = 'quran_surahs_v4_2';

export async function fetchSurahs(): Promise<Surah[]> {
    const cached = localStorage.getItem(SURAHS_CACHE_KEY);
    if (cached) {
        try { return JSON.parse(cached); } catch { /* fallthrough */ }
    }
    const res = await fetch(`${QURAN_COM_API}/chapters?language=en`);
    if (!res.ok) throw new Error('Failed to fetch chapters');
    const data = await res.json();
    const surahs: Surah[] = data.chapters.map((c: any) => ({
        number: c.id,
        name: c.name_arabic,
        englishName: c.name_simple,
        versesCount: c.verses_count,
        revelationType: c.revelation_place === 'makkah' ? 'مكية' : 'مدنية',
        pages: c.pages as [number, number],
        bismillahPre: !!c.bismillah_pre,
    }));
    localStorage.setItem(SURAHS_CACHE_KEY, JSON.stringify(surahs));
    return surahs;
}

// ─── Mushaf page fetch  ───────────────────────────────────────────────────────

export async function fetchMushafPage(
    pageNum: number,
    recitationId: string = '7'
): Promise<MushafVerse[]> {
    // 1. Check IndexedDB first (Full Offline)
    try {
        const db = await getDB();
        const offlineData = await db.get(STORE_PAGES, pageNum);
        if (offlineData) return offlineData;
    } catch (e) {
        console.warn('Offline DB error:', e);
    }

    // 2. Fallback to cache/online
    const CACHE_VERSION = 'v10'; // Bumped for offline transition
    const CACHE_PREFIX = `mushaf_page_${CACHE_VERSION}_`;
    const cacheKey = `${CACHE_PREFIX}${pageNum}_r${recitationId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        try { return JSON.parse(cached); } catch { /* fallthrough */ }
    }

    // Only Qurtubi (90) works inline with by_page. Ibn Kathir (14) requires a separate by_chapter call.
    const url =
        `${QURAN_COM_API}/verses/by_page/${pageNum}` +
        `?words=true&per_page=50` +
        `&fields=text_uthmani,verse_key,chapter_id,juz_number,hizb_number,rub_el_hizb_number` +
        `&word_fields=code_v1,code_v2,page_number,line_number,char_type_name,text,text_uthmani,audio_url` +
        `&tafsirs=90&audio=${recitationId}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch mushaf page ${pageNum}`);
    const data = await res.json();

    // Collect unique chapter IDs on this page to fetch Ibn Kathir by chapter
    const chapterIds: Set<number> = new Set((data.verses || []).map((v: any) => v.chapter_id as number));

    // Fetch Ibn Kathir (ID 14) via by_chapter — the only reliable endpoint for this tafsir
    const ibnKathirMap: { [verseKey: string]: string } = {};
    await Promise.all(Array.from(chapterIds).map(async (chapId) => {
        try {
            const r = await fetch(`${QURAN_COM_API}/tafsirs/14/by_chapter/${chapId}?per_page=300`);
            if (!r.ok) return;
            const d = await r.json();
            (d.tafsirs || []).forEach((t: any) => { ibnKathirMap[t.verse_key] = t.text; });
        } catch { /* skip on error */ }
    }));

    const verses: MushafVerse[] = (data.verses || []).map((v: any) => ({
        id: v.id,
        verseNumber: v.verse_number,
        verseKey: v.verse_key,
        chapterId: v.chapter_id,
        pageNumber: v.page_number,
        juzNumber: v.juz_number,
        hizbNumber: v.hizb_number,
        rubElHizbNumber: v.rub_el_hizb_number,
        textUthmani: v.text_uthmani,
        words: (v.words || []).map((w: any) => ({
            id: w.id,
            position: w.position,
            audioUrl: w.audio_url || null,
            charTypeName: w.char_type_name === 'end' ? 'end' : 'word',
            codeV1: w.code_v1 || '',
            codeV2: w.code_v2 || w.text || '',
            lineNumber: w.line_number,
            pageNumber: w.page_number || pageNum,
            text: w.text || '',
            textUthmani: w.text_uthmani || (w.char_type_name === 'word' ? w.text : ''),
            translationText: w.translation?.text,
            verseNumber: v.verse_number,
        })),
        audioUrl: v.audio?.url ? `${AUDIO_BASE}${v.audio.url}` : undefined,
        tafsirs: {
            ...((v.tafsirs || []).reduce((acc: any, t: any) => {
                acc[t.resource_id] = t.text;
                return acc;
            }, {})),
            14: ibnKathirMap[v.verse_key] || ibnKathirMap[v.id.toString()] || '',
        },
    }));

    try {
        localStorage.setItem(cacheKey, JSON.stringify(verses));
    } catch (e) {
        console.warn('Failed to cache mushaf page, possibly due to quota exceeded:', e);
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('mushaf_page_v')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));

        try {
            localStorage.setItem(cacheKey, JSON.stringify(verses));
        } catch (e2) {
            console.warn('Still failed to cache mushaf page after clearing old caches:', e2);
        }
    }

    return verses;
}

export async function fetchVerseTafsir(verseKey: string, tafsirId: number, pageNum?: number): Promise<string> {
    if (pageNum) {
        const verses = await fetchMushafPage(pageNum, '7');
        const verse = verses.find(v => v.verseKey === verseKey);
        return (verse?.tafsirs as any)?.[tafsirId] || '';
    }

    try {
        const db = await getDB();
        // Since we store by page, we need to find which page this verse belongs to.
        // For simplicity, if it's not in the currently loaded page in UI, we fetch from API.
        const res = await fetch(`${QURAN_COM_API}/quran/tafsirs/${tafsirId}?verse_key=${verseKey}`);
        if (!res.ok) throw new Error('API request failed');
        const data = await res.json();
        return data.tafsir?.text || data.tafsirs?.[0]?.text || '';
    } catch (e) {
        return '';
    }
}

// ─── Offline Download Logic ──────────────────────────────────────────────────

export async function downloadFullQuran(onProgress: (progress: number) => void, signal?: AbortSignal): Promise<void> {
    const totalPages = 604;
    const db = await getDB();
    
    for (let p = 1; p <= totalPages; p++) {
        if (signal?.aborted) throw new Error('Download cancelled');

        // Check if already in DB
        const exists = await db.get(STORE_PAGES, p);
        if (exists) {
            onProgress(Math.floor((p / totalPages) * 100));
            continue;
        }

        try {
            const pageData = await fetchMushafPage(p, '7');
            await db.put(STORE_PAGES, pageData, p);
            onProgress(Math.floor((p / totalPages) * 100));
        } catch (e) {
            console.error(`Failed to download page ${p}`, e);
            throw e;
        }
    }
}

export async function checkOfflineStatus(): Promise<number> {
    const db = await getDB();
    const keys = await db.getAllKeys(STORE_PAGES);
    return Math.floor((keys.length / 604) * 100);
}

export async function clearOfflineData(): Promise<void> {
    const db = await getDB();
    await db.clear(STORE_PAGES);
    
    // Also clear localStorage caches to ensure a fresh state
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('mushaf_page_v') || key.startsWith('quran_surah_v'))) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
}

// ─── Legacy verse fetch  (list mode) ─────────────────────────────────────────

export async function fetchVerses(surahNumber: number, islamicNetworkId: string = 'ar.alafasy'): Promise<Verse[]> {
    const cacheKey = `quran_surah_v6_${surahNumber}_r${islamicNetworkId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        try { return JSON.parse(cached); } catch { /* fallthrough */ }
    }

    const reciter = RECITERS.find(r => r.islamicNetworkId === islamicNetworkId) || RECITERS[0];
    const surahs = await fetchSurahs();
    const surah = surahs.find(s => s.number === surahNumber);

    const url =
        `${QURAN_COM_API}/verses/by_chapter/${surahNumber}` +
        `?words=false&per_page=300` +
        `&fields=text_uthmani,verse_key,chapter_id,juz_number,page_number` +
        `&tafsirs=90`;

    const [res, tafsir14Res] = await Promise.all([
        fetch(url),
        fetch(`${QURAN_COM_API}/tafsirs/14/by_chapter/${surahNumber}?per_page=300`)
    ]);

    if (!res.ok) throw new Error(`Failed to fetch surah ${surahNumber}`);
    const data = await res.json();
    const tafsir14Data = tafsir14Res.ok ? await tafsir14Res.json() : { tafsirs: [] };

    const verses: Verse[] = (data.verses || []).map((v: any) => {
        const ibnKathir = tafsir14Data.tafsirs?.find((t: any) => t.verse_key === v.verse_key)?.text;
        const qurtubi = v.tafsirs?.find((t: any) => t.resource_id === 90)?.text;
        return {
            number: v.id,
            numberInSurah: v.verse_number,
            text: v.text_uthmani,
            tafsir: ibnKathir,
            tafsirs: { ibn_kathir: ibnKathir, qurtubi: qurtubi },
            audio: `https://cdn.islamic.network/quran/audio/128/${reciter.islamicNetworkId}/${v.id}.mp3`,
            surahName: surah?.name || '',
            surahNumber,
            page: v.page_number,
            juz: v.juz_number,
        };
    });

    try {
        localStorage.setItem(cacheKey, JSON.stringify(verses));
    } catch (e) {
        console.warn('Failed to cache verses, possibly due to quota exceeded:', e);
        // Clear old surah caches to free up space
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('quran_surah_v')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));

        // Try one more time after clearing
        try {
            localStorage.setItem(cacheKey, JSON.stringify(verses));
        } catch (e2) {
            console.warn('Still failed to cache verses after clearing old caches:', e2);
        }
    }

    return verses;
}

// ─── Daily verse  ─────────────────────────────────────────────────────────────

export const DAILY_VERSES = [
    { number: 185, text: 'شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ هُدًى لِّلنَّاسِ وَبَيِّنَاتٍ مِّنَ الْهُدَىٰ وَالْفُرْقَانِ', surahName: 'البقرة', surahNumber: 2 },
    { number: 286, text: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ', surahName: 'البقرة', surahNumber: 2 },
];

export function getDailyVerse(): any {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}
