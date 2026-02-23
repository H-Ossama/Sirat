
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
