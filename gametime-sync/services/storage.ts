import { User, UserSchedule, DaySchedule } from '../types';

// ==========================================
// CONFIGURATION
// ==========================================

// 1. 將 USE_GOOGLE_SHEETS 改為 true
// 2. 將 GOOGLE_SCRIPT_URL 替換為您部署的 Apps Script 網址
const USE_GOOGLE_SHEETS = true; 
// ↓↓↓ 請將下方網址換成您剛剛部署好的 Web App URL ↓↓↓
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwlZgfxdKqp-Zjo6zenr84akyTi964RcG1OK60PRZHFtELd1byIMWKIM-fQa9LM8JpQ/exec'; 

// ==========================================
// INTERFACES
// ==========================================
export interface IStorageService {
  getUsers(): Promise<User[]>;
  saveUser(user: User): Promise<void>;
  getUserByName(name: string): Promise<User | undefined>;
  updateUserRenaming(oldName: string, newUser: User): Promise<void>;
  getAllSchedules(): Promise<UserSchedule[]>;
  getUserSchedule(userName: string): Promise<DaySchedule[]>;
  saveUserDaySchedule(userName: string, date: string, ranges: any[]): Promise<void>;
}

const USERS_KEY = 'gts_users';
const SCHEDULES_KEY = 'gts_schedules';

// Helper to simulate network delay for local development
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// LOCAL STORAGE ADAPTER (Fallback)
// ==========================================
class LocalStorageAdapter implements IStorageService {
  async getUsers(): Promise<User[]> {
    await delay(300); 
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  }

  async saveUser(user: User): Promise<void> {
    await delay(300);
    const users = await this.getUsers();
    const existingIndex = users.findIndex(u => u.name === user.name);
    
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  async getUserByName(name: string): Promise<User | undefined> {
    await delay(200);
    const users = await this.getUsers();
    return users.find(u => u.name === name);
  }

  async updateUserRenaming(oldName: string, newUser: User): Promise<void> {
    await delay(500);
    const users = await this.getUsers();
    const index = users.findIndex(u => u.name === oldName);
    if (index !== -1) {
      users[index] = newUser;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    const allSchedules = await this.getAllSchedules();
    const userSchedIndex = allSchedules.findIndex(s => s.userName === oldName);
    if (userSchedIndex !== -1) {
      allSchedules[userSchedIndex].userName = newUser.name;
      localStorage.setItem(SCHEDULES_KEY, JSON.stringify(allSchedules));
    }
  }

  async getAllSchedules(): Promise<UserSchedule[]> {
    await delay(300);
    const data = localStorage.getItem(SCHEDULES_KEY);
    return data ? JSON.parse(data) : [];
  }

  async getUserSchedule(userName: string): Promise<DaySchedule[]> {
    const all = await this.getAllSchedules();
    const found = all.find(s => s.userName === userName);
    return found ? found.schedules : [];
  }

  async saveUserDaySchedule(userName: string, date: string, ranges: any[]): Promise<void> {
    await delay(300);
    const all = await this.getAllSchedules();
    let userSched = all.find(s => s.userName === userName);

    if (!userSched) {
      userSched = { userName, schedules: [] };
      all.push(userSched);
    }

    const dayIndex = userSched.schedules.findIndex(d => d.date === date);
    if (dayIndex >= 0) {
      if (ranges.length === 0) {
        userSched.schedules.splice(dayIndex, 1);
      } else {
        userSched.schedules[dayIndex].ranges = ranges;
      }
    } else if (ranges.length > 0) {
      userSched.schedules.push({ date, ranges });
    }

    localStorage.setItem(SCHEDULES_KEY, JSON.stringify(all));
  }
}

// ==========================================
// GOOGLE SHEETS ADAPTER
// ==========================================
class GoogleSheetsAdapter implements IStorageService {
  private url: string;

  constructor(url: string) {
    this.url = url;
    if (url.includes('YOUR_GOOGLE_SCRIPT')) {
      console.warn('⚠️ Google Sheets API URL尚未設定，請在 services/storage.ts 中填入您的 Web App URL');
    }
  }

  // Use POST for everything to avoid caching and handle complex data bodies
  private async request(action: string, payload: any = {}) {
    if (this.url.includes('YOUR_GOOGLE_SCRIPT')) {
      throw new Error("請先設定 Google Apps Script URL");
    }

    // Google Apps Script Web App handles POST requests best as 'text/plain' or generic 
    // to avoid CORS preflight issues with application/json in some browser environments,
    // though modern GAS deployments handle CORS well.
    // We send the data as a JSON string inside the body.
    const body = JSON.stringify({ action, ...payload });

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', 
        },
        body: body,
      });

      if (!response.ok) {
        throw new Error(`Google Sheets API Error: ${response.statusText}`);
      }

      // Try to parse JSON, if it fails, it might be an HTML error page from Google
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error("無法解析伺服器回應，可能是權限設定錯誤 (請確保 Apps Script 部署為 'Anyone')");
      }

      if (result.status === 'error') {
        throw new Error(result.message);
      }
      return result;
    } catch (error) {
      console.error(`GAS Request Failed [${action}]:`, error);
      throw error;
    }
  }

  async getUsers(): Promise<User[]> {
    // For read operations, we can use GET if we want, but POST is robust for everything
    // Let's stick to POST for consistency with the Apps Script logic provided
    return this.request('getUsers');
  }

  async saveUser(user: User): Promise<void> {
    await this.request('saveUser', { user });
  }

  async getUserByName(name: string): Promise<User | undefined> {
    // In a real DB we would filter on server, but for Sheets it's okay to fetch all (small dataset)
    const users = await this.getUsers();
    return users.find(u => u.name === name);
  }

  async updateUserRenaming(oldName: string, newUser: User): Promise<void> {
    await this.request('renameUser', { oldName, newUser });
  }

  async getAllSchedules(): Promise<UserSchedule[]> {
    return this.request('getSchedules');
  }

  async getUserSchedule(userName: string): Promise<DaySchedule[]> {
    const all = await this.getAllSchedules();
    const found = all.find(s => s.userName === userName);
    return found ? found.schedules : [];
  }

  async saveUserDaySchedule(userName: string, date: string, ranges: any[]): Promise<void> {
    await this.request('saveSchedule', { userName, date, ranges });
  }
}

// Export the selected service
export const storageService = (USE_GOOGLE_SHEETS && GOOGLE_SCRIPT_URL)
  ? new GoogleSheetsAdapter(GOOGLE_SCRIPT_URL) 
  : new LocalStorageAdapter();