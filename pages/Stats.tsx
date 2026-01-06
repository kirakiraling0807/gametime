import { useState, useMemo, useEffect } from "react";
import { User, UserSchedule, TimeRange } from "../types";
import { storageService, normalizeDate } from "../services/storage";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
} from "date-fns";
import { zhTW } from "date-fns/locale";
import { ChevronLeft, ChevronRight, RefreshCw, Loader2 } from "lucide-react";

interface StatsProps {
  currentUser: User;
}

export const Stats: React.FC<StatsProps> = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [users, setUsers] = useState<User[]>([]);
  const [allSchedules, setAllSchedules] = useState<UserSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedUsers, fetchedSchedules] = await Promise.all([
        storageService.getUsers(),
        storageService.getAllSchedules(),
      ]);
      setUsers(Array.isArray(fetchedUsers) ? fetchedUsers : []);
      setAllSchedules(Array.isArray(fetchedSchedules) ? fetchedSchedules : []);
    } catch (e) {
      console.error("Failed to load stats data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    });
  }, [currentDate]);

  const isAvailable = (range: TimeRange, hour: number) => {
    return hour >= range.start && hour < range.end;
  };

  const sortedDayData = useMemo(() => {
    if (!allSchedules.length) return [];

    const mappedData = daysInMonth.map((day) => {
      const dateStr = normalizeDate(day);

      const activeUsersOnDay = allSchedules.filter((userSched) => {
        const daySched = userSched.schedules.find(
          (d) => normalizeDate(d.date) === dateStr
        );
        return (
          daySched &&
          Array.isArray(daySched.ranges) &&
          daySched.ranges.length > 0
        );
      });

      if (activeUsersOnDay.length === 0) return null;

      const hours = Array.from({ length: 24 }, (_, i) => i);
      const overlapHeatmap = hours.map((hour) => {
        const count = activeUsersOnDay.filter((uSched) => {
          const daySched = uSched.schedules.find(
            (d) => normalizeDate(d.date) === dateStr
          );
          return daySched?.ranges.some((r) => isAvailable(r, hour));
        }).length;
        return { hour, count };
      });

      const maxOverlap = Math.max(...overlapHeatmap.map((h) => h.count));

      return {
        day,
        dateStr,
        activeUsersOnDay,
        overlapHeatmap,
        maxOverlap,
      };
    });

    const data = mappedData.filter(
      (item): item is NonNullable<typeof item> => item !== null
    );

    return data.sort((a, b) => {
      if (b.maxOverlap !== a.maxOverlap) {
        return b.maxOverlap - a.maxOverlap;
      }
      return a.day.getTime() - b.day.getTime();
    });
  }, [daysInMonth, allSchedules]);

  const DayRow = ({ data }: { data: any }) => {
    const { day, activeUsersOnDay, overlapHeatmap, maxOverlap } = data;

    return (
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          <div className="flex-shrink-0 w-24 bg-brand-50 rounded-2xl p-2 text-center border border-brand-100">
            <div className="text-xl font-extrabold text-brand-500">
              {format(day, "M/d")}
            </div>
            <div className="text-xs font-bold text-brand-300 uppercase">
              {format(day, "EEEE", { locale: zhTW })}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap gap-2">
              {activeUsersOnDay.map((us: any) => {
                const u = users.find((u) => u.name === us.userName);
                return (
                  <span
                    key={us.userName}
                    className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full text-sm font-bold border border-slate-200 text-slate-600"
                  >
                    <span>{u?.emoji || "👤"}</span>
                    <span className="truncate max-w-[80px]">
                      {u?.name || us.userName}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>

          {maxOverlap > 1 && (
            <div className="flex-shrink-0 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-extrabold flex items-center">
              🔥 {maxOverlap} 人重疊
            </div>
          )}
        </div>

        <div className="relative pt-6 pb-2">
          <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-2 px-1">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>

          <div className="relative h-auto space-y-2">
            <div className="absolute inset-0 flex pointer-events-none z-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 border-l border-slate-100 last:border-r"
                ></div>
              ))}
            </div>

            <div className="absolute inset-0 flex z-0 h-full pointer-events-none rounded-xl overflow-hidden">
              {overlapHeatmap.map((h: any, idx: number) => (
                <div
                  key={idx}
                  className="flex-1 transition-all"
                  style={{
                    backgroundColor:
                      h.count > 1
                        ? `rgba(71, 85, 105, ${
                            (h.count / activeUsersOnDay.length) * 0.5
                          })`
                        : "transparent",
                  }}
                ></div>
              ))}
            </div>

            {activeUsersOnDay.map((uSched: any) => {
              const daySched = uSched.schedules.find(
                (d: any) => normalizeDate(d.date) === data.dateStr
              );
              const u = users.find((user) => user.name === uSched.userName);
              if (!daySched) return null;

              return (
                <div
                  key={uSched.userName}
                  className="relative h-8 w-full bg-slate-50/50 rounded-xl flex items-center overflow-hidden border border-slate-100/50"
                >
                  <div className="absolute left-0 z-10 pl-3 text-[10px] font-bold text-slate-500 truncate max-w-[100px] flex items-center gap-1">
                    <span>{u?.emoji}</span> {u?.name}
                  </div>
                  {daySched.ranges.map((range: any, rIdx: number) => {
                    const left = (range.start / 24) * 100;
                    const width = ((range.end - range.start) / 24) * 100;

                    return (
                      <div
                        key={rIdx}
                        className="absolute h-full top-0 opacity-80 hover:opacity-100 transition-opacity"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          backgroundColor: u?.color || "#cbd5e1",
                          borderRadius: "6px",
                          border: "2px solid white",
                        }}
                        title={`${range.start}:00 - ${range.end}:00`}
                      ></div>
                    );
                  })}
                </div>
              );
            })}

            {activeUsersOnDay.length > 1 && maxOverlap > 1 && (
              <div className="relative h-6 w-full mt-3 rounded-xl overflow-hidden flex items-center bg-slate-100 border border-slate-200">
                <div className="absolute left-0 px-3 text-[10px] text-slate-500 font-bold">
                  交集
                </div>
                {overlapHeatmap.map((h: any, idx: number) => {
                  if (h.count < 2) return null;
                  const left = (idx / 24) * 100;
                  const width = (1 / 24) * 100;
                  return (
                    <div
                      key={idx}
                      className="absolute h-full bg-slate-500"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        opacity: (h.count - 1) / (activeUsersOnDay.length - 1),
                      }}
                    ></div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
        <Loader2 className="animate-spin mb-4 text-brand-300" size={48} />
        <p className="font-bold">正在分析大家的時間...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-extrabold text-slate-700">統計報表</h2>
        <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm border border-slate-100">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-slate-50 rounded-lg text-slate-500"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-bold text-slate-700 min-w-[140px] text-center">
            {format(currentDate, "yyyy MMMM", { locale: zhTW })}
          </span>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-slate-50 rounded-lg text-slate-500"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={loadData}
          className="px-4 py-2 text-sm bg-white text-brand-500 font-bold rounded-xl shadow-sm border border-brand-100 hover:bg-brand-50 flex items-center gap-2 transition-all btn-bounce"
        >
          <RefreshCw size={14} /> 重新整理
        </button>
      </div>

      <div className="space-y-4">
        {sortedDayData.map((data: any) => (
          <DayRow key={data.dateStr} data={data} />
        ))}
        {!isLoading && sortedDayData.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100">
            <p className="text-slate-400 font-bold text-lg">
              這個月還沒有人填寫時間喔！
            </p>
            <p className="text-slate-300">快去叫大家填寫吧</p>
          </div>
        )}
      </div>
    </div>
  );
};
