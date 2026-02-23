export interface VideoCategory {
    id: string;
    title: string;
    subtitle: string;
    searchQueries: string[];
    /** Single optimised query used when fetching Shorts/Reels (saves API quota) */
    reelsQuery: string;
}

export const videoCategories: VideoCategory[] = [
    {
        id: 'stories-seerah',
        title: 'السير والقصص الإيمانية',
        subtitle: 'قصص الأنبياء والصحابة والسيرة',
        searchQueries: [
            'قصص الأنبياء كاملة',
            'قصص الصحابة مؤثرة',
            'السيرة النبوية كاملة',
            'مواقف من سيرة النبي ﷺ'
        ],
        reelsQuery: 'موقف من السيرة النبوية قصير',
    },
    {
        id: 'dialogues-doubts',
        title: 'الحوارات والشبهات',
        subtitle: 'نقاشات راقية وردود علمية مبسطة',
        searchQueries: [
            'حوارات دينية للشباب',
            'الشبهات والرد عليها',
            'الرد على الإلحاد بالعقل',
            'الأسئلة العقدية الشائعة'
        ],
        reelsQuery: 'رد ديني سريع على سؤال',
    },
    {
        id: 'repentance-tazkiyah',
        title: 'التوبة وتزكية النفس',
        subtitle: 'كيف نتوب ونترك المعاصي ونثبت',
        searchQueries: [
            'كيف نتوب إلى الله توبة نصوحا',
            'ترك المعاصي نهائيا',
            'تزكية النفس وتطوير الذات الإسلامي',
            'قصص التوبة المؤثرة'
        ],
        reelsQuery: 'كلام يدفعك للتوبة قصير',
    },
    {
        id: 'ibadat-fiqh',
        title: 'فقه العبادات',
        subtitle: 'الصلاة والصيام والطهارة والزكاة',
        searchQueries: [
            'فقه مبسط للمبتدئين',
            'أحكام الصلاة باختصار',
            'أحكام الصيام للمسلم',
            'الطهارة والوضوء الصحيح',
            'شرح الزكاة للمبتدئين'
        ],
        reelsQuery: 'حكم شرعي قصير فقه',
    },
    {
        id: 'quran-tafsir',
        title: 'القرآن وتفسيره',
        subtitle: 'تفسير ميسر وتدبر وأسباب نزول',
        searchQueries: [
            'تفسير القرآن المبسط',
            'تدبر الآيات',
            'أسباب النزول شرح',
            'التفسير الموضوعي للقرآن'
        ],
        reelsQuery: 'تفسير آية من القرآن قصير',
    },
    {
        id: 'muslim-life-skills',
        title: 'مهارات المسلم اليومية',
        subtitle: 'الانضباط والصبر وإدارة الوقت',
        searchQueries: [
            'إدارة الوقت للمسلم',
            'الانضباط والصلاة',
            'الصبر على الابتلاء',
            'الالتزام بالطاعات يوميا'
        ],
        reelsQuery: 'نصيحة إسلامية يومية قصيرة',
    },
    {
        id: 'muamalat-finance',
        title: 'المعاملات والمال',
        subtitle: 'فقه المعاملات المالية المعاصرة',
        searchQueries: [
            'فقه المعاملات المالية',
            'أحكام البيع والشراء في الإسلام',
            'الربا والمعاملات البنكية',
            'فقه الديون والعقود'
        ],
        reelsQuery: 'حلال وحرام في المال قصير',
    },
    {
        id: 'civilization-scholars',
        title: 'علماء وقصص ملهمة',
        subtitle: 'علماء غيروا العالم وقصص معاصرة',
        searchQueries: [
            'علماء مسلمون غيروا العالم',
            'قصص معاصرة ملهمة',
            'نماذج شبابية إسلامية ناجحة',
            'الإعجاز العلمي في القرآن'
        ],
        reelsQuery: 'فائدة إسلامية قصيرة علماء',
    }
];
