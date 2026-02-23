export interface Tasbih {
    id: string;
    title: string;
    description?: string;
    deedId?: number; // Map to reward system Deed
}

export const tasbihs: Tasbih[] = [
    { id: 'custom', title: 'تسبيح مخصص' }, // Added custom option at the beginning
    { id: 'subhan_allah', title: 'سبحان الله' },
    { id: 'alhamdulillah', title: 'الحمد لله' },
    { id: 'allahu_akbar', title: 'الله أكبر' },
    { id: 'la_ilaha_illa_allah', title: 'لا إله إلا الله', deedId: 20 },
    { id: 'astaghfirullah', title: 'أستغفر الله', deedId: 19 },
    { id: 'subhan_allah_bihamdihi', title: 'سبحان الله وبحمده' },
    { id: 'subhan_allah_azim', title: 'سبحان الله العظيم' },
    { id: 'la_hawla', title: 'لا حول ولا قوة إلا بالله' },
    { id: 'salawat', title: 'اللهم صلِّ على محمد', deedId: 6 },
    { id: 'hasbi_allah', title: 'حسبي الله ونعم الوكيل' },
    { id: 'subhan_malik', title: 'سبحان الملك القدوس' },
    { id: 'la_ilaha_illa_anta', title: 'لا إله إلا أنت سبحانك إني كنت من الظالمين' }
];
