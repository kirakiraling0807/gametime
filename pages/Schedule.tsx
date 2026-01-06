import React, { useState, useEffect, useMemo } from "react";
import { User, DaySchedule, TimeRange } from "../types";
import { storageService } from "../services/storage";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { zhTW } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Trash2,
  X,
  Loader2,
  Save,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface ScheduleProps {
  currentUser: User;
}

export const Schedule: React.FC<ScheduleProps> = ({ currentUser }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [startTime, setStartTime] = useState(12);
  const [endTime, setEndTime] = useState(24);

  const loadSchedule = async () => {
    setIsLoading(true);
    try {
      const data = await storageService.getUserSchedule(currentUser.name);
      // Ensure all dates from backend are normalized
      const normalizedData = (data || []).map((s) => ({
        ...s,
        date: s.date.split("T")[0],
      }));
      setSchedule(normalizedData);
    } catch (error) {
      console.error("Failed to load schedule", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [currentUser.name]);

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    });
  }, [currentDate]);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  const currentRanges = useMemo(() => {
    const day = schedule.find((s) => s.date === selectedDateStr);
    return day ? day.ranges : [];
  }, [schedule, selectedDateStr]);

  const isAllDay = useMemo(() => {
    return (
      currentRanges.length === 1 &&
      currentRanges[0].start === 0 &&
      currentRanges[0].end === 24
    );
  }, [currentRanges]);

  const handleDateClick = (day: Date) => {
    setSelectedDate(day);
    setIsModalOpen(true);
    setErrorMessage("");
    setStartTime(12);
    setEndTime(24);
  };

  const handleSaveRanges = async (newRanges: TimeRange[]) => {
    const newSchedule = [...schedule];
    const existingIndex = newSchedule.findIndex(
      (s) => s.date === selectedDateStr
    );

    if (existingIndex >= 0) {
      if (newRanges.length === 0) {
        newSchedule.splice(existingIndex, 1);
      } else {
        newSchedule[existingIndex].ranges = newRanges;
      }
    } else if (newRanges.length > 0) {
      newSchedule.push({ date: selectedDateStr, ranges: newRanges });
    }

    setSchedule(newSchedule);
    setIsSaving(true);
    try {
      await storageService.saveUserDaySchedule(
        currentUser.name,
        selectedDateStr,
        newRanges
      );
    } catch (e) {
      console.error(e);
      alert("儲存失敗，請重試");
    } finally {
      setIsSaving(false);
    }
  };

  const isOverlapping = (newStart: number, newEnd: number) => {
    return currentRanges.some((r) => newStart < r.end && newEnd > r.start);
  };

  const addRange = () => {
    setErrorMessage("");
    if (startTime >= endTime) {
      setErrorMessage("開始時間必須早於結束時間");
      return;
    }
    if (isOverlapping(startTime, endTime)) {
      setErrorMessage("與已登記的時段重疊");
      return;
    }
    const newRanges = [...currentRanges, { start: startTime, end: endTime }];
    newRanges.sort((a, b) => a.start - b.start);
    handleSaveRanges(newRanges);
  };

  const removeRange = (index: number) => {
    const newRanges = [...currentRanges];
    newRanges.splice(index, 1);
    handleSaveRanges(newRanges);
  };

  const toggleAllDay = (checked: boolean) => {
    setErrorMessage("");
    if (checked) {
      handleSaveRanges([{ start: 0, end: 24 }]);
    } else {
      handleSaveRanges([{ start: 12, end: 24 }]);
    }
  };

  const getDayClass = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const hasData = schedule.some(
      (s) => s.date === dateStr && s.ranges.length > 0
    );
    const isTodayDate = isToday(day);

    let base =
      "h-14 md:h-24 w-full rounded-2xl flex flex-col items-center justify-center transition-all relative border-2 btn-bounce ";

    if (isTodayDate) {
      base += "bg-white border-brand-200 text-brand-500 font-bold ";
    } else if (hasData) {
      base += "bg-white border-green-200 text-slate-700 ";
    } else {
      base +=
        "bg-white/60 border-transparent text-slate-400 hover:bg-white hover:border-slate-200 ";
    }
    return base;
  };

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div className="h-full">
      <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-brand-100/50 border border-white">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-slate-700">時間填寫</h2>
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 hover:bg-white rounded-lg transition-colors text-slate-600"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-bold text-slate-700 min-w-[120px] text-center">
              {format(currentDate, "yyyy MMMM", { locale: zhTW })}
            </span>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 hover:bg-white rounded-lg transition-colors text-slate-600"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {weekDays.map((d) => (
            <div key={d} className="text-sm font-bold text-slate-400 py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 md:gap-3">
          {Array.from({ length: getDay(startOfMonth(currentDate)) }).map(
            (_, i) => (
              <div key={`empty-${i}`} />
            )
          )}

          {daysInMonth.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const hasData = schedule.some(
              (s) => s.date === dateStr && s.ranges.length > 0
            );
            return (
              <button
                key={day.toString()}
                onClick={() => handleDateClick(day)}
                className={getDayClass(day)}
              >
                <span className="text-lg md:text-2xl font-bold">
                  {format(day, "d")}
                </span>
                {hasData && (
                  <div className={`mt-1 flex items-center gap-1`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="hidden md:block text-[10px] text-green-600 font-bold">
                      已填寫
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
            >
              <X size={20} />
            </button>

            <div className="mb-6 border-b border-slate-100 pb-4">
              <div className="text-slate-400 font-bold mb-1 text-sm">
                {format(selectedDate, "yyyy MMMM", { locale: zhTW })}
              </div>
              <div className="text-3xl font-extrabold text-slate-700 flex items-center gap-2">
                {format(selectedDate, "d")} 日
                <span className="text-base text-slate-400 font-medium px-3 py-1 bg-slate-100 rounded-full">
                  週
                  {format(selectedDate, "eeee", { locale: zhTW }).replace(
                    "星期",
                    "週"
                  )}
                </span>
              </div>
            </div>

            <div className="max-h-[40vh] overflow-y-auto mb-6 custom-scrollbar pr-2 space-y-3">
              {isLoading ? (
                <div className="py-8 flex justify-center text-brand-300">
                  <Loader2 className="animate-spin" size={32} />
                </div>
              ) : currentRanges.length === 0 ? (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <Clock size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">這天還沒安排時間喔</p>
                </div>
              ) : (
                currentRanges.map((range, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-cream-50 rounded-2xl border border-brand-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-8 rounded-full bg-brand-300"></div>
                      <div>
                        <span className="text-lg font-bold text-slate-700 block leading-tight">
                          {range.start}:00 - {range.end}:00
                        </span>
                        {range.end - range.start === 24 && (
                          <span className="text-[10px] bg-brand-100 text-brand-600 px-2 py-0.5 rounded-full inline-block mt-1">
                            整天
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeRange(idx)}
                      className="p-2 text-slate-300 hover:text-red-400 hover:bg-white rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-4 pt-2">
              <div
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => toggleAllDay(!isAllDay)}
              >
                <div
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                    isAllDay
                      ? "bg-brand-500 border-brand-500"
                      : "bg-white border-slate-300"
                  }`}
                >
                  {isAllDay && <CheckCircle size={14} className="text-white" />}
                </div>
                <label className="font-bold text-slate-600 cursor-pointer select-none flex-1">
                  全天 (00:00 - 24:00)
                </label>
              </div>

              {!isAllDay && (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white p-2 rounded-xl border border-slate-200">
                      <select
                        value={startTime}
                        onChange={(e) => {
                          setStartTime(Number(e.target.value));
                          setErrorMessage("");
                        }}
                        className="w-full bg-transparent font-bold text-slate-700 outline-none text-center text-sm"
                      >
                        {Array.from({ length: 25 }).map((_, i) => (
                          <option key={i} value={i} disabled={i >= endTime}>
                            {i}:00
                          </option>
                        ))}
                      </select>
                    </div>
                    <span className="text-slate-400 font-bold text-sm">至</span>
                    <div className="flex-1 bg-white p-2 rounded-xl border border-slate-200">
                      <select
                        value={endTime}
                        onChange={(e) => {
                          setEndTime(Number(e.target.value));
                          setErrorMessage("");
                        }}
                        className="w-full bg-transparent font-bold text-slate-700 outline-none text-center text-sm"
                      >
                        {Array.from({ length: 25 }).map((_, i) => (
                          <option key={i} value={i} disabled={i <= startTime}>
                            {i}:00
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="flex items-center gap-2 text-red-500 text-xs font-bold px-1 animate-in slide-in-from-top-1">
                      <AlertTriangle size={12} />
                      {errorMessage}
                    </div>
                  )}

                  <button
                    onClick={addRange}
                    className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-brand-200 flex items-center justify-center gap-2 btn-bounce transition-all text-sm"
                  >
                    <Plus size={18} strokeWidth={3} />
                    <span>新增時段</span>
                  </button>
                </div>
              )}

              <div className="flex justify-between items-center h-6 px-1">
                {isSaving && (
                  <span className="text-xs text-brand-400 flex items-center gap-1 animate-pulse font-bold">
                    <Save size={12} /> 儲存中...
                  </span>
                )}
                {!isSaving && (
                  <span className="text-xs text-slate-300">變更會自動儲存</span>
                )}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 underline decoration-slate-300 underline-offset-2"
                >
                  完成並關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
