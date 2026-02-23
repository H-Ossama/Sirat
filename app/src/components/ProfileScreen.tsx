import { useState } from 'react';
import { ChevronLeftIcon, FlameIcon, ZapIcon, AwardIcon, SettingsIcon, SparkleIcon } from './Icons';
import { useTheme } from './ThemeContext';
import { getRewardsState, getAllBadges, saveUserName } from '../services/rewardsStore';
import { BadgeIconComponent } from './BadgesScreen';

interface ProfileScreenProps {
    onBack: () => void;
    onNavigate: (screen: string) => void;
}

export function ProfileScreen({ onBack, onNavigate }: ProfileScreenProps) {
    const { theme } = useTheme();
    const [state, setState] = useState(() => getRewardsState());
    const badges = getAllBadges(state);
    const unlockedBadges = badges.filter(b => b.unlocked);

    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(state.userName);

    const saveName = () => {
        const trimmed = nameInput.trim() || 'أخي المسلم';
        saveUserName(trimmed);
        setState(getRewardsState());
        setEditingName(false);
    };

    // XP level title
    const getLevelTitle = (xp: number) => {
        if (xp >= 3000) return 'الزاهد';
        if (xp >= 1000) return 'العابد';
        if (xp >= 500) return 'السالك';
        if (xp >= 100) return 'الناشئ';
        return 'المبتدئ';
    };

    const level = Math.floor(state.totalXP / 100) + 1;
    const progressInLevel = state.totalXP % 100;
    const levelTitle = getLevelTitle(state.totalXP);

    const isDark = theme === 'dark';

    return (
        <div className={`h-full overflow-y-auto hide-scrollbar pb-24 transition-colors duration-300 ${isDark ? 'bg-[#0a1220] text-white' : 'bg-[#f8fafc] text-slate-800'}`}>
            {/* Header */}
            <div className={`px-5 pt-6 pb-4 sticky top-0 z-20 backdrop-blur-xl transition-all ${isDark ? 'bg-[#0a1220]/80 border-b border-white/[0.05]' : 'bg-white/80 border-b border-slate-200/50 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition-all ${isDark ? 'bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08]' : 'bg-white border border-slate-200 shadow-sm hover:bg-slate-50'}`}
                    >
                        <ChevronLeftIcon className={`w-5 h-5 rotate-180 ${isDark ? 'text-white/80' : 'text-slate-600'}`} />
                    </button>
                    <h1 className={`text-xl font-amiri font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        الملف الشخصي
                    </h1>
                    <button
                        onClick={() => onNavigate('settings')}
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition-all ${isDark ? 'bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08]' : 'bg-white border border-slate-200 shadow-sm hover:bg-slate-50'}`}
                    >
                        <SettingsIcon className={`w-5 h-5 ${isDark ? 'text-white/80' : 'text-slate-600'}`} />
                    </button>
                </div>
            </div>

            <div className="px-5 pt-6" dir="rtl">
                {/* Profile Card */}
                <div className={`rounded-[2.5rem] p-6 mb-6 relative overflow-hidden border ${isDark ? 'bg-gradient-to-br from-[#111e35] via-[#0f1a2e] to-[#0a1220] border-white/[0.06] shadow-2xl shadow-black/50' : 'bg-white border-slate-100 shadow-[0_8px_40px_rgba(0,0,0,0.06)]'}`}>
                    {/* Decorative glows */}
                    <div className={`absolute top-0 right-0 w-56 h-56 rounded-full blur-[90px] pointer-events-none ${isDark ? 'bg-gold-500/10' : 'bg-gold-300/20'}`} />
                    <div className={`absolute bottom-0 left-0 w-40 h-40 rounded-full blur-[70px] pointer-events-none ${isDark ? 'bg-blue-500/10' : 'bg-blue-200/30'}`} />

                    <div className="flex flex-col items-center text-center relative z-10">
                        {/* Avatar */}
                        <div className="relative mb-4">
                            <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center bg-gradient-to-br from-gold-400 to-amber-500 shadow-xl shadow-gold-500/30 border-4 ${isDark ? 'border-[#111e35]' : 'border-white'}`}>
                                <span className="text-4xl font-amiri font-bold text-white drop-shadow-md">
                                    {state.userName.charAt(0)}
                                </span>
                            </div>
                            <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border-2 ${isDark ? 'bg-[#1a2c42] border-[#111e35]' : 'bg-white border-white'}`}>
                                <SparkleIcon className="w-5 h-5 text-gold-500" />
                            </div>
                        </div>

                        {/* Name & Title */}
                        <div className="w-full max-w-[240px]">
                            {editingName ? (
                                <div className="flex flex-col gap-3">
                                    <input
                                        value={nameInput}
                                        onChange={e => setNameInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && saveName()}
                                        className={`w-full text-center text-xl font-amiri font-bold rounded-2xl px-4 py-3 border outline-none transition-all ${isDark ? 'bg-black/20 border-white/10 text-white focus:border-gold-500/50' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-gold-400'}`}
                                        autoFocus
                                        dir="rtl"
                                        placeholder="أدخل اسمك"
                                    />
                                    <button
                                        onClick={saveName}
                                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-500 text-white text-sm font-bold active:scale-95 shadow-lg shadow-gold-500/25"
                                    >
                                        حفظ التغييرات
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => { setEditingName(true); setNameInput(state.userName); }}
                                    className="w-full group"
                                >
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <h2 className={`text-2xl font-amiri font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            {state.userName}
                                        </h2>
                                        <svg className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-white/30' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </div>
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${isDark ? 'bg-gold-500/10 border-gold-500/20' : 'bg-gold-50 border-gold-200'}`}>
                                        <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-gold-400' : 'text-gold-600'}`}>
                                            {levelTitle}
                                        </span>
                                        <span className={`w-1 h-1 rounded-full ${isDark ? 'bg-gold-500/50' : 'bg-gold-400'}`} />
                                        <span className={`text-[11px] font-bold ${isDark ? 'text-gold-400/70' : 'text-gold-600/80'}`}>
                                            المستوى {level}
                                        </span>
                                    </div>
                                </button>
                            )}
                        </div>

                        {/* XP Progress */}
                        <div className="w-full mt-6 pt-6 border-t border-dashed border-slate-200 dark:border-white/10">
                            <div className="flex items-center justify-between mb-3">
                                <span className={`text-xs font-bold ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                                    المستوى {level}
                                </span>
                                <span className={`text-xs font-bold ${isDark ? 'text-gold-400' : 'text-gold-600'}`}>
                                    {state.totalXP} / {(level) * 100} XP
                                </span>
                                <span className={`text-xs font-bold ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                                    المستوى {level + 1}
                                </span>
                            </div>
                            <div className={`h-3 rounded-full overflow-hidden p-0.5 ${isDark ? 'bg-black/40 border border-white/5' : 'bg-slate-100 border border-slate-200/50'}`}>
                                <div
                                    className="h-full bg-gradient-to-l from-gold-400 to-amber-500 rounded-full transition-all duration-1000 relative overflow-hidden"
                                    style={{ width: `${progressInLevel}%` }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className={`rounded-[2rem] p-5 border relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-orange-500/10 to-red-500/5 border-orange-500/20' : 'bg-gradient-to-br from-orange-50 to-red-50/50 border-orange-100'}`}>
                        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl ${isDark ? 'bg-orange-500/20' : 'bg-orange-400/20'}`} />
                        <div className="relative z-10">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-sm ${isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-white text-orange-500'}`}>
                                <FlameIcon className="w-6 h-6" />
                            </div>
                            <p className={`text-3xl font-amiri font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {state.currentStreak}
                            </p>
                            <p className={`text-xs font-bold ${isDark ? 'text-orange-200/60' : 'text-orange-600/70'}`}>
                                أيام متتالية
                            </p>
                        </div>
                    </div>

                    <div className={`rounded-[2rem] p-5 border relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border-indigo-500/20' : 'bg-gradient-to-br from-indigo-50 to-purple-50/50 border-indigo-100'}`}>
                        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-400/20'}`} />
                        <div className="relative z-10">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-sm ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white text-indigo-500'}`}>
                                <AwardIcon className="w-6 h-6" />
                            </div>
                            <p className={`text-3xl font-amiri font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {unlockedBadges.length}
                            </p>
                            <p className={`text-xs font-bold ${isDark ? 'text-indigo-200/60' : 'text-indigo-600/70'}`}>
                                أوسمة مكتسبة
                            </p>
                        </div>
                    </div>
                </div>

                {/* Badges Section */}
                <div className={`rounded-[2rem] p-6 border mb-6 ${isDark ? 'bg-[#111e35]/50 border-white/[0.05]' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-gold-500/10' : 'bg-gold-50'}`}>
                                <AwardIcon className={`w-5 h-5 ${isDark ? 'text-gold-400' : 'text-gold-500'}`} />
                            </div>
                            <h3 className={`text-lg font-amiri font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                أحدث الأوسمة
                            </h3>
                        </div>
                        <button
                            onClick={() => onNavigate('badges')}
                            className={`text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 ${isDark ? 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                        >
                            عرض الكل
                        </button>
                    </div>

                    {unlockedBadges.length === 0 ? (
                        <div className={`text-center py-8 rounded-2xl border border-dashed ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
                            <AwardIcon className={`w-8 h-8 mx-auto mb-3 ${isDark ? 'text-white/20' : 'text-slate-300'}`} />
                            <p className={`text-sm font-bold mb-1 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
                                لم تكتسب أي وسام بعد
                            </p>
                            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                                أكمل التحديات اليومية لفتح الأوسمة
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-3">
                            {unlockedBadges.slice(0, 3).map(badge => (
                                <button
                                    key={badge.id}
                                    onClick={() => onNavigate('badges')}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all active:scale-95 ${isDark ? 'bg-black/20 border-white/5 hover:bg-white/5' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}
                                >
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${badge.gradient} flex items-center justify-center shadow-lg shadow-black/10`}>
                                        <BadgeIconComponent name={badge.iconName} className="w-6 h-6 text-white" />
                                    </div>
                                    <span className={`text-[10px] font-bold text-center leading-tight ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                                        {badge.nameAr}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Longest Streak */}
                {state.longestStreak > 0 && (
                    <div className={`rounded-[2rem] p-5 border flex items-center justify-between ${isDark ? 'bg-gradient-to-r from-red-500/10 to-orange-500/5 border-red-500/20' : 'bg-gradient-to-r from-red-50 to-orange-50/50 border-red-100'}`}>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                                <FlameIcon className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-red-200/60' : 'text-red-600/70'}`}>
                                    أطول سلسلة
                                </p>
                                <p className={`text-xl font-amiri font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {state.longestStreak} يوم متتالي
                                </p>
                            </div>
                        </div>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                            <AwardIcon className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
