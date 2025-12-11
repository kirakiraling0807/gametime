import React, { useState, useEffect, useMemo } from 'react';
import { User, COLORS, EMOJIS } from '../types';
import { storageService } from '../services/storage';
import { Loader2, Lock } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0]);
  const [isNewUser, setIsNewUser] = useState(true);
  const [checkingName, setCheckingName] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Use memo to ensure we can display the selected color even if it's a legacy color not in the current palette
  const displayColors = useMemo(() => {
    if (!COLORS.includes(selectedColor)) {
      return [selectedColor, ...COLORS];
    }
    return COLORS;
  }, [selectedColor]);

  // Check if user exists when name changes
  useEffect(() => {
    const checkUser = async () => {
      if (name.trim()) {
        setCheckingName(true);
        try {
          const existingUser = await storageService.getUserByName(name.trim());
          if (existingUser) {
            setSelectedColor(existingUser.color);
            setSelectedEmoji(existingUser.emoji);
            setIsNewUser(false);
          } else {
            setIsNewUser(true);
          }
        } catch (error) {
          console.error("Error checking user:", error);
        } finally {
          setCheckingName(false);
        }
      } else {
        setIsNewUser(true);
      }
    };

    // Debounce the check slightly
    const timeoutId = setTimeout(checkUser, 500);
    return () => clearTimeout(timeoutId);
  }, [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg('');
    const user: User = {
      name: name.trim(),
      emoji: selectedEmoji,
      color: selectedColor
    };

    try {
      await storageService.saveUser(user);
      onLogin(user);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "登入失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSelectionDisabled = !isNewUser || isSubmitting;

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-[2rem] shadow-xl shadow-brand-100 border border-white">
      <div className="text-center mb-8">
        <div className="inline-block p-4 rounded-full bg-brand-50 mb-4 text-5xl shadow-inner border border-brand-100">
          🎮
        </div>
        <h2 className="text-3xl font-extrabold text-slate-700 mb-2">遊戲時間統計</h2>
        <p className="text-slate-400 font-medium">輸入名字加入時間統計</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">暱稱（日後使用這個暱稱登入）</label>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：小明"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-700 font-bold focus:ring-4 focus:ring-brand-100 focus:border-brand-300 outline-none transition-all pr-10 placeholder-slate-300"
              required
              disabled={isSubmitting}
            />
            {checkingName && (
              <div className="absolute right-4 top-4 text-brand-400">
                <Loader2 className="animate-spin" size={20} />
              </div>
            )}
          </div>
          {!isNewUser && name && !checkingName && (
            <div className="flex items-center justify-between mt-2 ml-1">
              <p className="text-xs text-green-500 font-bold flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                🎉 歡迎回來！已載入你的設定
              </p>
            </div>
          )}
        </div>

        <div className={`transition-opacity duration-300 ${isSelectionDisabled ? 'opacity-60 grayscale-[0.5]' : ''}`}>
          <div className="flex items-center justify-between mb-2 ml-1">
             <label className="block text-sm font-bold text-slate-500">選擇代表圖示</label>
             {isSelectionDisabled && (
               <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                 <Lock size={12} /> 設定已鎖定
               </span>
             )}
          </div>
          <div className={`bg-slate-50 p-3 rounded-2xl border-2 border-slate-100 h-48 overflow-y-auto custom-scrollbar ${isSelectionDisabled ? 'cursor-not-allowed' : ''}`}>
            <div className={`grid grid-cols-6 gap-2 ${isSelectionDisabled ? 'pointer-events-none' : ''}`}>
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  disabled={isSelectionDisabled}
                  className={`text-2xl w-10 h-10 flex items-center justify-center rounded-xl transition-all btn-bounce ${
                    selectedEmoji === emoji 
                      ? 'bg-white shadow-md scale-110 border border-brand-200' 
                      : 'hover:bg-white/50 opacity-70 hover:opacity-100'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`transition-opacity duration-300 ${isSelectionDisabled ? 'opacity-60 grayscale-[0.5]' : ''}`}>
           <div className="flex items-center justify-between mb-2 ml-1">
             <label className="block text-sm font-bold text-slate-500">選擇代表顏色</label>
             {isSelectionDisabled && (
               <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                 <Lock size={12} /> 設定已鎖定
               </span>
             )}
          </div>
          <div className={`flex flex-wrap gap-3 bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 justify-center ${isSelectionDisabled ? 'cursor-not-allowed pointer-events-none' : ''}`}>
            {displayColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                disabled={isSelectionDisabled}
                className={`w-8 h-8 rounded-full transition-all btn-bounce ring-2 ring-offset-2 ring-offset-slate-50 ${
                  selectedColor === color ? 'ring-brand-300 scale-110 shadow-md' : 'ring-transparent opacity-40 hover:opacity-100'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-500 text-sm font-bold rounded-xl text-center animate-in fade-in">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || checkingName}
          className="w-full bg-brand-500 hover:bg-brand-400 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-lg py-4 rounded-2xl transition-all shadow-lg shadow-brand-200 flex items-center justify-center gap-2 mt-4 btn-bounce"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              處理中...
            </>
          ) : (
            isNewUser ? '開始使用' : '登入'
          )}
        </button>
      </form>
    </div>
  );
};