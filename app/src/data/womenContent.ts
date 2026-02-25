export interface WomanContentItem {
    id: string;
    title: string;
    content: string;
    category: 'hadith' | 'fiqh' | 'dua' | 'advice';
    source?: string;
}

export const womenContent: WomanContentItem[] = [
    {
        id: 'hadith-1',
        title: 'فضل المرأة الصالحة',
        content: 'عن عبد الله بن عمرو أن رسول الله ﷺ قال: "الدنيا متاع، وخير متاع الدنيا المرأة الصالحة".',
        category: 'hadith',
        source: 'رواه مسلم'
    },
    {
        id: 'hadith-2',
        title: 'حسن التبعل',
        content: 'قال رسول الله ﷺ: "إذا صلت المرأة خمسها، وصامت شهرها، وحفظت فرجها، وأطاعت زوجها، قيل لها: ادخلي الجنة من أي أبواب الجنة شئت".',
        category: 'hadith',
        source: 'صحيح الجامع'
    },
    {
        id: 'hadith-3',
        title: 'الوصية بالنساء',
        content: 'قال رسول الله ﷺ: "استوصوا بالنساء خيراً".',
        category: 'hadith',
        source: 'متفق عليه'
    },
    {
        id: 'fiqh-1',
        title: 'الصلاة والحائض',
        content: 'الحائض لا تقضي الصلاة التي فاتتها أثناء الحيض، ولكنها تقضي الصيام.',
        category: 'fiqh',
        source: 'إجماع العلماء'
    },
    {
        id: 'fiqh-2',
        title: 'قراءة القرآن للحائض',
        content: 'يجوز للحائض قراءة القرآن عن ظهر قلب أو من الهاتف دون مس المصحف الورقي مباشرة عند الحاجة والذكر، وهو قول المالكية وبعض العلماء.',
        category: 'fiqh',
        source: 'الفتوى'
    },
    {
        id: 'advice-1',
        title: 'أنتِ مربية الأجيل',
        content: 'تذكري أنكِ المدرسة الأولى لأبنائك، فبصلاحك يصلح المجتمع بأسره.',
        category: 'advice'
    },
    {
        id: 'advice-2',
        title: 'الاحتساب لله',
        content: 'احتسبي تعبك في بيتك ورعاية أسرتك عند الله، فكل جهد تبذلينه هو في ميزان حسناتك إن شاء الله.',
        category: 'advice'
    }
];
