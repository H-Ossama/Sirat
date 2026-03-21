
const BASE_URL = 'https://hadithapi.com/api';
const API_KEY = '$2y$10$d82RxxulY7hyIj2SbIPnuvYWqWniYyGxuu41Pb4o51erEyPmvh1';

export interface Hadith {
    hadithNumber: string;
    hadithArabic: string;
    hadithEnglish?: string;
    hadithUrdu?: string;
    englishNarrator?: string;
    hadithStatus: string;
    bookName: string;
    bookSlug: string;
    chapterName: string;
    chapterNumber: string;
    hadithTafsir?: string;
    headingArabic?: string;
    headingUrdu?: string;
    headingEnglish?: string;
}

export interface HadithBook {
    bookSlug: string;
    bookName: string;
    hadiths_count: string;
}

export async function fetchHadithBooks(): Promise<HadithBook[]> {
    const cached = localStorage.getItem('hadith_books');
    if (cached) return JSON.parse(cached);

    const response = await fetch(`${BASE_URL}/books?apiKey=${API_KEY}`);
    const data = await response.json();

    if (data.status === 200) {
        localStorage.setItem('hadith_books', JSON.stringify(data.books));
        return data.books;
    }
    throw new Error('Failed to fetch hadith books');
}

export async function fetchHadiths(bookSlug: string, page: number = 1): Promise<Hadith[]> {
    const response = await fetch(`${BASE_URL}/hadiths?apiKey=${API_KEY}&book=${bookSlug}&page=${page}`);
    const data = await response.json();

    if (data.status === 200) {
        return data.hadiths.data;
    }
    throw new Error('Failed to fetch hadiths');
}

export async function searchHadith(query: string): Promise<Hadith[]> {
    const response = await fetch(`${BASE_URL}/hadiths?apiKey=${API_KEY}&hadithNumber=${query}`);
    const data = await response.json();

    if (data.status === 200) {
        return data.hadiths.data;
    }
    return [];
}

const HADITH_TAFSIR_MAP: Record<string, string> = {
    'sahih-bukhari-1': 'هذا الحديث قاعدة عظيمة من قواعد الإسلام، ومدار أعمال العباد فكل ما يتقرب به العبد إلى ربه وما لم يتقرب لا يكون إلا بالنية، وهو مع ذلك من أجمع الأحاديث وأعظمها نفعاً. المعنى العام: أن الأعمال لا تصح ولا يعتد بها شرعاً إلا إذا كانت بنية خالصة لله تعالى.',
    'sahih-muslim-1': 'هذا هو "حديث جبريل" الشهير، وفيه بيان أركان الدين الثلاثة: الإسلام (الأعمال الظاهرة)، والإيمان (الاعتقادات الباطنة)، والإحسان (استحضار مراقبة الله)، كما ذكر فيه علامات الساعة. سماه النبي صلى الله عليه وسلم "دينكم" لأنه يجمع أصول الشريعة.',
    'riyad-us-saliheen-1': 'حديث "إنما الأعمال بالنيات" هو أصل كبير في الدين، وضع الإمام النووي هذا الحديث في أول كتابه لينبه القارئ على أهمية إخلاص النية لله في طلب العلم والعمل به.',
    'sahih-bukhari-2': 'يتحدث هذا الحديث عن كيفية بدء الوحي إلى النبي صلى الله عليه وسلم، ويبين ثقل الوحي وعظم الرسالة، وكيف كان يأتيه في صور مختلفة مثل صلصلة الجرس أو يتمثل له الملك رجلاً.',
};

export function getHadithTafsirInfo(hadith: Hadith) {
    const key = `${hadith.bookSlug}-${hadith.hadithNumber}`;
    const localTafsir = HADITH_TAFSIR_MAP[key];
    
    // Generate an authoritative search link for Dorar.net
    const searchQuery = encodeURIComponent(hadith.hadithArabic.substring(0, 80));
    const searchUrl = `https://www.dorar.net/h/search?q=${searchQuery}`;
    
    return {
        tafsir: localTafsir || hadith.hadithTafsir,
        searchUrl
    };
}
