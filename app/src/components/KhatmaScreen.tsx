import { useState, useMemo } from 'react';
import { ChevronLeftIcon } from './Icons';
import { useTheme } from './ThemeContext';

// ─── Juz Data ────────────────────────────────────────────────────────────────
const JUZ_DATA = [
    { num: 1,  label: 'الأول',             startSurah: 1,  surahName: 'الفاتحة',    pageStart: 1,   pageEnd: 21  },
    { num: 2,  label: 'الثاني',            startSurah: 2,  surahName: 'البقرة',      pageStart: 22,  pageEnd: 41  },
    { num: 3,  label: 'الثالث',            startSurah: 2,  surahName: 'البقرة',      pageStart: 42,  pageEnd: 61  },
    { num: 4,  label: 'الرابع',            startSurah: 3,  surahName: 'آل عمران',   pageStart: 62,  pageEnd: 81  },
    { num: 5,  label: 'الخامس',            startSurah: 4,  surahName: 'النساء',      pageStart: 82,  pageEnd: 101 },
    { num: 6,  label: 'السادس',            startSurah: 4,  surahName: 'النساء',      pageStart: 102, pageEnd: 121 },
    { num: 7,  label: 'السابع',            startSurah: 5,  surahName: 'المائدة',     pageStart: 122, pageEnd: 141 },
    { num: 8,  label: 'الثامن',            startSurah: 6,  surahName: 'الأنعام',    pageStart: 142, pageEnd: 161 },
    { num: 9,  label: 'التاسع',            startSurah: 7,  surahName: 'الأعراف',    pageStart: 162, pageEnd: 181 },
    { num: 10, label: 'العاشر',            startSurah: 8,  surahName: 'الأنفال',    pageStart: 182, pageEnd: 201 },
    { num: 11, label: 'الحادي عشر',        startSurah: 9,  surahName: 'التوبة',      pageStart: 202, pageEnd: 221 },
    { num: 12, label: 'الثاني عشر',        startSurah: 11, surahName: 'هود',         pageStart: 222, pageEnd: 241 },
    { num: 13, label: 'الثالث عشر',        startSurah: 12, surahName: 'يوسف',        pageStart: 242, pageEnd: 261 },
    { num: 14, label: 'الرابع عشر',        startSurah: 15, surahName: 'الحجر',       pageStart: 262, pageEnd: 281 },
    { num: 15, label: 'الخامس عشر',        startSurah: 17, surahName: 'الإسراء',    pageStart: 282, pageEnd: 301 },
    { num: 16, label: 'السادس عشر',        startSurah: 18, surahName: 'الكهف',       pageStart: 302, pageEnd: 321 },
    { num: 17, label: 'السابع عشر',        startSurah: 21, surahName: 'الأنبياء',   pageStart: 322, pageEnd: 341 },
    { num: 18, label: 'الثامن عشر',        startSurah: 23, surahName: 'المؤمنون',   pageStart: 342, pageEnd: 361 },
    { num: 19, label: 'التاسع عشر',        startSurah: 25, surahName: 'الفرقان',     pageStart: 362, pageEnd: 381 },
    { num: 20, label: 'العشرون',           startSurah: 27, surahName: 'النمل',        pageStart: 382, pageEnd: 401 },
    { num: 21, label: 'الحادي والعشرون',   startSurah: 29, surahName: 'العنكبوت',   pageStart: 402, pageEnd: 421 },
    { num: 22, label: 'الثاني والعشرون',   startSurah: 33, surahName: 'الأحزاب',    pageStart: 422, pageEnd: 441 },
    { num: 23, label: 'الثالث والعشرون',   startSurah: 36, surahName: 'يس',          pageStart: 442, pageEnd: 461 },
    { num: 24, label: 'الرابع والعشرون',   startSurah: 39, surahName: 'الزمر',       pageStart: 462, pageEnd: 481 },
    { num: 25, label: 'الخامس والعشرون',   startSurah: 41, surahName: 'فصلت',        pageStart: 482, pageEnd: 501 },
    { num: 26, label: 'السادس والعشرون',   startSurah: 46, surahName: 'الأحقاف',    pageStart: 502, pageEnd: 521 },
    { num: 27, label: 'السابع والعشرون',   startSurah: 51, surahName: 'الذاريات',   pageStart: 522, pageEnd: 541 },
    { num: 28, label: 'الثامن والعشرون',   startSurah: 58, surahName: 'المجادلة',   pageStart: 542, pageEnd: 561 },
    { num: 29, label: 'التاسع والعشرون',   startSurah: 67, surahName: 'الملك',       pageStart: 562, pageEnd: 581 },
    { num: 30, label: 'الثلاثون',          startSurah: 78, surahName: 'النبأ',        pageStart: 582, pageEnd: 604 },
];

function loadCompleted(): Set<number> {
    try {
        const raw = localStorage.getItem('khatma_juz_v1');
        if (raw) return new Set<number>(JSON.parse(raw));
    } catch { /* ignore */ }
    return new Set<number>();
}

function saveCompleted(set: Set<number>) {
    localStorage.setItem('khatma_juz_v1', JSON.stringify(Array.from(set)));
}

function loadGoalStart(): string | null {
    return localStorage.getItem('khatma_goal_start');
}

function saveGoalStart(date: string) {
    localStorage.setItem('khatma_goal_start', date);
}

function getTodayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(from: string, to: string): number {
    const a = new Date(from);
    const b = new Date(to);
    return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000));
}

function ProgressRing({ pct, size = 80, stroke = 5, color = '#d4a528' }: { pct: number; size?: number; stroke?: number; color?: string }) {
    const r = (size - stroke * 2) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
            <circle
                cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke={color} strokeWidth={stroke}
                strokeDasharray={circ} strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
        </svg>
    );
}

interface KhatmaScreenProps {
    onBack: () => void;
    onNavigate?: (screen: string, surahId?: number, page?: number) => void;
}

export function KhatmaScreen({ onBack, onNavigate }: KhatmaScreenProps) {
    const { theme } = useTheme();
    const D = theme !== 'light';

    const [completed, setCompleted] = useState<Set<number>>(loadCompleted);
    const [goalStart, setGoalStart] = useState<string | null>(loadGoalStart);
    const [activeTab, setActiveTab] = useState<'ajza' | 'summary'>('ajza');
    const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');

    const totalJuz = 30;
    const doneCount = completed.size;
    const pct = Math.round((doneCount / totalJuz) * 100);
    const today = getTodayStr();
    const dayIndex = goalStart ? Math.min(daysBetween(goalStart, today), 29) : null;
    const todayJuz = dayIndex !== null ? dayIndex + 1 : null;

    const visibleJuz = useMemo(() => {
        if (filter === 'pending') return JUZ_DATA.filter(j => !completed.has(j.num));
        if (filter === 'done') return JUZ_DATA.filter(j => completed.has(j.num));
        return JUZ_DATA;
    }, [filter, completed]);

    const toggleJuz = (num: number) => {
        const next = new Set(completed);
        if (next.has(num)) { next.delete(num); } else {
            next.add(num);
            if (!goalStart) { const start = getTodayStr(); setGoalStart(start); saveGoalStart(start); }
        }
        setCompleted(next);
        saveCompleted(next);
    };

    const handleRead = (surahId: number, pageStart: number) => { if (onNavigate) onNavigate('quran', surahId, pageStart); };
    const handleStartGoal = () => { const start = getTodayStr(); setGoalStart(start); saveGoalStart(start); };
    const handleResetGoal = () => {
        localStorage.removeItem('khatma_goal_start'); localStorage.removeItem('khatma_juz_v1');
        setGoalStart(null); setCompleted(new Set());
    };

    const bg = D ? 'bg-gradient-to-b from-[#0b1929] via-[#0f1f38] to-[#0a1525] text-white' : 'bg-[#f4f7fb] text-slate-800';
    const headerBg = D ? 'bg-[#0b1929]/95 border-b border-white/[0.05]' : 'bg-white/95 border-b border-slate-200 shadow-sm';
    const tabBg = D ? 'bg-white/[0.05] border-white/[0.08]' : 'bg-slate-100 border-slate-200';
    const tabActive = D ? 'bg-[#162540] border-gold-400/20 text-gold-300' : 'bg-white border-slate-200 text-gold-600 shadow-sm';
    const tabInactive = D ? 'text-white/35' : 'text-slate-400';

    return (
        <div className={`h-full overflow-hidden flex flex-col transition-colors duration-300 ${bg}`}>
            {/* Header */}
            <div className={`px-5 pt-5 pb-3 sticky top-0 z-20 backdrop-blur-xl transition-all ${headerBg}`}>
                <div className="flex items-center justify-between mb-4">
                    <button onClick={onBack} className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${D ? 'bg-white/[0.08] border border-white/[0.1]' : 'bg-slate-100 border border-slate-200'}`}>
                        <ChevronLeftIcon className={`w-4 h-4 rotate-180 ${D ? 'text-white/80' : 'text-slate-600'}`} />
                    </button>
                    <h1 className={`text-xl font-amiri font-bold ${D ? 'text-gold-300' : 'text-gold-600'}`}>ختمة القرآن الكريم</h1>
                    <div className="w-10" />
                </div>

                {/* Progress hero */}
                <div className={`rounded-3xl border p-5 relative overflow-hidden ${D ? 'bg-gradient-to-br from-[#1a2c42] to-[#0d1e33] border-gold-400/15' : 'bg-white border-slate-100'}`}>
                    <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-gold-500/[0.07] blur-[40px] pointer-events-none" />
                    <div className="flex items-center gap-5 relative">
                        <div className="relative flex-shrink-0">
                            <ProgressRing pct={pct} size={76} stroke={5} color={D ? '#d4a528' : '#b5891c'} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-[18px] font-amiri font-bold leading-none ${D ? 'text-gold-300' : 'text-gold-600'}`}>{doneCount}</span>
                                <span className={`text-[9px] font-bold uppercase ${D ? 'text-white/30' : 'text-slate-400'}`}>جزء</span>
                            </div>
                        </div>
                        <div className="flex-1" dir="rtl">
                            <div className="flex items-baseline gap-1.5 mb-1">
                                <span className={`text-3xl font-amiri font-bold ${D ? 'text-white' : 'text-slate-800'}`}>{pct}%</span>
                                <span className={`text-[12px] font-bold ${D ? 'text-white/40' : 'text-slate-400'}`}>مكتمل</span>
                            </div>
                            <p className={`text-[12px] mb-3 ${D ? 'text-white/40' : 'text-slate-400'}`}>{doneCount} من {totalJuz} جزءاً — {totalJuz - doneCount} متبقٍ</p>
                            <div className={`h-1.5 rounded-full overflow-hidden ${D ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                                <div className="h-full bg-gradient-to-l from-gold-400 to-amber-500 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    </div>
                    {goalStart && todayJuz !== null && (
                        <div className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-xl ${D ? 'bg-gold-400/[0.08] border border-gold-400/15' : 'bg-gold-50 border border-gold-200'}`} dir="rtl">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${todayJuz <= doneCount ? 'bg-emerald-400' : 'bg-gold-400 animate-pulse'}`} />
                            <p className={`text-[12px] font-amiri font-bold ${D ? 'text-gold-300/80' : 'text-gold-700'}`}>
                                {todayJuz <= doneCount ? `أتممت جزء اليوم — الجزء ${JUZ_DATA[todayJuz - 1]?.label}` : `جزء اليوم: الجزء ${JUZ_DATA[todayJuz - 1]?.label} — ${JUZ_DATA[todayJuz - 1]?.surahName}`}
                            </p>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className={`flex mt-3 p-1 rounded-xl border ${tabBg}`}>
                    {[{ id: 'ajza', label: 'الأجزاء' }, { id: 'summary', label: 'الملخص' }].map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                            className={`flex-1 py-2 rounded-lg text-[13px] font-amiri font-bold transition-all border ${activeTab === t.id ? tabActive : `border-transparent ${tabInactive}`}`}>
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto hide-scrollbar pb-28">

                {/* Ajza tab */}
                {activeTab === 'ajza' && (
                    <div className="px-4 pt-4">
                        <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar pb-1" dir="rtl">
                            {[{ id: 'all', label: 'الكل' }, { id: 'pending', label: 'المتبقي' }, { id: 'done', label: 'المكتمل' }].map(f => (
                                <button key={f.id} onClick={() => setFilter(f.id as any)}
                                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[12px] font-amiri font-bold border transition-all ${filter === f.id
                                        ? D ? 'bg-gold-500/15 border-gold-400/30 text-gold-300' : 'bg-gold-50 border-gold-300 text-gold-700'
                                        : D ? 'bg-white/[0.04] border-white/[0.08] text-white/40' : 'bg-white border-slate-200 text-slate-400'}`}>
                                    {f.label}
                                    {f.id === 'done' && doneCount > 0 && (
                                        <span className={`mr-1 text-[10px] px-1.5 py-0.5 rounded-full ${D ? 'bg-gold-400/20 text-gold-400' : 'bg-gold-100 text-gold-600'}`}>{doneCount}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-2">
                            {visibleJuz.map(juz => {
                                const isDone = completed.has(juz.num);
                                const isToday = todayJuz === juz.num;
                                const pageCount = juz.pageEnd - juz.pageStart + 1;
                                return (
                                    <div key={juz.num} dir="rtl"
                                        className={`rounded-2xl border transition-all ${isDone
                                            ? D ? 'bg-emerald-500/[0.07] border-emerald-400/20' : 'bg-emerald-50 border-emerald-200'
                                            : isToday ? D ? 'bg-gold-400/[0.07] border-gold-400/25' : 'bg-gold-50 border-gold-300'
                                                : D ? 'bg-white/[0.025] border-white/[0.07]' : 'bg-white border-slate-100 shadow-sm'}`}>
                                        <div className="flex items-center gap-3 p-3.5">
                                            <button onClick={() => toggleJuz(juz.num)}
                                                className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${isDone ? 'bg-emerald-500 border-emerald-500' : D ? 'border-white/20 bg-white/[0.04]' : 'border-slate-300 bg-white'}`}>
                                                {isDone && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                                            </button>

                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? D ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700' : isToday ? D ? 'bg-gold-400/20 text-gold-300' : 'bg-gold-100 text-gold-700' : D ? 'bg-white/[0.07] text-white/50' : 'bg-slate-100 text-slate-500'}`}>
                                                <span className="text-[13px] font-amiri font-bold">{juz.num}</span>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <p className={`text-[14px] font-amiri font-bold ${isDone ? D ? 'text-emerald-300' : 'text-emerald-700' : D ? 'text-white/90' : 'text-slate-800'}`}>الجزء {juz.label}</p>
                                                    {isToday && !isDone && (
                                                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${D ? 'bg-gold-400/20 text-gold-400' : 'bg-gold-100 text-gold-700'}`}>اليوم</span>
                                                    )}
                                                </div>
                                                <p className={`text-[11px] ${isDone ? D ? 'text-emerald-400/50' : 'text-emerald-600/60' : D ? 'text-white/35' : 'text-slate-400'}`}>
                                                    {juz.surahName} · ص {juz.pageStart}–{juz.pageEnd} · {pageCount} صفحة
                                                </p>
                                            </div>

                                            {onNavigate && (
                                                <button onClick={() => handleRead(juz.startSurah, juz.pageStart)}
                                                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-amiri font-bold transition-all active:scale-95 ${isDone ? D ? 'bg-white/[0.06] text-white/40 border border-white/[0.08]' : 'bg-slate-100 text-slate-400 border border-slate-200' : D ? 'bg-gold-400/15 text-gold-400 border border-gold-400/20' : 'bg-gold-50 text-gold-700 border border-gold-200'}`}>
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                    </svg>
                                                    اقرأ
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {visibleJuz.length === 0 && (
                                <div className="flex flex-col items-center py-16 gap-3">
                                    <p className={`text-[14px] font-amiri font-bold ${D ? 'text-white/30' : 'text-slate-400'}`}>
                                        {filter === 'done' ? 'لم تكمل أي جزء بعد' : 'لا توجد نتائج'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Summary tab */}
                {activeTab === 'summary' && (
                    <div className="px-4 pt-4 space-y-4" dir="rtl">
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'مكتمل', value: doneCount.toString(), color: D ? 'text-emerald-400' : 'text-emerald-700' },
                                { label: 'متبقٍ', value: (totalJuz - doneCount).toString(), color: D ? 'text-gold-300' : 'text-gold-700' },
                                { label: 'النسبة', value: `${pct}%`, color: D ? 'text-white' : 'text-slate-800' },
                            ].map(stat => (
                                <div key={stat.label} className={`rounded-2xl border p-3 text-center ${D ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-white border-slate-100'}`}>
                                    <p className={`text-2xl font-amiri font-bold mb-0.5 ${stat.color}`}>{stat.value}</p>
                                    <p className={`text-[10px] font-bold uppercase tracking-wide ${D ? 'text-white/25' : 'text-slate-400'}`}>{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        <div className={`rounded-2xl border p-5 ${D ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-white border-slate-100'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className={`text-[15px] font-amiri font-bold ${D ? 'text-white' : 'text-slate-800'}`}>هدف الختمة اليومي</h3>
                                {goalStart && (
                                    <button onClick={handleResetGoal}
                                        className={`text-[11px] font-bold px-3 py-1.5 rounded-lg ${D ? 'text-white/25 bg-white/[0.04] border border-white/[0.07]' : 'text-slate-400 bg-slate-100 border border-slate-200'}`}>
                                        إعادة
                                    </button>
                                )}
                            </div>
                            {goalStart ? (
                                <div className="space-y-2.5">
                                    <div className={`rounded-xl p-3 ${D ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                                        <div className="flex justify-between">
                                            <span className={`text-[12px] ${D ? 'text-white/40' : 'text-slate-400'}`}>بدأت في</span>
                                            <span className={`text-[13px] font-amiri font-bold ${D ? 'text-white/70' : 'text-slate-700'}`}>{goalStart}</span>
                                        </div>
                                    </div>
                                    {todayJuz !== null && (
                                        <div className={`rounded-xl p-3 ${D ? 'bg-gold-400/[0.07]' : 'bg-gold-50'}`}>
                                            <div className="flex justify-between">
                                                <span className={`text-[12px] ${D ? 'text-gold-400/60' : 'text-gold-700/70'}`}>جزء اليوم ({dayIndex !== null ? `يوم ${dayIndex + 1}` : ''})</span>
                                                <span className={`text-[13px] font-amiri font-bold ${D ? 'text-gold-300' : 'text-gold-700'}`}>الجزء {JUZ_DATA[Math.min((todayJuz ?? 1) - 1, 29)]?.label}</span>
                                            </div>
                                        </div>
                                    )}
                                    {doneCount === totalJuz && (
                                        <div className={`rounded-xl p-4 text-center mt-1 ${D ? 'bg-emerald-500/10 border border-emerald-400/20' : 'bg-emerald-50 border border-emerald-200'}`}>
                                            <p className={`text-[16px] font-amiri font-bold ${D ? 'text-emerald-300' : 'text-emerald-700'}`}>تهانينا — أتممت ختمة القرآن الكريم</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-3">
                                    <p className={`text-[13px] mb-4 leading-relaxed ${D ? 'text-white/40' : 'text-slate-400'}`}>جزء في كل يوم — ختم القرآن في ثلاثين يوماً</p>
                                    <button onClick={handleStartGoal}
                                        className={`px-6 py-2.5 rounded-xl text-[14px] font-amiri font-bold transition-all active:scale-95 ${D ? 'bg-gold-400 text-[#0b1929]' : 'bg-gold-500 text-white'}`}>
                                        ابدأ الختمة اليوم
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Grid overview */}
                        <div className={`rounded-2xl border p-4 ${D ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-white border-slate-100'}`}>
                            <h3 className={`text-[14px] font-amiri font-bold mb-3 ${D ? 'text-white/80' : 'text-slate-700'}`}>نظرة عامة على الأجزاء</h3>
                            <div className="grid grid-cols-6 gap-1.5">
                                {JUZ_DATA.map(juz => {
                                    const isDone = completed.has(juz.num);
                                    const isToday = todayJuz === juz.num;
                                    return (
                                        <button key={juz.num} onClick={() => toggleJuz(juz.num)}
                                            className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-amiri font-bold transition-all active:scale-90 ${isDone ? 'bg-emerald-500 text-white' : isToday ? D ? 'bg-gold-400/30 text-gold-300 border border-gold-400/40' : 'bg-gold-100 text-gold-700 border border-gold-300' : D ? 'bg-white/[0.05] text-white/35' : 'bg-slate-100 text-slate-400'}`}>
                                            {juz.num}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className={`text-[10px] mt-2 text-center ${D ? 'text-white/20' : 'text-slate-300'}`}>اضغط على الجزء لتحديث حالته</p>
                        </div>

                        <div className={`rounded-2xl border p-5 text-center ${D ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-emerald-50 border-emerald-100'}`}>
                            <p className={`text-[20px] font-scheherazade leading-relaxed ${D ? 'text-white/60' : 'text-emerald-800/80'}`}>وَرَتِّلِ الْقُرْآنَ تَرْتِيلاً</p>
                            <p className={`text-[11px] mt-2 font-bold ${D ? 'text-white/25' : 'text-emerald-600/50'}`}>سورة المزمل : 4</p>
                        </div>

                        {doneCount > 0 && (
                            <div className="pt-2 pb-4 flex justify-center">
                                <button onClick={handleResetGoal} className={`text-[12px] font-bold underline underline-offset-2 ${D ? 'text-white/20' : 'text-slate-300'}`}>
                                    إعادة تعيين الختمة
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}