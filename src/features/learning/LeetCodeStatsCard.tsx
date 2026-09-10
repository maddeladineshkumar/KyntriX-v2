import React, { useState, useMemo } from 'react';
import {
  Check,
  Info,
  RefreshCw,
  Lock,
  Award,
  ChevronDown,
  ChevronUp,
  Flame,
  Zap,
  Target,
  Layers,
  Activity,
  Cpu,
  Crown,
  Sliders,
  Table,
  Crosshair,
} from 'lucide-react';
import type { UserProfile } from '../../server/db/types';

export interface LeetCodeStatsCardProps {
  profile?: UserProfile | null;
  analyticsData?: any;
  badges?: any[];
  allProblems?: any[];
  className?: string;
  defaultMode?: 'live' | 'reference';
}

interface CalendarDay {
  date: string;
  dayOfMonth: number;
  monthName: string;
  year: number;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  problemsDone: number;
  isActive: boolean;
}

interface MonthBlock {
  name: string;
  year: number;
  weeks: Array<Array<CalendarDay | null>>;
}

export const LeetCodeStatsCard: React.FC<LeetCodeStatsCardProps> = ({
  profile,
  analyticsData,
  badges = [],
  allProblems = [],
  className = '',
  defaultMode = 'live',
}) => {
  // Mode toggle: 'live' (synced with actual Arena & Badges) by default, or 'reference' (exact screenshot)
  const [viewMode, setViewMode] = useState<'live' | 'reference'>(defaultMode);
  const [showLockedModal, setShowLockedModal] = useState<boolean>(false);
  const [hoveredDay, setHoveredDay] = useState<{
    day: CalendarDay;
    x: number;
    y: number;
  } | null>(null);

  // 1. Reference stats from the uploaded screenshot
  const refStats = useMemo(() => ({
    totalSolved: 6,
    totalProblems: 4047,
    attempting: 0,
    easy: { solved: 6, total: 963 },
    med: { solved: 0, total: 2111 },
    hard: { solved: 0, total: 973 },
    badgeCount: 0,
    totalBadges: 10,
    nextBadge: {
      id: 'sep_challenge',
      name: 'Sep LeetCoding Challenge',
      description: 'Daily consistency challenge for the month of September.',
      rarity: 'rare',
      criteriaDescription: 'Solve at least 1 problem every day in September',
      progress: 3,
      target: 30,
      percentage: 10,
    },
    lockedBadges: [] as any[],
    totalProblemsInYear: 19,
    totalActiveDays: 3,
    maxStreak: 2,
    todayDone: true,
    todayCount: 1,
  }), []);

  // 2. Live Arena Synced Stats
  const liveStats = useMemo(() => {
    // Problem catalogs from store / props or analytics
    const problems = allProblems.length > 0 ? allProblems : (analyticsData?.allProblems || []);
    
    // Categorize problems by difficulty
    const easyProblems = problems.filter((p: any) => p.difficulty === 'beginner');
    const medProblems = problems.filter(
      (p: any) => p.difficulty === 'intermediate' || p.difficulty === 'advanced'
    );
    const hardProblems = problems.filter(
      (p: any) => p.difficulty === 'expert' || p.difficulty === 'research'
    );

    const totalProblems = problems.length || 256;
    const easyTotal = easyProblems.length || 78;
    const medTotal = medProblems.length || 132;
    const hardTotal = hardProblems.length || 46;

    // Determine solved counts per tier
    let easySolved = 0;
    let medSolved = 0;
    let hardSolved = 0;

    if (analyticsData?.difficultyBreakdown) {
      easySolved = analyticsData.difficultyBreakdown.easy?.solved ?? 0;
      medSolved = analyticsData.difficultyBreakdown.med?.solved ?? 0;
      hardSolved = analyticsData.difficultyBreakdown.hard?.solved ?? 0;
    } else if (profile?.stats?.categoryStats) {
      // Approximate from category stats if difficulty breakdown is computing
      const catStats = profile.stats.categoryStats;
      const totalSolved = profile.stats.problemsSolved || 0;
      // Beginner problems are heavily in DH & Transforms
      easySolved = Math.min(easyTotal, (catStats.dh?.solved || 0) + (catStats.transforms?.solved || 0));
      medSolved = Math.min(medTotal, Math.max(0, totalSolved - easySolved));
      hardSolved = Math.max(0, totalSolved - easySolved - medSolved);
    } else {
      easySolved = Math.min(easyTotal, profile?.stats?.problemsSolved || 0);
    }

    const totalSolved = profile?.stats?.problemsSolved ?? (easySolved + medSolved + hardSolved);
    const totalAttempts = profile?.stats?.totalAttempts ?? 0;
    const attempting = analyticsData?.difficultyBreakdown?.attempting ??
      Math.max(0, totalAttempts - totalSolved);

    // Badges calculation
    const allBadgesList = analyticsData?.badges || badges || [];
    const unlockedBadges = allBadgesList.filter((b: any) => b.unlocked);
    const lockedBadges = allBadgesList.filter((b: any) => !b.unlocked);

    // Determine the next badge the user is closest to getting
    let nextBadge = analyticsData?.nextBadge;
    if (!nextBadge && lockedBadges.length > 0) {
      // Compute fallback progress towards locked badges
      const getProgress = (badge: any) => {
        switch (badge.id) {
          case 'streak_master':
            return { progress: profile?.streak?.currentStreak || 0, target: 7 };
          case 'dh_apprentice':
            return { progress: profile?.stats?.categoryStats?.dh?.solved || 0, target: 5 };
          case 'dh_master':
            return { progress: profile?.stats?.categoryStats?.dh?.solved || 0, target: 25 };
          case 'matrix_master':
            return { progress: profile?.stats?.categoryStats?.transforms?.solved || 0, target: 15 };
          case 'fk_specialist':
            return { progress: profile?.stats?.categoryStats?.fk?.solved || 0, target: 10 };
          case 'ik_specialist':
            return { progress: profile?.stats?.categoryStats?.ik?.solved || 0, target: 10 };
          case 'jacobian_explorer':
            return { progress: profile?.stats?.categoryStats?.jacobians?.solved || 0, target: 5 };
          case 'zero_hint':
            return { progress: profile?.stats?.correctFirstAttempt || 0, target: 10 };
          case 'six_dof':
            return { progress: profile?.stats?.challengesCompleted || 0, target: 5 };
          case 'kyntrix_master':
            return { progress: profile?.xp || 0, target: 2000 };
          default:
            return { progress: 0, target: 1 };
        }
      };

      const withProgress = lockedBadges.map((b: any) => {
        const { progress, target } = getProgress(b);
        const percentage = Math.min(100, Math.round((progress / target) * 100));
        return { ...b, progress, target, percentage };
      });
      withProgress.sort((a: any, b: any) => b.percentage - a.percentage);
      nextBadge = withProgress[0];
    }

    // Daily Problem Activity & Streak
    const dailyActivity = analyticsData?.dailyProblemActivity || {};
    const now = new Date();
    const todayUtc = now.toISOString().slice(0, 10);
    const localYear = now.getFullYear();
    const localMonth = String(now.getMonth() + 1).padStart(2, '0');
    const localDay = String(now.getDate()).padStart(2, '0');
    const todayLocal = `${localYear}-${localMonth}-${localDay}`;

    const todayCount =
      (dailyActivity[todayUtc]?.total || dailyActivity[todayUtc]?.solved || 0) ||
      (dailyActivity[todayLocal]?.total || dailyActivity[todayLocal]?.solved || 0);

    const currentStreak = profile?.streak?.currentStreak ?? 0;
    const longestStreak = profile?.streak?.longestStreak ?? currentStreak;

    // A daily problem was completed TODAY if todayCount > 0 or lastActivityDate is today
    const lastActivity = profile?.streak?.lastActivityDate;
    const todayDone =
      todayCount > 0 ||
      lastActivity === todayUtc ||
      lastActivity === todayLocal;

    // Calculate total active days and total problems in the past year
    const activeDates = Object.keys(dailyActivity).filter(
      (d) => (dailyActivity[d]?.total || dailyActivity[d]?.solved || 0) > 0
    );
    const totalActiveDays = Math.max(activeDates.length, currentStreak);
    let totalProblemsInYear = 0;
    Object.values(dailyActivity).forEach((val: any) => {
      totalProblemsInYear += (val.solved || val.total || 0);
    });
    if (totalProblemsInYear === 0 && totalSolved > 0) {
      totalProblemsInYear = totalSolved;
    }

    return {
      totalSolved,
      totalProblems,
      attempting,
      easy: { solved: easySolved, total: easyTotal },
      med: { solved: medSolved, total: medTotal },
      hard: { solved: hardSolved, total: hardTotal },
      badgeCount: unlockedBadges.length,
      totalBadges: allBadgesList.length || 10,
      nextBadge: nextBadge || {
        id: 'streak_master',
        name: 'Relentless Scholar',
        description: 'Maintain an unbroken 7-day meaningful learning streak in KyntriX.',
        rarity: 'rare',
        criteriaDescription: 'Maintain 7-day learning streak (1 problem/day)',
        progress: currentStreak,
        target: 7,
        percentage: Math.min(100, Math.round((currentStreak / 7) * 100)),
      },
      lockedBadges: analyticsData?.lockedBadges || lockedBadges,
      totalProblemsInYear,
      totalActiveDays: totalActiveDays || (currentStreak > 0 ? currentStreak : 1),
      maxStreak: longestStreak || currentStreak,
      todayDone,
      todayCount,
    };
  }, [allProblems, analyticsData, badges, profile]);

  const activeStats = viewMode === 'reference' ? refStats : liveStats;

  // Build the 12 calendar month blocks (Sep through Aug)
  const calendarMonths = useMemo<MonthBlock[]>(() => {
    const monthNames = [
      'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb',
      'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'
    ];
    const now = new Date();
    const currentYear = now.getFullYear();
    const startYear = now.getMonth() >= 8 ? currentYear : currentYear - 1;
    const todayMs = now.getTime();

    // Reference mode active days (matches the screenshot's 3 green squares)
    const refActiveDays: Record<string, number> = {
      '2026-08-28': 5,
      '2026-08-29': 6,
      '2026-08-31': 8,
    };

    const dailyActivityMap = analyticsData?.dailyProblemActivity || {};

    const blocks: MonthBlock[] = [];

    monthNames.forEach((name, mIdx) => {
      const monthNum = (mIdx + 8) % 12; // Sep is 8 (0-indexed)
      const year = mIdx < 4 ? startYear : startYear + 1;

      const daysInMonth = new Date(year, monthNum + 1, 0).getDate();
      const firstDayDow = new Date(year, monthNum, 1).getDay();

      const days: CalendarDay[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dow = (firstDayDow + d - 1) % 7;
        const dateStr = `${year}-${String(monthNum + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        let problemsDone = 0;
        if (viewMode === 'reference') {
          problemsDone = refActiveDays[dateStr] || 0;
        } else {
          if (dailyActivityMap[dateStr]) {
            problemsDone = dailyActivityMap[dateStr].solved || dailyActivityMap[dateStr].total || 0;
          } else {
            // Check if within current active streak
            const thisDateMs = new Date(dateStr).getTime();
            const diffDays = Math.floor((todayMs - thisDateMs) / (24 * 3600 * 1000));
            const streak = profile?.streak?.currentStreak || 0;
            if (diffDays === 0) {
              if (liveStats.todayDone) {
                problemsDone = Math.max(1, liveStats.todayCount);
              }
            } else if (diffDays > 0 && diffDays < streak) {
              problemsDone = 1; // Prior days covered by current unbroken streak
            }
          }
        }

        days.push({
          date: dateStr,
          dayOfMonth: d,
          monthName: name,
          year,
          dayOfWeek: dow,
          problemsDone,
          isActive: problemsDone > 0,
        });
      }

      // Group days into 7-row columns (Sunday = 0 to Saturday = 6)
      const weeks: Array<Array<CalendarDay | null>> = [];
      let currentWeek: Array<CalendarDay | null> = new Array(7).fill(null);

      days.forEach((day) => {
        currentWeek[day.dayOfWeek] = day;
        if (day.dayOfWeek === 6 || day.dayOfMonth === daysInMonth) {
          weeks.push([...currentWeek]);
          currentWeek = new Array(7).fill(null);
        }
      });

      blocks.push({
        name,
        year,
        weeks,
      });
    });

    return blocks;
  }, [viewMode, analyticsData, profile, liveStats.todayDone, liveStats.todayCount]);

  // SVG circular arc helper
  const describeArc = (
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number
  ) => {
    const rad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(startAngle));
    const y1 = cy + r * Math.sin(rad(startAngle));
    const x2 = cx + r * Math.cos(rad(endAngle));
    const y2 = cy + r * Math.sin(rad(endAngle));
    let diff = endAngle - startAngle;
    if (diff < 0) diff += 360;
    const largeArc = diff > 180 ? 1 : 0;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };

  const bgTrackPath = describeArc(90, 85, 64, 140, 40);

  // Proportional arc lengths for Easy (140->226), Medium (228->312), Hard (314->40)
  const easyAngle = activeStats.easy.solved > 0
    ? Math.min(86, Math.max(14, (activeStats.easy.solved / Math.max(1, activeStats.easy.total)) * 86))
    : 0;
  const easyArcPath = describeArc(90, 85, 64, 140, 140 + easyAngle);

  const medAngle = activeStats.med.solved > 0
    ? Math.min(84, Math.max(14, (activeStats.med.solved / Math.max(1, activeStats.med.total)) * 84))
    : 0;
  const medArcPath = describeArc(90, 85, 64, 228, 228 + medAngle);

  const hardAngle = activeStats.hard.solved > 0
    ? Math.min(86, Math.max(14, (activeStats.hard.solved / Math.max(1, activeStats.hard.total)) * 86))
    : 0;
  const hardArcPath = describeArc(90, 85, 64, 314, 314 + hardAngle);

  // Helper to render icon for badge
  const renderBadgeIcon = (iconName: string, classNameStr: string) => {
    switch (iconName?.toLowerCase()) {
      case 'table':
        return <Table className={classNameStr} />;
      case 'layers':
        return <Layers className={classNameStr} />;
      case 'sliders':
        return <Sliders className={classNameStr} />;
      case 'crosshair':
        return <Crosshair className={classNameStr} />;
      case 'activity':
        return <Activity className={classNameStr} />;
      case 'zap':
        return <Zap className={classNameStr} />;
      case 'cpu':
        return <Cpu className={classNameStr} />;
      case 'crown':
        return <Crown className={classNameStr} />;
      case 'flame':
        return <Flame className={classNameStr} />;
      default:
        return <Award className={classNameStr} />;
    }
  };

  return (
    <div
      className={`bg-[#1e1e1e] text-stone-200 rounded-3xl p-4 sm:p-6 border border-stone-800 shadow-2xl space-y-4 font-sans ${className}`}
    >
      {/* Top Header Bar with Sync Status & Mode Switch */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-stone-800/80">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-stone-200">
            Kinematics Arena Problem Solving & Consistency Profile
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-950/80 text-teal-300 font-mono border border-teal-800/60 hidden sm:inline-block">
            {activeStats.totalProblems} Arena Problems Synced
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#2a2a2a] p-1 rounded-xl border border-stone-700/60 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setViewMode('live')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'live'
                ? 'bg-stone-800 text-teal-400 shadow-xs border border-teal-500/30'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <RefreshCw className="w-3 h-3" />
            <span>Arena Synced</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('reference')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === 'reference'
                ? 'bg-stone-800 text-amber-400 shadow-xs border border-amber-500/30'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Exact Showcase
          </button>
        </div>
      </div>

      {/* Top Row: 2 Cards (Solved Breakdown & Badges) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Solved Problems Arc & Difficulty Breakdown */}
        <div className="bg-[#282828] rounded-2xl p-5 sm:p-6 border border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Left: Circular Arc Gauge */}
          <div className="relative flex flex-col items-center shrink-0">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg
                viewBox="0 0 180 180"
                className="w-full h-full transform -rotate-2"
                aria-label="Solved problems gauge"
              >
                {/* Background Track */}
                <path
                  d={bgTrackPath}
                  fill="none"
                  stroke="#383838"
                  strokeWidth="6"
                  strokeLinecap="round"
                />

                {/* Easy Segment (Teal) */}
                {activeStats.easy.solved > 0 && (
                  <path
                    d={easyArcPath}
                    fill="none"
                    stroke="#00b8a3"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                )}

                {/* Medium Segment (Warm Amber) */}
                {activeStats.med.solved > 0 && (
                  <path
                    d={medArcPath}
                    fill="none"
                    stroke="#ffb800"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                )}

                {/* Hard Segment (Coral Red) */}
                {activeStats.hard.solved > 0 && (
                  <path
                    d={hardArcPath}
                    fill="none"
                    stroke="#ef4743"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                )}
              </svg>

              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-1 select-none pointer-events-none">
                <div className="flex items-baseline leading-none">
                  <span className="text-3xl font-bold text-white tracking-tight">
                    {activeStats.totalSolved}
                  </span>
                  <span className="text-xs font-semibold text-stone-400 ml-0.5">
                    /{activeStats.totalProblems}
                  </span>
                </div>

                <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-stone-200">
                  <Check className="w-3.5 h-3.5 text-[#00b8a3] stroke-[3]" />
                  <span>Solved</span>
                </div>
              </div>
            </div>

            {/* Bottom Opening: Attempting */}
            <div className="flex items-center justify-center gap-1.5 -mt-3 text-xs text-stone-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#00b8a3] inline-block shadow-xs shadow-[#00b8a3]/50" />
              <span>{activeStats.attempting} Attempting</span>
            </div>
          </div>

          {/* Right: 3 Difficulty Pills */}
          <div className="flex flex-col justify-center gap-2.5 w-full sm:w-36 shrink-0">
            {/* Easy Pill */}
            <div className="bg-[#333333] hover:bg-[#383838] transition-colors rounded-xl py-2.5 px-4 border border-white/5 text-center flex sm:flex-col justify-between items-center">
              <span className="text-xs font-semibold text-[#00b8a3]">Easy</span>
              <span className="text-sm font-semibold text-stone-100 tabular-nums">
                {activeStats.easy.solved}/{activeStats.easy.total}
              </span>
            </div>

            {/* Medium Pill */}
            <div className="bg-[#333333] hover:bg-[#383838] transition-colors rounded-xl py-2.5 px-4 border border-white/5 text-center flex sm:flex-col justify-between items-center">
              <span className="text-xs font-semibold text-[#ffb800]">Med.</span>
              <span className="text-sm font-semibold text-stone-100 tabular-nums">
                {activeStats.med.solved}/{activeStats.med.total}
              </span>
            </div>

            {/* Hard Pill */}
            <div className="bg-[#333333] hover:bg-[#383838] transition-colors rounded-xl py-2.5 px-4 border border-white/5 text-center flex sm:flex-col justify-between items-center">
              <span className="text-xs font-semibold text-[#ef4743]">Hard</span>
              <span className="text-sm font-semibold text-stone-100 tabular-nums">
                {activeStats.hard.solved}/{activeStats.hard.total}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Badges & Next Unlockable Badge */}
        <div className="bg-[#282828] rounded-2xl p-5 sm:p-6 border border-stone-800/80 flex flex-col justify-between">
          {/* Top Section: Badges Count + Hexagon Emblem */}
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-medium text-stone-400">Badges</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-bold text-white tabular-nums tracking-tight">
                  {activeStats.badgeCount}
                </span>
                <span className="text-xs text-stone-400 font-semibold">
                  / {activeStats.totalBadges} Unlocked
                </span>
              </div>
            </div>

            {/* Concentric Hexagon Badge Graphic */}
            <div className="relative w-20 h-20 shrink-0">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full drop-shadow-md select-none"
                aria-label="Locked monthly challenge badge"
              >
                {/* Outer Hexagon */}
                <polygon
                  points="50,8 86,29 86,71 50,92 14,71 14,29"
                  fill="#232323"
                  stroke="#3a3a3a"
                  strokeWidth="1.5"
                />
                {/* Middle Hexagon */}
                <polygon
                  points="50,15 80,32 80,68 50,85 20,68 20,32"
                  fill="#272727"
                  stroke="#333333"
                  strokeWidth="1.2"
                />
                {/* Inner Hexagon */}
                <polygon
                  points="50,22 74,36 74,64 50,78 26,64 26,36"
                  fill="#1f1f1f"
                  stroke="#404040"
                  strokeWidth="1"
                />

                {/* Badge Inscription */}
                <text
                  x="50"
                  y="52"
                  textAnchor="middle"
                  fill="#71717a"
                  fontSize="21"
                  fontWeight="900"
                  fontFamily="system-ui, sans-serif"
                >
                  {viewMode === 'reference' ? '9' : (activeStats.nextBadge?.name?.charAt(0) || 'K')}
                </text>

                <text
                  x="50"
                  y="65"
                  textAnchor="middle"
                  fill="#71717a"
                  fontSize="8.5"
                  fontWeight="800"
                  letterSpacing="0.8"
                  fontFamily="system-ui, sans-serif"
                >
                  {viewMode === 'reference' ? 'SEP' : (activeStats.nextBadge?.rarity?.toUpperCase() || 'NEXT')}
                </text>
              </svg>
            </div>
          </div>

          {/* Bottom Section: Locked Badge & Progress to Next Badge */}
          <div className="pt-4 border-t border-stone-800/60 mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-medium text-stone-400">
                {viewMode === 'reference' ? 'Locked Badge' : 'Next Badge to Unlock'}
              </div>
              {activeStats.nextBadge?.percentage !== undefined && (
                <span className="text-[10px] font-bold text-amber-400">
                  {activeStats.nextBadge.progress} / {activeStats.nextBadge.target} ({activeStats.nextBadge.percentage}%)
                </span>
              )}
            </div>

            <div className="text-sm font-semibold text-stone-100 tracking-tight flex items-center justify-between gap-2">
              <span className="truncate">{activeStats.nextBadge?.name || 'Sep LeetCoding Challenge'}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-black tracking-wider shrink-0 bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {activeStats.nextBadge?.rarity || 'Challenge'}
              </span>
            </div>

            {/* Criteria description */}
            <div className="text-[11px] text-stone-400 leading-snug">
              Criteria: {activeStats.nextBadge?.criteriaDescription || 'Solve daily robotics challenges.'}
            </div>

            {/* Progress bar towards next badge */}
            {activeStats.nextBadge?.percentage !== undefined && (
              <div className="w-full bg-[#333333] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, activeStats.nextBadge.percentage)}%` }}
                />
              </div>
            )}

            {/* Expander Button to View All Locked Badges */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowLockedModal(!showLockedModal)}
                className="inline-flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 font-bold transition-colors cursor-pointer"
              >
                <span>
                  {showLockedModal ? 'Hide Locked Badges' : 'View All Locked Badges & Goals'}
                </span>
                {showLockedModal ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Drawer of All Locked Badges & Criteria */}
      {showLockedModal && (
        <div className="bg-[#242424] rounded-2xl p-4 sm:p-5 border border-stone-700/80 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-200">
                Locked Badges & Progression Requirements
              </h3>
            </div>
            <span className="text-[11px] text-stone-400">
              Solve Arena problems to earn XP and unlock permanent achievements
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {(activeStats.lockedBadges || []).map((badge: any) => (
              <div
                key={badge.id}
                className="bg-[#2c2c2c] rounded-xl p-3 border border-stone-700/60 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg bg-stone-800 flex items-center justify-center text-stone-400 shrink-0">
                        {renderBadgeIcon(badge.icon, 'w-3.5 h-3.5')}
                      </div>
                      <h4 className="text-xs font-bold text-stone-100">{badge.name}</h4>
                    </div>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-stone-800 text-amber-400 border border-stone-700">
                      {badge.rarity}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1 leading-snug">{badge.description}</p>
                </div>

                <div className="pt-2 border-t border-stone-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-medium">
                    <span className="text-stone-400">Target: {badge.criteriaDescription}</span>
                    {badge.percentage !== undefined && (
                      <span className="font-bold text-teal-400">
                        {badge.progress} / {badge.target} ({badge.percentage}%)
                      </span>
                    )}
                  </div>
                  {badge.percentage !== undefined && (
                    <div className="w-full bg-[#383838] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, badge.percentage)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card 3: Daily Problem Consistency & Activity Heatmap */}
      <div className="bg-[#282828] rounded-2xl p-5 sm:p-6 border border-stone-800/80 space-y-4">
        {/* Heatmap Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Left: Total problems solved in past year with info tooltip */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-base font-bold text-white tabular-nums">
              {activeStats.totalProblemsInYear}
            </span>
            <span className="text-stone-300">problems completed in the past one year</span>
            <div className="relative group inline-flex items-center">
              <Info className="w-3.5 h-3.5 text-stone-500 group-hover:text-stone-300 transition-colors cursor-pointer ml-0.5" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-30 w-72 p-2.5 rounded-xl bg-stone-900 border border-stone-700 text-[11px] text-stone-300 shadow-2xl pointer-events-none leading-relaxed">
                Daily problem activity tracker: every green square represents a day where at least one verified kinematics problem or simulator challenge was solved. Solve at least 1 problem a day to maintain your streak!
              </div>
            </div>
          </div>

          {/* Right: Active Days, Max Streak & Today's 1-problem/day Status */}
          <div className="flex flex-wrap items-center gap-4 text-stone-400 font-medium">
            <div>
              <span>Total active days: </span>
              <span className="font-bold text-white tabular-nums ml-1">
                {activeStats.totalActiveDays}
              </span>
            </div>
            <div>
              <span>Max streak: </span>
              <span className="font-bold text-white tabular-nums ml-1">
                {activeStats.maxStreak}
              </span>
            </div>

            {/* Daily Consistency Goal Badge: 1 Problem A Day */}
            <div className="shrink-0">
              {activeStats.todayDone ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 shadow-xs">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Today: Goal Met (1+ Done)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60 shadow-xs">
                  <Target className="w-3 h-3 text-amber-400" />
                  <span>Today: 1 Problem/Day Pending</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Heatmap Grid (Scrollable on small screens) */}
        <div className="relative overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-transparent">
          <div className="inline-flex items-start gap-2.5 min-w-[720px] py-1">
            {calendarMonths.map((month) => (
              <div key={`${month.name}-${month.year}`} className="flex flex-col items-center">
                {/* Weeks in this Month */}
                <div className="flex items-start gap-[3px]">
                  {month.weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-[3px]">
                      {week.map((day, dIdx) => {
                        if (!day) {
                          // Placeholder for alignment
                          return (
                            <div
                              key={`empty-${dIdx}`}
                              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2.5px] invisible"
                            />
                          );
                        }

                        // Determine cell color based on problem completions count
                        let cellBg = 'bg-[#333333] hover:bg-[#444444]';
                        if (day.isActive) {
                          if (day.problemsDone >= 4) {
                            cellBg = 'bg-[#86efac] hover:bg-[#4ade80] shadow-xs shadow-emerald-400/40';
                          } else if (day.problemsDone >= 2) {
                            cellBg = 'bg-[#4ade80] hover:bg-[#22c55e] shadow-xs shadow-emerald-500/30';
                          } else {
                            cellBg = 'bg-[#22c55e] hover:bg-[#16a34a]';
                          }
                        }

                        return (
                          <div
                            key={day.date}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredDay({
                                day,
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                              });
                            }}
                            onMouseLeave={() => setHoveredDay(null)}
                            className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2.5px] cursor-pointer transition-colors ${cellBg}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Month Name Label */}
                <div className="text-[11px] font-medium text-stone-400 mt-2 select-none">
                  {month.name}
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Floating Tooltip */}
          {hoveredDay && (
            <div
              style={{
                position: 'fixed',
                left: `${hoveredDay.x}px`,
                top: `${hoveredDay.y - 8}px`,
                transform: 'translate(-50%, -100%)',
              }}
              className="z-50 pointer-events-none px-3 py-2 rounded-xl bg-stone-900/95 border border-stone-700 text-stone-200 text-xs shadow-2xl whitespace-nowrap backdrop-blur-sm space-y-0.5"
            >
              <div className="font-semibold text-white">
                {hoveredDay.day.problemsDone > 0
                  ? `${hoveredDay.day.problemsDone} problem${
                      hoveredDay.day.problemsDone > 1 ? 's' : ''
                    } completed`
                  : 'No problems completed'}
              </div>
              <div className="text-[10px] text-stone-400">
                {hoveredDay.day.monthName} {hoveredDay.day.dayOfMonth}, {hoveredDay.day.year}
              </div>
              <div className="text-[9.5px] pt-0.5 border-t border-stone-800 flex items-center gap-1 font-bold">
                {hoveredDay.day.problemsDone > 0 ? (
                  <span className="text-emerald-400">✓ Daily goal achieved</span>
                ) : (
                  <span className="text-stone-500">○ Goal: 1 problem/day</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
