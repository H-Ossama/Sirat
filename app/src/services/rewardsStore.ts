import { getDailyChallengeId, getDeedById, type Deed } from '../data/challengeData';
import { logInteraction } from './activityLogStore';

export interface Badge {
    id: string;
    nameAr: string;
    descriptionAr: string;
    unlockConditionAr: string;
    iconName: string; // SVG icon component name
    gradient: string; // tailwind gradient classes
    unlocked: boolean;
}

export interface RewardsState {
    totalXP: number;
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string; // YYYY-MM-DD
    unlockedBadgeIds: string[];
    completedDeedIds: number[];
    completedChallengeDate: string; // YYYY-MM-DD
    userName: string;
    userGender?: 'male' | 'female';
}

const STORAGE_KEY = 'rewards_state_v3';

function getTodayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDefaultState(): RewardsState {
    const savedGender = localStorage.getItem('user_gender') as 'male' | 'female' | null;
    return {
        totalXP: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: '',
        unlockedBadgeIds: [],
        completedDeedIds: [],
        completedChallengeDate: '',
        userName: savedGender === 'female' ? 'أختي المسلمة' : 'أخي المسلم',
        userGender: savedGender || 'male',
    };
}

export function getRewardsState(): RewardsState {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const state: RewardsState = { ...getDefaultState(), ...JSON.parse(saved) };
            const today = getTodayStr();
            if (state.lastActiveDate !== today) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
                if (state.lastActiveDate !== yesterdayStr && state.lastActiveDate !== '') {
                    state.currentStreak = 0;
                }
            }
            return state;
        }
    } catch { /* ignore */ }
    return getDefaultState();
}

function saveState(state: RewardsState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function saveUserName(name: string): void {
    const state = getRewardsState();
    state.userName = name;
    saveState(state);
}

export function saveUserGender(gender: 'male' | 'female'): void {
    const state = getRewardsState();
    state.userGender = gender;
    // Also update default name if it hasn't been changed from default
    const genderName = gender === 'female' ? 'أختي المسلمة' : 'أخي المسلم';
    const otherGenderName = gender === 'female' ? 'أخي المسلم' : 'أختي المسلمة';
    if (state.userName === otherGenderName || state.userName === 'أخي المسلم' || state.userName === 'أختي المسلمة') {
        state.userName = genderName;
    }
    saveState(state);
    localStorage.setItem('user_gender', gender);
}

export function getDailyChallenge(): Deed | undefined {
    return getDeedById(getDailyChallengeId());
}

export function isChallengeCompletedToday(): boolean {
    const state = getRewardsState();
    return state.completedChallengeDate === getTodayStr();
}

export function completeDeed(deedId: number, xp: number): { newBadges: Badge[]; newStreak: number; totalXP: number } {
    const state = getRewardsState();
    const today = getTodayStr();

    state.totalXP += xp;

    if (!state.completedDeedIds.includes(deedId)) {
        state.completedDeedIds.push(deedId);
    }

    const challengeId = getDailyChallengeId();
    if (deedId === challengeId) {
        state.completedChallengeDate = today;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    if (state.lastActiveDate === today) {
        // already active today
    } else if (state.lastActiveDate === yesterdayStr || state.lastActiveDate === '') {
        state.currentStreak += 1;
        if (state.currentStreak > state.longestStreak) {
            state.longestStreak = state.currentStreak;
        }
    } else {
        state.currentStreak = 1;
    }
    state.lastActiveDate = today;

    const previousBadgeIds = [...state.unlockedBadgeIds];
    const allBadges = getAllBadges(state);
    const newlyUnlocked = allBadges.filter(b => b.unlocked && !previousBadgeIds.includes(b.id));
    newlyUnlocked.forEach(b => {
        if (!state.unlockedBadgeIds.includes(b.id)) {
            state.unlockedBadgeIds.push(b.id);
        }
    });

    saveState(state);

    const deed = getDeedById(deedId);
    logInteraction({
        type: 'deed_completed',
        category: 'deed',
        title: 'إكمال عمل صالح',
        details: deed ? `تم إكمال: ${deed.text}` : `تم إكمال عمل رقم ${deedId}`,
        meta: {
            deedId,
            xp,
            totalXP: state.totalXP,
        },
    });

    return {
        newBadges: newlyUnlocked,
        newStreak: state.currentStreak,
        totalXP: state.totalXP,
    };
}

export function resetDailyDeeds(): void {
    const state = getRewardsState();
    const today = getTodayStr();
    if (state.lastActiveDate !== today) {
        state.completedDeedIds = [];
        saveState(state);
    }
}

const BADGE_DEFINITIONS: Omit<Badge, 'unlocked'>[] = [
    {
        id: 'first_challenge',
        nameAr: 'البداية الطيبة',
        descriptionAr: 'أكملت أول تحدي يومي لك — كل رحلة تبدأ بخطوة',
        unlockConditionAr: 'أكمل أول تحدي يومي',
        iconName: 'SunriseIcon',
        gradient: 'from-sky-400 to-blue-500',
    },
    {
        id: 'streak_3',
        nameAr: 'المواظب',
        descriptionAr: 'واظبت على الأعمال الصالحة 3 أيام متتالية',
        unlockConditionAr: 'أكمل 3 أيام متتالية',
        iconName: 'FlameIcon',
        gradient: 'from-orange-400 to-red-500',
    },
    {
        id: 'streak_7',
        nameAr: 'المثابر',
        descriptionAr: 'أسبوع كامل من المثابرة والمداومة على الخير',
        unlockConditionAr: 'أكمل 7 أيام متتالية',
        iconName: 'ShieldIcon',
        gradient: 'from-amber-400 to-orange-500',
    },
    {
        id: 'streak_30',
        nameAr: 'الراسخ',
        descriptionAr: 'ثلاثون يوماً من الثبات والرسوخ في العبادة',
        unlockConditionAr: 'أكمل 30 يوماً متتالياً',
        iconName: 'CrownIcon',
        gradient: 'from-yellow-400 to-amber-500',
    },
    {
        id: 'xp_100',
        nameAr: 'الناشئ',
        descriptionAr: 'بدأت رحلتك نحو الله بخطوات ثابتة',
        unlockConditionAr: 'اجمع 100 نقطة',
        iconName: 'LeafIcon',
        gradient: 'from-green-400 to-emerald-500',
    },
    {
        id: 'xp_500',
        nameAr: 'السالك',
        descriptionAr: 'سلكت طريق الخير وأنت ثابت على الدرب',
        unlockConditionAr: 'اجمع 500 نقطة',
        iconName: 'MedalIcon',
        gradient: 'from-teal-400 to-cyan-500',
    },
    {
        id: 'xp_1000',
        nameAr: 'العابد',
        descriptionAr: 'ألف نقطة من الأعمال الصالحة تشهد لك',
        unlockConditionAr: 'اجمع 1000 نقطة',
        iconName: 'RibbonIcon',
        gradient: 'from-blue-400 to-indigo-500',
    },
    {
        id: 'xp_3000',
        nameAr: 'الزاهد',
        descriptionAr: 'زهدت في الدنيا وأقبلت على الآخرة',
        unlockConditionAr: 'اجمع 3000 نقطة',
        iconName: 'DiamondIcon',
        gradient: 'from-indigo-400 to-purple-500',
    },
    {
        id: 'category_quran',
        nameAr: 'حامل القرآن',
        descriptionAr: 'أكملت 10 تحديات من تحديات القرآن الكريم',
        unlockConditionAr: 'أكمل 10 تحديات قرآنية',
        iconName: 'ScrollIcon',
        gradient: 'from-emerald-400 to-green-600',
    },
    {
        id: 'perfect_day',
        nameAr: 'اليوم المثالي',
        descriptionAr: 'أكملت 5 أعمال صالحة في يوم واحد',
        unlockConditionAr: 'أكمل 5 أعمال في يوم واحد',
        iconName: 'SparkleIcon',
        gradient: 'from-violet-400 to-purple-600',
    },
    {
        id: 'category_prayer',
        nameAr: 'المحافظ على الصلاة',
        descriptionAr: 'أكملت 10 تحديات من تحديات الصلاة',
        unlockConditionAr: 'أكمل 10 تحديات صلاة',
        iconName: 'AwardIcon',
        gradient: 'from-gold-400 to-yellow-500',
    },
];

export function getAllBadges(state?: RewardsState): Badge[] {
    const s = state ?? getRewardsState();

    return BADGE_DEFINITIONS.map(def => {
        let unlocked = s.unlockedBadgeIds.includes(def.id);

        if (!unlocked) {
            switch (def.id) {
                case 'first_challenge': unlocked = s.completedChallengeDate !== ''; break;
                case 'streak_3': unlocked = s.currentStreak >= 3; break;
                case 'streak_7': unlocked = s.currentStreak >= 7; break;
                case 'streak_30': unlocked = s.currentStreak >= 30; break;
                case 'xp_100': unlocked = s.totalXP >= 100; break;
                case 'xp_500': unlocked = s.totalXP >= 500; break;
                case 'xp_1000': unlocked = s.totalXP >= 1000; break;
                case 'xp_3000': unlocked = s.totalXP >= 3000; break;
                case 'perfect_day': unlocked = s.completedDeedIds.length >= 5; break;
            }
        }

        return { ...def, unlocked };
    });
}
