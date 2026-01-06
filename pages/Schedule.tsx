import React, { useState, useEffect, useMemo } from "react";
import { User, DaySchedule, TimeRange } from "../types";
import { storageService, normalizeDate } from "../services/storage";
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [startTime, setStartTime] = useState(12);
  const [endTime, setEndTime] = useState(24);

  const loadSchedule = async () => {
    setIsLoading(true);
    try {
      const data = await storageService.getUserSchedule(currentUser.name);
      setSchedule(data || []);
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

  const selectedDateStr = useMemo(
    () => normalizeDate(selectedDate),
    [selectedDate]
  );

  const currentRanges = useMemo(() => {
    const day = schedule.find((s) => normalizeDate(s.date) === selectedDateStr);
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
  };

  const handleSaveRanges = async (newRanges: TimeRange[]) => {
    const newSchedule = [...schedule];
    const existingIndex = newSchedule.findIndex(
      (s) => normalizeDate(s.date) === selectedDateStr
    );

    if (existingIndex >= 0) {
      if (newRanges.length === 0) newSchedule.splice(existingIndex, 1);
      else newSchedule[existingIndex].ranges = newRanges;
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
    } finally {
      setIsSaving(false);
    }
  };

  const isOverlapping = (newStart: number, newEnd: number) => {
    return currentRanges.some((r) => newStart < r.end && newEnd > r.start);
  };

  const addRange = () => {
    if (startTime >= endTime) return;
    if (isOverlapping(startTime, endTime)) {
      setErrorMessage("與已登記的時段重疊");
      return;
    }
    const newRanges = [
      ...currentRanges,
      { start: startTime, end: endTime },
    ].sort((a, b) => a.start - b.start);
    handleSaveRanges(newRanges);
    setErrorMessage("");
  };

  const removeRange = (index: number) => {
    const newRanges = [...currentRanges];
    newRanges.splice(index, 1);
    handleSaveRanges(newRanges);
  };

  const toggleAllDay = (checked: boolean) => {
    if (checked) handleSaveRanges([{ start: 0, end: 24 }]);
    else handleSaveRanges([]);
  };

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
        <Loader2 className="animate-spin mb-4 text-brand-300" size={48} />
        <p className="font-bold">載入中，請稍候...</p>
      </div>
    );
  }

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
            const dateStr = normalizeDate(day);
            const hasData = schedule.some(
              (s) => normalizeDate(s.date) === dateStr && s.ranges.length > 0
            );
            const isTodayDate = isToday(day);

            return (
              <button
                key={day.toString()}
                onClick={() => handleDateClick(day)}
                className={`h-14 md:h-24 w-full rounded-2xl flex flex-col items-center justify-center transition-all border-2 btn-bounce ${
                  isTodayDate
                    ? "bg-white border-brand-200 text-brand-500 font-bold"
                    : hasData
                    ? "bg-white border-green-200 text-slate-700"
                    : "bg-white/60 border-transparent text-slate-400 hover:bg-white hover:border-slate-200"
                }`}
              >
                <span className="text-lg md:text-2xl font-bold">
                  {format(day, "d")}
                </span>
                {hasData && (
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full"
            >
              <X size={20} />
            </button>

            <div className="mb-6 border-b border-slate-100 pb-4">
              <div className="text-3xl font-extrabold text-slate-700">
                {format(selectedDate, "d")} 日
                <span className="ml-2 text-base text-slate-400 font-medium bg-slate-100 px-3 py-1 rounded-full">
                  週{format(selectedDate, "eee", { locale: zhTW })}
                </span>
              </div>
            </div>

            <div className="max-h-[30vh] overflow-y-auto mb-6 custom-scrollbar space-y-3">
              {currentRanges.length === 0 ? (
                <p className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl">
                  還沒安排時間喔
                </p>
              ) : (
                currentRanges.map((range, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-brand-50 rounded-2xl border border-brand-100"
                  >
                    <span className="font-bold text-slate-700">
                      {range.start}:00 - {range.end}:00
                    </span>
                    <button
                      onClick={() => removeRange(idx)}
                      className="text-red-400 p-1 hover:bg-white rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-4">
              <button
                onClick={() => toggleAllDay(!isAllDay)}
                className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-2xl font-bold text-slate-600"
              >
                <div
                  className={`w-5 h-5 rounded border-2 ${
                    isAllDay
                      ? "bg-brand-500 border-brand-500"
                      : "bg-white border-slate-300"
                  }`}
                />
                全天 (00:00 - 24:00)
              </button>

              {!isAllDay && (
                <div className="bg-slate-50 p-3 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={startTime}
                      onChange={(e) => setStartTime(Number(e.target.value))}
                      className="flex-1 p-2 rounded-xl border border-slate-200 font-bold text-center"
                    >
                      {Array.from({ length: 24 }).map((_, i) => (
                        <option key={i} value={i}>
                          {i}:00
                        </option>
                      ))}
                    </select>
                    <span className="font-bold text-slate-400">至</span>
                    <select
                      value={endTime}
                      onChange={(e) => setEndTime(Number(e.target.value))}
                      className="flex-1 p-2 rounded-xl border border-slate-200 font-bold text-center"
                    >
                      {Array.from({ length: 25 }).map((_, i) => (
                        <option key={i} value={i}>
                          {i}:00
                        </option>
                      ))}
                    </select>
                  </div>
                  {errorMessage && (
                    <p className="text-red-500 text-xs font-bold text-center">
                      {errorMessage}
                    </p>
                  )}
                  <button
                    onClick={addRange}
                    className="w-full bg-brand-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-brand-200"
                  >
                    新增時段
                  </button>
                </div>
              )}

              <div className="flex justify-between items-center text-xs text-slate-400">
                {isSaving ? <span>儲存中...</span> : <span>自動儲存中</span>}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="font-bold text-brand-500"
                >
                  完成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
