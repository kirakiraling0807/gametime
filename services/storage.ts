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

const USERS_KEY = "gts_users";
const SCHEDULES_KEY = "gts_schedules";

/**
 * 徹底解決時區偏移問題的日期正規化函數
 * 確保輸出的日期永遠是 YYYY-MM-DD
 */
export const normalizeDate = (dateVal: any): string => {
  if (!dateVal) return "";

  // 1. 如果是 Date 物件（通常從 Google Sheets 傳回）
  if (dateVal instanceof Date) {
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, "0");
    const d = String(dateVal.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // 2. 如果是字串
  if (typeof dateVal === "string") {
    // 處理 ISO 格式 "2024-01-06T16:00:00.000Z" -> "2024-01-06"
    // 或者 "2024/01/06 00:00:00" -> "2024-01-06"
    const firstPart = dateVal.split("T")[0].split(" ")[0];
    const parts = firstPart.split(/[-/]/);
    if (parts.length === 3) {
      const y = parts[0];
      const m = parts[1].padStart(2, "0");
      const d = parts[2].padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return firstPart;
  }

  return String(dateVal);
};

class LocalStorageAdapter implements IStorageService {
  async getUsers(): Promise<User[]> {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  }
  async saveUser(user: User): Promise<void> {
    const users = await this.getUsers();
    const existingIndex = users.findIndex((u) => u.name === user.name);
    if (existingIndex >= 0) users[existingIndex] = user;
    else users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  async getUserByName(name: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find((u) => u.name === name);
  }
  async updateUserRenaming(oldName: string, newUser: User): Promise<void> {
    const users = await this.getUsers();
    const index = users.findIndex((u) => u.name === oldName);
    if (index !== -1) users[index] = newUser;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    const all = await this.getAllSchedules();
    const userSched = all.find((s) => s.userName === oldName);
    if (userSched) userSched.userName = newUser.name;
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify(all));
  }
  async getAllSchedules(): Promise<UserSchedule[]> {
    const data = localStorage.getItem(SCHEDULES_KEY);
    return data ? JSON.parse(data) : [];
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
    const all = await this.getAllSchedules();
    let userSched = all.find((s) => s.userName === userName);
    if (!userSched) {
      userSched = { userName, schedules: [] };
      all.push(userSched);
    }
    const dayIndex = userSched.schedules.findIndex(
      (d) => normalizeDate(d.date) === date
    );
    if (dayIndex >= 0) {
      if (ranges.length === 0) userSched.schedules.splice(dayIndex, 1);
      else userSched.schedules[dayIndex].ranges = ranges;
    } else if (ranges.length > 0) {
      userSched.schedules.push({ date, ranges });
    }
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify(all));
  }
}

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
    return this.request("getUsers");
  }
  async saveUser(user: User): Promise<void> {
    await this.request("saveUser", { user });
  }
  async getUserByName(name: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return Array.isArray(users)
      ? users.find((u) => u.name === name)
      : undefined;
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

export const storageService =
  USE_GOOGLE_SHEETS && GOOGLE_SCRIPT_URL
    ? new GoogleSheetsAdapter(GOOGLE_SCRIPT_URL)
    : new LocalStorageAdapter();
