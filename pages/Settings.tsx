import React, { useState, useEffect } from 'react';
import { User, COLORS, EMOJIS } from '../types';
import { storageService } from '../services/storage';
import { Save, Loader2 } from 'lucide-react';

interface SettingsProps {
  currentUser: User;
  onUpdateUser: (user: User) => void;
}

export const Settings: React.FC<SettingsProps> = ({ currentUser, onUpdateUser }) => {
  const [name, setName] = useState(currentUser.name);
  const [emoji, setEmoji] = useState(currentUser.emoji);
  const [color, setColor] = useState(currentUser.color);
  const [isDirty, setIsDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const isChanged = name !== currentUser.name || emoji !== currentUser.emoji || color !== currentUser.color;
    setIsDirty(isChanged);
  }, [name, emoji, color, currentUser]);

  const handleSave = async () => {
    if (!isDirty || !name.trim() || isLoading) return;
    setIsLoading(true);
    setMessage('');
    
    const newUser: User = { name: name.trim(), emoji, color };
    
    try {
      if (name !== currentUser.name) {
         const exists = await storageService.getUserByName(name);
         if (exists) {
           setMessage('⚠️ 該名字已被使用，請換一個');
           setIsLoading(false);
           return;
         }
         await storageService.updateUserRenaming(currentUser.name, newUser);
      } else {
         await storageService.saveUser(newUser);
      }

      onUpdateUser(newUser);
      setMessage('✅ 設定已儲存！');
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      setMessage('❌ 儲存失敗');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h2 className="text-3xl font-extrabold text-slate-700">個人設定</h2>

      <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-brand-100/50 border border-white space-y-8">
        <div>
          <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">暱稱</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-700 font-bold focus:ring-4 focus:ring-brand-100 focus:border-brand-300 outline-none transition-all disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">代表圖示</label>
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 h-60 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-6 gap-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  disabled={isLoading}
                  className={`text-2xl w-10 h-10 flex items-center justify-center rounded-xl transition-all btn-bounce ${
                    emoji === e 
                      ? 'bg-white shadow-md scale-110 border border-brand-200' 
                      : 'hover:bg-white/50 opacity-70 hover:opacity-100'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">代表顏色</label>
          <div className="flex flex-wrap gap-3 bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 justify-center">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                disabled={isLoading}
                className={`w-10 h-10 rounded-full transition-all btn-bounce ring-4 ring-offset-2 ring-offset-slate-50 ${
                  color === c ? 'ring-brand-200 scale-110 shadow-sm' : 'ring-transparent opacity-60 hover:opacity-100'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <span className={`text-sm font-bold animate-in fade-in ${message.includes('❌') || message.includes('⚠️') ? 'text-red-400' : 'text-green-500'}`}>
              {message}
            </span>
            <button
              onClick={handleSave}
              disabled={!isDirty || !name.trim() || isLoading}
              className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all text-lg ${
                isDirty && name.trim() && !isLoading
                  ? 'bg-brand-500 hover:bg-brand-400 text-white shadow-lg shadow-brand-200 btn-bounce' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
              {isLoading ? '儲存中...' : '儲存變更'}
            </button>
        </div>
      </div>
    </div>
  );
};