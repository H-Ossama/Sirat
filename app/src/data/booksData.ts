export interface Book {
    id: string;
    title: string;
    author: string;
    category?: string;
    coverUrl: string;
    source: 'siraj';
    description?: string;
    pageCount?: number;
    content?: string[]; // Array of page content (HTML or text)
    downloadUrl?: string; // For downloading the full book (e.g. PDF)
    readUrl?: string; // For reading the book online via webview
}

export const sirajBooks: Book[] = [
    {
        id: '1077',
        title: 'المنهاج النبوي: تربية وتنظيما وزحفا',
        author: 'الإمام عبد السلام ياسين',
        category: 'المنهاج النبوي',
        source: 'siraj',
        coverUrl: 'https://siraj.net/api/edition-medias/COVER/1077',
        description: 'كتاب المنهاج النبوي يرسم معالم الطريق لإعادة بناء الأمة.',
        downloadUrl: 'https://siraj.net/api/edition-medias/PDF/1077',
        readUrl: 'https://siraj.net/api/edition-medias/PDF/1077'
    },
    {
        id: 'siraj_1109',
        title: 'يوم المؤمن وليلته',
        author: 'الإمام عبد السلام ياسين',
        category: 'التربية',
        source: 'siraj',
        coverUrl: 'https://siraj.net/api/edition-medias/COVER/1109',
        description: 'دليل عملي للمؤمن في يومه وليلته، يجمع بين الأذكار والآداب والأعمال الصالحة بمقصد وجه الله عز وجل.',
        downloadUrl: 'https://siraj.net/assets/books/pdf/31.pdf',
        readUrl: 'https://siraj.net/assets/books/pdf/31.pdf'
    },
    {
        id: 'siraj_1060',
        title: 'الإحسان - الجزء الأول',
        author: 'الإمام عبد السلام ياسين',
        category: 'التزكية والإحسان',
        source: 'siraj',
        coverUrl: 'https://siraj.net/api/edition-medias/COVER/1060',
        description: 'كتاب الإحسان يتناول جوهر السلوك إلى الله عز وجل.',
        downloadUrl: 'https://siraj.net/api/edition-medias/PDF/1060',
        readUrl: 'https://siraj.net/api/edition-medias/PDF/1060'
    },
    {
        id: '1061',
        title: 'الإحسان - الجزء الثاني',
        author: 'الإمام عبد السلام ياسين',
        category: 'التزكية والإحسان',
        source: 'siraj',
        coverUrl: 'https://siraj.net/api/edition-medias/COVER/1061',
        description: 'تكملة كتاب الإحسان في فقه القلوب والعمل الصالح.',
        downloadUrl: 'https://siraj.net/api/edition-medias/PDF/1061',
        readUrl: 'https://siraj.net/api/edition-medias/PDF/1061'
    },
    {
        id: '1062',
        title: 'تنوير المؤمنات - الجزء الأول',
        author: 'الإمام عبد السلام ياسين',
        category: 'قضايا المرأة',
        source: 'siraj',
        coverUrl: 'https://siraj.net/api/edition-medias/COVER/1062',
        description: 'كتاب يعنى بمكانة المرأة في الإسلام ودورها في التغيير.',
        downloadUrl: 'https://siraj.net/api/edition-medias/PDF/1062',
        readUrl: 'https://siraj.net/api/edition-medias/PDF/1062'
    },
    {
        id: '1063',
        title: 'تنوير المؤمنات - الجزء الثاني',
        author: 'الإمام عبد السلام ياسين',
        category: 'قضايا المرأة',
        source: 'siraj',
        coverUrl: 'https://siraj.net/api/edition-medias/COVER/1063',
        description: 'تكلمة كتاب تنوير المؤمنات في فقه الدعوة والعمل النسائي.',
        downloadUrl: 'https://siraj.net/api/edition-medias/PDF/1063',
        readUrl: 'https://siraj.net/api/edition-medias/PDF/1063'
    },
    {
        id: '1064',
        title: 'العدل: الإسلاميون والحكم',
        author: 'الإمام عبد السلام ياسين',
        category: 'الفكر والسياسة',
        source: 'siraj',
        coverUrl: 'https://siraj.net/api/edition-medias/COVER/1064',
        description: 'رؤية منهاجية لمفهوم العدل والحكم في الإسلام.',
        downloadUrl: 'https://siraj.net/api/edition-medias/PDF/1064',
        readUrl: 'https://siraj.net/api/edition-medias/PDF/1064'
    },
    {
        id: '1075',
        title: 'شعب الإيمان - الجزء الأول',
        author: 'الإمام عبد السلام ياسين',
        category: 'التربية',
        source: 'siraj',
        coverUrl: 'https://siraj.net/api/edition-medias/COVER/1075',
        description: 'شرح وتفصيل لشعب الإيمان من منظور تربوي حركي.',
        downloadUrl: 'https://siraj.net/api/edition-medias/PDF/1075',
        readUrl: 'https://siraj.net/api/edition-medias/PDF/1075'
    },
    {
        id: '1076',
        title: 'شعب الإيمان - الجزء الثاني',
        author: 'الإمام عبد السلام ياسين',
        category: 'التربية',
        source: 'siraj',
        coverUrl: 'https://siraj.net/api/edition-medias/COVER/1076',
        description: 'تكملة شرح شعب الإيمان.',
        downloadUrl: 'https://siraj.net/api/edition-medias/PDF/1076',
        readUrl: 'https://siraj.net/api/edition-medias/PDF/1076'
    },
    {
        id: '1065',
        title: 'مقدمات في المنهاج',
        author: 'الإمام عبد السلام ياسين',
        category: 'المنهاج النبوي',
        source: 'siraj',
        coverUrl: 'https://siraj.net/api/edition-medias/COVER/1065',
        description: 'توضيحات ومفاهيم أساسية لفهم مشروع المنهاج النبوي.',
        downloadUrl: 'https://siraj.net/api/edition-medias/PDF/1065',
        readUrl: 'https://siraj.net/api/edition-medias/PDF/1065'
    },
    {
        id: 'siraj_1066',
        title: 'نظرات في الفقه والتاريخ',
        author: 'الإمام عبد السلام ياسين',
        category: 'الفكر والتاريخ',
        source: 'siraj',
        coverUrl: 'https://siraj.net/api/edition-medias/COVER/1066',
        description: 'دراسة نقدية للمسار التاريخي وفهم الفقه في سياق التحولات الكبرى.',
        downloadUrl: 'https://siraj.net/api/edition-medias/PDF/1066',
        readUrl: 'https://siraj.net/api/edition-medias/PDF/1066'
    },
    {
        id: 'siraj_1073',
        title: 'المنهاج النبوي: تربية وتنظيما وزحفا',
        author: 'الإمام عبد السلام ياسين',
        category: 'المنهاج النبوي',
        source: 'siraj',
        coverUrl: 'https://siraj.net/api/edition-medias/COVER/1073',
        description: 'الكتاب النظري الأساسي لمشروع جماعة العدل والإحسان.',
        downloadUrl: 'https://siraj.net/api/edition-medias/PDF/1073',
        readUrl: 'https://siraj.net/api/edition-medias/PDF/1073'
    }
];

export const allBooks: Book[] = [...sirajBooks];
