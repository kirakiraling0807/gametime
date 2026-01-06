import { User, UserSchedule, DaySchedule } from "../types";

const USE_GOOGLE_SHEETS = true;
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwlZgfxdKqp-Zjo6zenr84akyTi964RcG1OK60PRZHFtELd1byIMWKIM-fQa9LM8JpQ/exec";

export interface IStorageService {
  getUsers(): Promise<User[]>;
  saveUser(user: User): Promise<void>;
  getUserByName(name: string): Promise<User | undefined>;
  updateUserRenaming(oldName: string, newUser: User): Promise<void>;
  getAllSchedules(): Promise<UserSchedule[]>;
  getUserSchedule(userName: string): Promise<DaySchedule[]>;
  saveUserDaySchedule(
    userName: string,
    date: string,
    ranges: any[]
  ): Promise<void>;
}

/**
 * 徹底解決時區偏移問題的日期正規化函數
 */
export const normalizeDate = (dateVal: any): string => {
  if (!dateVal) return "";

  // 如果已經是 YYYY-MM-DD 格式的字串，直接回傳
  if (typeof dateVal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    return dateVal;
  }

  const d = new Date(dateVal);
  if (isNaN(d.getTime())) {
    // 處理 ISO 字串或其他格式
    const str = String(dateVal).split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    return "";
  }

  // 使用本地時間 (Local Time) 取得年月日，避免 ISO/UTC 導致的 -1 天
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

class GoogleSheetsAdapter implements IStorageService {
  private url: string;
  constructor(url: string) {
    this.url = url;
  }

  private async request(action: string, payload: any = {}) {
    const body = JSON.stringify({ action, ...payload });
    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: body,
      });
      const result = await response.json();
      if (result && result.status === "error") throw new Error(result.message);
      return result;
    } catch (error) {
      console.error(`GAS Request Failed [${action}]:`, error);
      throw error;
    }
  }

  async getUsers(): Promise<User[]> {
    const users = await this.request("getUsers");
    return Array.isArray(users) ? users : [];
  }
  async saveUser(user: User): Promise<void> {
    await this.request("saveUser", { user });
  }
  async getUserByName(name: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find((u) => u.name === name);
  }
  async updateUserRenaming(oldName: string, newUser: User): Promise<void> {
    await this.request("renameUser", { oldName, newUser });
  }
  async getAllSchedules(): Promise<UserSchedule[]> {
    const data = await this.request("getSchedules");
    if (!Array.isArray(data)) return [];

    return data.map((us: any) => ({
      userName: us.userName,
      schedules: (us.schedules || []).map((s: any) => ({
        date: normalizeDate(s.date),
        ranges: Array.isArray(s.ranges) ? s.ranges : [],
      })),
    }));
  }
  async getUserSchedule(userName: string): Promise<DaySchedule[]> {
    const all = await this.getAllSchedules();
    const found = all.find((s) => s.userName === userName);
    return found ? found.schedules : [];
  }
  async saveUserDaySchedule(
    userName: string,
    date: string,
    ranges: any[]
  ): Promise<void> {
    await this.request("saveSchedule", { userName, date, ranges });
  }
}

export const storageService = new GoogleSheetsAdapter(GOOGLE_SCRIPT_URL);
