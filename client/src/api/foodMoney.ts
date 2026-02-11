/**
 * Food Money API - worksheet-based food allowance
 */

import api from "./client";

export interface FoodMoneyRecord {
  emp_id: string;
  month: string;
  amount: number;
}

export const foodMoneyApi = {
  getAll: (month?: string) =>
    api.get<FoodMoneyRecord[]>(`/api/food-money${month ? `?month=${encodeURIComponent(month)}` : ""}`),

  bulkUpload: (records: FoodMoneyRecord[], replaceMonths?: string[]) =>
    api.post<{ count: number; message: string; months: string[] }>("/api/food-money/bulk", {
      records,
      replaceMonths,
    }),
};
