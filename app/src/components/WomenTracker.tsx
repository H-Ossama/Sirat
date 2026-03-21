import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DropletIcon, CheckIcon, CalendarIcon,
  SparkleIcon, MoonIcon, SunIcon, ClockIcon, LanternIcon,
  HeartIcon, BookOpenIcon, TrashIcon, ChevronLeftIcon
} from './Icons';
import { useTheme } from './ThemeContext';

interface TrackerData {
  lastPeriodStart: string;
  cycleLength: number;
  periodLength: number;
  history: Array<{ date: string; type: 'period' | 'purity' }>;
}

function getDaysDiff(from: string, to: Date): number {
  const start = new Date(from);
  return Math.floor((to.getTime() - start.getTime()) / (1000 * 3600 * 24));
}

function formatRelativeDay(dateStr: string): string {
  const diff = getDaysDiff(dateStr, new Date());
  if (diff === 0) return 'اليوم';
  if (diff === 1) return 'أمس';
  if (diff < 7) return `منذ ${diff} أيام`;
  if (diff < 30) return `منذ ${Math.floor(diff / 7)} أسبوع`;
  return `منذ ${Math.floor(diff / 30)} شهر`;
}

export function WomenTracker({ onBack }: { onBack: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [data, setData] = useState<TrackerData>(() => {
    const saved = localStorage.getItem('women_tracker_data');
    return saved ? JSON.parse(saved) : {
      lastPeriodStart: '',
      cycleLength: 28,
      periodLength: 6,
      history: []
    };
  });

  const [showConfirm, setShowConfirm] = useState<'start' | 'end' | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    localStorage.setItem('women_tracker_data', JSON.stringify(data));
  }, [data]);

  const currentStatus = useMemo(() => {
    if (!data.lastPeriodStart) return 'none';
    const diffDays = getDaysDiff(data.lastPeriodStart, new Date());
    const lastAction = data.history[0]?.type;
    if (lastAction === 'period' && diffDays < 15) return 'period';
    return 'purity';
  }, [data.lastPeriodStart, data.history]);

  const dayCount = useMemo(() => {
    if (!data.history.length) return 0;
    const last = data.history[0];
    return getDaysDiff(last.date, new Date());
  }, [data.history]);

  const nextPeriodEstimate = useMemo(() => {
    if (!data.lastPeriodStart || currentStatus !== 'purity') return null;
    const next = new Date(data.lastPeriodStart);
    next.setDate(next.getDate() + data.cycleLength);
    const todayStr = new Date().toISOString().split('T')[0];
    const daysLeft = getDaysDiff(todayStr, next);
    return daysLeft > 0 ? daysLeft : null;
  }, [data.lastPeriodStart, data.cycleLength, currentStatus]);

  const handleStartPeriod = useCallback(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    setData(prev => ({
      ...prev,
      lastPeriodStart: todayStr,
      history: [{ date: todayStr, type: 'period' as const }, ...prev.history].slice(0, 50)
    }));
    setShowConfirm(null);
  }, []);

  const handleEndPeriod = useCallback(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    setData(prev => ({
      ...prev,
      history: [{ date: todayStr, type: 'purity' as const }, ...prev.history].slice(0, 50)
    }));
    setShowConfirm(null);
  }, []);

  const clearHistory = useCallback(() => {
    setData(prev => ({ ...prev, history: [], lastPeriodStart: '' }));
    setShowHistory(false);
  }, []);

  const isPeriod = currentStatus === 'period';

  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-colors duration-700 ${
        isDark ? 'bg-[#0c0f1a]' : 'bg-[#faf9f7]'
      }`}
      dir="rtl"
    >
      {/* ===== Ambient Background ===== */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Large orb top-right */}
        <div
          className={`absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[120px] transition-all duration-[2000ms] ${
            isPeriod
              ? (isDark ? 'bg-rose-500/15' : 'bg-rose-300/20')
              : (isDark ? 'bg-emerald-500/10' : 'bg-emerald-300/15')
          }`}
        />
        {/* Small orb bottom-left */}
        <div
          className={`absolute -bottom-20 -left-20 w-72 h-72 rounded-full blur-[100px] transition-all duration-[2000ms] ${
            isPeriod
              ? (isDark ? 'bg-pink-500/10' : 'bg-pink-200/25')
              : (isDark ? 'bg-teal-500/8' : 'bg-teal-200/20')
          }`}
        />
        {/* Decorative geometric patterns (Islamic-inspired) */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.015] ${isDark ? 'opacity-[0.03]' : ''}`}>
          <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="0.3" className={isDark ? 'text-white' : 'text-slate-900'}>
            <circle cx="100" cy="100" r="90" />
            <circle cx="100" cy="100" r="70" />
            <circle cx="100" cy="100" r="50" />
            <circle cx="100" cy="100" r="30" />
            {[0, 30, 60, 90, 120, 150].map(deg => (
              <line key={deg} x1="100" y1="10" x2="100" y2="190" transform={`rotate(${deg} 100 100)`} />
            ))}
          </svg>
        </div>
      </div>

      {/* ===== Main Content ===== */}
      <div className="relative z-10 max-w-lg mx-auto px-5 pb-32">

        {/* ===== Top Bar ===== */}
        <header className="flex items-center justify-between pt-6 pb-4 animate-fade-up">
          <div className="flex items-center gap-3">
            <button
                onClick={onBack}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white shadow-sm border border-slate-100 hover:bg-slate-50'
                }`}
            >
                <ChevronLeftIcon className={`w-5 h-5 rotate-180 ${isDark ? 'text-white/70' : 'text-slate-600'}`} />
            </button>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              isPeriod
                ? (isDark ? 'bg-rose-500/15' : 'bg-rose-100')
                : (isDark ? 'bg-emerald-500/15' : 'bg-emerald-100')
            }`}>
              <LanternIcon className={`w-4.5 h-4.5 ${isPeriod ? 'text-rose-400' : 'text-emerald-500'}`} />
            </div>
            <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              متتبع الطهارة
            </h1>
          </div>
          <button
            onClick={toggleTheme}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
              isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'
            }`}
          >
            {isDark
              ? <SunIcon className="w-4 h-4 text-amber-400" />
              : <MoonIcon className="w-4 h-4 text-indigo-400" />
            }
          </button>
        </header>

        {/* ===== Hero Status Card ===== */}
        <div className="animate-fade-up delay-100">
          <div className={`relative rounded-[2rem] p-8 mt-2 overflow-hidden transition-all duration-700 ${
            isDark
              ? 'bg-white/[0.04] border border-white/[0.06]'
              : 'bg-white border border-slate-100 shadow-lg shadow-slate-200/50'
          }`}>
            {/* Card inner glow */}
            <div className={`absolute inset-0 opacity-30 transition-all duration-[2000ms] ${
              isPeriod
                ? 'bg-gradient-to-br from-rose-500/10 via-transparent to-pink-500/5'
                : 'bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/5'
            }`} />

            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Status Icon with rings */}
              <div className="relative mb-6">
                {/* Pulse rings */}
                <div className={`absolute inset-0 rounded-full animate-pulse-ring ${
                  isPeriod ? 'bg-rose-400/20' : 'bg-emerald-400/20'
                }`} style={{ margin: '-12px' }} />
                <div className={`absolute inset-0 rounded-full animate-pulse-ring ${
                  isPeriod ? 'bg-rose-400/10' : 'bg-emerald-400/10'
                }`} style={{ margin: '-24px', animationDelay: '1s' }} />

                <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center animate-float-slow transition-all duration-700 ${
                  isPeriod
                    ? 'bg-gradient-to-br from-rose-400 to-pink-500 shadow-xl shadow-rose-500/30'
                    : 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-xl shadow-emerald-500/30'
                }`}>
                  {isPeriod
                    ? <DropletIcon className="w-10 h-10 text-white" />
                    : currentStatus === 'none'
                      ? <HeartIcon className="w-10 h-10 text-white" />
                      : <SparkleIcon className="w-10 h-10 text-white" />
                  }
                </div>
              </div>

              {/* Status Text */}
              <h2 className={`text-2xl font-bold font-amiri mb-1.5 transition-colors ${
                isDark ? 'text-white' : 'text-slate-800'
              }`}>
                {isPeriod ? 'فترة العذر الشرعي' : currentStatus === 'none' ? 'ابدئي المتابعة' : 'حالة الطهارة'}
              </h2>
              <p className={`text-xs mb-6 ${
                isDark ? 'text-white/40' : 'text-slate-400'
              }`}>
                {isPeriod ? 'إجازة من الطاعات الظاهرة' : currentStatus === 'none' ? 'سجّلي أول دورة لبدء التتبع' : 'وقت السجود والمناجاة'}
              </p>

              {/* Day Counter */}
              {currentStatus !== 'none' && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-xs font-semibold ${
                  isPeriod
                    ? (isDark ? 'bg-rose-500/10 text-rose-300' : 'bg-rose-50 text-rose-500')
                    : (isDark ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-600')
                }`}>
                  <ClockIcon className="w-3.5 h-3.5" />
                  <span>اليوم {dayCount + 1}</span>
                  {isPeriod && <span className="opacity-50">من {data.periodLength}</span>}
                </div>
              )}

              {/* Action Button */}
              {currentStatus !== 'period' ? (
                <button
                  onClick={() => setShowConfirm('start')}
                  className={`w-full max-w-xs py-4 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.97] flex items-center justify-center gap-3 ${
                    'bg-gradient-to-r from-rose-500 to-pink-500 shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40'
                  }`}
                >
                  <DropletIcon className="w-4.5 h-4.5" />
                  <span>بداية الدورة</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirm('end')}
                  className={`w-full max-w-xs py-4 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.97] flex items-center justify-center gap-3 ${
                    'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40'
                  }`}
                >
                  <CheckIcon className="w-4.5 h-4.5" />
                  <span>تم الطُهر والاغتسال</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ===== Stats Row ===== */}
        <div className="grid grid-cols-3 gap-3 mt-5 animate-fade-up delay-200">
          {/* Last period */}
          <div className={`rounded-2xl p-4 text-center transition-all ${
            isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-white border border-slate-100 shadow-sm'
          }`}>
            <CalendarIcon className={`w-4 h-4 mx-auto mb-2 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
            <p className={`text-[10px] font-semibold mb-1 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>آخر دورة</p>
            <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {data.lastPeriodStart ? formatRelativeDay(data.lastPeriodStart) : '—'}
            </p>
          </div>

          {/* Cycle length */}
          <div className={`rounded-2xl p-4 text-center transition-all ${
            isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-white border border-slate-100 shadow-sm'
          }`}>
            <ClockIcon className={`w-4 h-4 mx-auto mb-2 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
            <p className={`text-[10px] font-semibold mb-1 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>طول الدورة</p>
            <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {data.cycleLength} يوماً
            </p>
          </div>

          {/* Next estimate */}
          <div className={`rounded-2xl p-4 text-center transition-all ${
            isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-white border border-slate-100 shadow-sm'
          }`}>
            <SparkleIcon className={`w-4 h-4 mx-auto mb-2 ${isDark ? 'text-rose-400' : 'text-rose-500'}`} />
            <p className={`text-[10px] font-semibold mb-1 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>القادمة</p>
            <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {nextPeriodEstimate ? `${nextPeriodEstimate} يوم` : '—'}
            </p>
          </div>
        </div>

        {/* ===== Fiqh Reminder Banner ===== */}
        <div className="mt-5 animate-fade-up delay-300">
          <div className={`rounded-2xl p-5 flex gap-4 items-start transition-all ${
            isDark ? 'bg-amber-500/[0.05] border border-amber-500/10' : 'bg-amber-50/80 border border-amber-100'
          }`}>
            <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${
              isDark ? 'bg-amber-500/15' : 'bg-amber-100'
            }`}>
              <LanternIcon className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`text-xs font-bold mb-1.5 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                تذكير شرعي
              </h4>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-amber-200/50' : 'text-amber-700/60'}`}>
                {isPeriod
                  ? 'لا تجب الصلاة ولا الصوم في هذه الفترة. يجب قضاء الصوم لاحقاً، وتبقى الأذكار والدعاء مستحبة.'
                  : 'عند رؤية علامات الطهر يجب الاغتسال فوراً لأداء الصلاة في وقتها.'}
              </p>
            </div>
          </div>
        </div>

        {/* ===== Fiqh Rules Section ===== */}
        <div className="mt-8 animate-fade-up delay-400">
          <div className="flex items-center gap-2 mb-4">
            <BookOpenIcon className={`w-4 h-4 ${isDark ? 'text-white/30' : 'text-slate-400'}`} />
            <h3 className={`text-sm font-bold ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
              أحكام مختصرة
            </h3>
          </div>

          <div className="space-y-3">
            {/* During period */}
            <div className={`rounded-2xl overflow-hidden transition-all ${
              isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-white border border-slate-100 shadow-sm'
            }`}>
              <div className="flex">
                <div className={`w-1 flex-shrink-0 ${isDark ? 'bg-rose-500/60' : 'bg-rose-400'}`} />
                <div className="p-4 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <DropletIcon className="w-3.5 h-3.5 text-rose-400" />
                    <h5 className="text-[11px] font-bold text-rose-400">أثناء الدورة</h5>
                  </div>
                  <p className={`text-[11px] leading-[1.8] ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                    تترك الحائض الصلاة والصوم، ولا تقضي الصلاة ولكن تقضي الصوم. يُستحب لها الإكثار من الأذكار والدعاء.
                  </p>
                </div>
              </div>
            </div>

            {/* Upon purity */}
            <div className={`rounded-2xl overflow-hidden transition-all ${
              isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-white border border-slate-100 shadow-sm'
            }`}>
              <div className="flex">
                <div className={`w-1 flex-shrink-0 ${isDark ? 'bg-emerald-500/60' : 'bg-emerald-400'}`} />
                <div className="p-4 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <SparkleIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <h5 className="text-[11px] font-bold text-emerald-400">عند الطهارة</h5>
                  </div>
                  <p className={`text-[11px] leading-[1.8] ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                    يجب الاغتسال فور رؤية الطهر. إذا طهرت قبل خروج وقت الصلاة وجب عليها أداؤها.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== History Section ===== */}
        {data.history.length > 0 && (
          <div className="mt-8 animate-fade-up delay-500">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-bold ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                السجل
              </h3>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`text-[11px] font-semibold transition-colors ${
                  isPeriod ? 'text-rose-400 hover:text-rose-300' : 'text-emerald-500 hover:text-emerald-400'
                }`}
              >
                {showHistory ? 'إخفاء' : `عرض الكل (${data.history.length})`}
              </button>
            </div>

            {/* Timeline */}
            <div className="space-y-0 relative">
              {/* Vertical timeline line */}
              <div className={`absolute top-3 bottom-3 right-[19px] w-px ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`} />

              {(showHistory ? data.history : data.history.slice(0, 4)).map((entry, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 py-3 relative animate-slide-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Timeline dot */}
                  <div className={`w-[10px] h-[10px] rounded-full mt-1 flex-shrink-0 z-10 ring-4 ${
                    entry.type === 'period'
                      ? (isDark ? 'bg-rose-400 ring-[#0c0f1a]' : 'bg-rose-400 ring-[#faf9f7]')
                      : (isDark ? 'bg-emerald-400 ring-[#0c0f1a]' : 'bg-emerald-400 ring-[#faf9f7]')
                  }`} />

                  {/* Content */}
                  <div className={`flex-1 rounded-xl p-3.5 transition-all ${
                    isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-white border border-slate-100 shadow-sm'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${
                          entry.type === 'period'
                            ? (isDark ? 'bg-rose-500/10' : 'bg-rose-50')
                            : (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50')
                        }`}>
                          {entry.type === 'period'
                            ? <DropletIcon className="w-3 h-3 text-rose-400" />
                            : <CheckIcon className="w-3 h-3 text-emerald-500" />
                          }
                        </div>
                        <span className={`text-xs font-bold ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                          {entry.type === 'period' ? 'بداية الدورة' : 'تم الاغتسال'}
                        </span>
                      </div>
                      <span className={`text-[10px] ${isDark ? 'text-white/25' : 'text-slate-300'}`}>
                        {formatRelativeDay(entry.date)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Clear history */}
            {showHistory && data.history.length > 0 && (
              <button
                onClick={clearHistory}
                className={`mt-4 w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  isDark
                    ? 'bg-red-500/5 text-red-400/60 border border-red-500/10 hover:bg-red-500/10'
                    : 'bg-red-50 text-red-400 border border-red-100 hover:bg-red-100'
                }`}
              >
                <TrashIcon className="w-3.5 h-3.5" />
                مسح السجل بالكامل
              </button>
            )}
          </div>
        )}

        {/* ===== Settings Section ===== */}
        <div className="mt-8 animate-fade-up delay-600">
          <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
            الإعدادات
          </h3>
          <div className={`rounded-2xl overflow-hidden transition-all ${
            isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-white border border-slate-100 shadow-sm'
          }`}>
            {/* Cycle length */}
            <div className={`p-4 flex items-center justify-between ${isDark ? 'border-b border-white/[0.05]' : 'border-b border-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                  <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <span className={`text-xs font-semibold ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                  طول الدورة الشهرية
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setData(p => ({ ...p, cycleLength: Math.max(20, p.cycleLength - 1) }))}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-all active:scale-90 ${
                    isDark ? 'bg-white/5 text-white/50 hover:bg-white/10' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  −
                </button>
                <span className={`text-sm font-bold w-8 text-center ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {data.cycleLength}
                </span>
                <button
                  onClick={() => setData(p => ({ ...p, cycleLength: Math.min(40, p.cycleLength + 1) }))}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-all active:scale-90 ${
                    isDark ? 'bg-white/5 text-white/50 hover:bg-white/10' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  +
                </button>
              </div>
            </div>

            {/* Period length */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-rose-500/10' : 'bg-rose-50'}`}>
                  <DropletIcon className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <span className={`text-xs font-semibold ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                  مدة الدورة المعتادة
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setData(p => ({ ...p, periodLength: Math.max(3, p.periodLength - 1) }))}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-all active:scale-90 ${
                    isDark ? 'bg-white/5 text-white/50 hover:bg-white/10' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  −
                </button>
                <span className={`text-sm font-bold w-8 text-center ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {data.periodLength}
                </span>
                <button
                  onClick={() => setData(p => ({ ...p, periodLength: Math.min(15, p.periodLength + 1) }))}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-all active:scale-90 ${
                    isDark ? 'bg-white/5 text-white/50 hover:bg-white/10' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Footer ===== */}
        <div className="mt-12 text-center pb-8">
          <p className={`text-[10px] ${isDark ? 'text-white/15' : 'text-slate-300'}`}>
            خاص وآمن · لا يُرسل أي بيانات
          </p>
        </div>
      </div>

      {/* ===== Confirmation Modal ===== */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-5" onClick={() => setShowConfirm(null)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Sheet */}
          <div
            className={`relative w-full max-w-lg rounded-3xl p-6 animate-slide-up ${
              isDark ? 'bg-[#151929] border border-white/[0.08]' : 'bg-white'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${
                showConfirm === 'start'
                  ? 'bg-gradient-to-br from-rose-400 to-pink-500 shadow-lg shadow-rose-500/20'
                  : 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/20'
              }`}>
                {showConfirm === 'start'
                  ? <DropletIcon className="w-8 h-8 text-white" />
                  : <CheckIcon className="w-8 h-8 text-white" />
                }
              </div>

              <h3 className={`text-lg font-bold font-amiri mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {showConfirm === 'start' ? 'تأكيد بداية الدورة' : 'تأكيد الطهارة والاغتسال'}
              </h3>
              <p className={`text-xs mb-6 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                {showConfirm === 'start'
                  ? 'سيتم تسجيل اليوم كبداية فترة جديدة'
                  : 'سيتم تسجيل انتهاء الفترة والعودة لحالة الطهارة'
                }
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowConfirm(null)}
                  className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.97] ${
                    isDark ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  إلغاء
                </button>
                <button
                  onClick={showConfirm === 'start' ? handleStartPeriod : handleEndPeriod}
                  className={`flex-1 py-3.5 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.97] ${
                    showConfirm === 'start'
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 shadow-lg shadow-rose-500/25'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25'
                  }`}
                >
                  تأكيد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
