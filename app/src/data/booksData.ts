export interface Book {
    id: string;
    title: string;
    author: string;
    category?: string;
    coverUrl: string;
    source: 'shamela' | 'siraj';
    description?: string;
    pageCount?: number;
    content?: string[]; // Array of page content (HTML or text)
    downloadUrl?: string; // For downloading the full book (e.g. PDF)
}

export const shamelaBooks: Book[] = [
    {
        id: 'shamela_171',
        title: 'تفسير ابن كثير',
        author: 'ابن كثير',
        category: 'التفسير',
        source: 'shamela',
        coverUrl: 'https://placehold.co/300x450/1e293b/fbbf24?text=تفسير+ابن+كثير',
        description: 'من أشهر كتب التفسير بالمأثور.',
        downloadUrl: 'https://shamela.ws/book/171/pdf'
    },
    {
        id: 'shamela_43',
        title: 'تفسير الطبري',
        author: 'الطبري',
        category: 'التفسير',
        source: 'shamela',
        coverUrl: 'https://placehold.co/300x450/1e293b/fbbf24?text=تفسير+الطبري',
        description: 'جامع البيان عن تأويل آي القرآن.',
        downloadUrl: 'https://shamela.ws/book/43/pdf'
    },
    {
        id: 'shamela_1681',
        title: 'صحيح البخاري',
        author: 'البخاري',
        category: 'الحديث',
        source: 'shamela',
        coverUrl: 'https://placehold.co/300x450/1e293b/fbbf24?text=صحيح+البخاري',
        description: 'كتاب الجامع المسند الصحيح المختصر.',
        downloadUrl: 'https://shamela.ws/book/1681/pdf'
    },
    {
        id: 'shamela_1721',
        title: 'صحيح مسلم',
        author: 'مسلم',
        category: 'الحديث',
        source: 'shamela',
        coverUrl: 'https://placehold.co/300x450/1e293b/fbbf24?text=صحيح+مسلم',
        description: 'المسند الصحيح المختصر من السنن.',
        downloadUrl: 'https://shamela.ws/book/1721/pdf'
    },
    {
        id: 'shamela_1720',
        title: 'سنن الترمذي',
        author: 'الترمذي',
        category: 'الحديث',
        source: 'shamela',
        coverUrl: 'https://placehold.co/300x450/1e293b/fbbf24?text=سنن+الترمذي',
        description: 'الجامع الكبير للمختصر من السنن.',
        downloadUrl: 'https://shamela.ws/book/1720/pdf'
    }
];

export const sirajBooks: Book[] = [
    {
        id: 'siraj_1',
        title: 'صحيح البخاري',
        author: 'الإمام البخاري',
        category: 'الحديث الشريف',
        source: 'siraj',
        coverUrl: 'https://placehold.co/300x450/1e293b/fbbf24?text=صحيح+البخاري',
        description: 'أصح كُتب الحديث عند أهل السنة والجماعة.',
        downloadUrl: 'https://archive.org/download/Sahihal-Bukhari/Sahih%20al-Bukhari.pdf'
    },
    {
        id: 'siraj_2',
        title: 'صحيح مسلم',
        author: 'الإمام مسلم',
        category: 'الحديث الشريف',
        source: 'siraj',
        coverUrl: 'https://placehold.co/300x450/1e293b/fbbf24?text=صحيح+مسلم',
        description: 'ثاني أصح كُتب الحديث بعد صحيح البخاري.',
        downloadUrl: 'https://archive.org/download/SahihMuslimArabic/Sahih%20Muslim%20Arabic.pdf'
    },
    {
        id: 'siraj_3',
        title: 'رياض الصالحين',
        author: 'الإمام النووي',
        category: 'الحديث الشريف',
        source: 'siraj',
        coverUrl: 'https://placehold.co/300x450/1e293b/fbbf24?text=رياض+الصالحين',
        description: 'كتاب جامع للأحاديث الصحيحة من كلام سيد المرسلين.',
        downloadUrl: 'https://archive.org/download/RiyadAlSalihin/Riyad%20al-Salihin.pdf'
    },
    {
        id: 'siraj_4',
        title: 'زاد المعاد',
        author: 'ابن القيم الجوزية',
        category: 'السيرة النبوية',
        source: 'siraj',
        coverUrl: 'https://placehold.co/300x450/1e293b/fbbf24?text=زاد+المعاد',
        description: 'من أهم كُتب السيرة النبوية التي تُعنى بالفقه والهدي النبوي.',
        downloadUrl: 'https://archive.org/download/ZadAlMaad/Zad%20al-Maad.pdf'
    }
];

export const allBooks: Book[] = [...shamelaBooks, ...sirajBooks];
