/**
 * Department API
 */

import api from './client';
import type { Dept } from '@shared/schema';

export async function getDepts(): Promise<Dept[]> {
  return api.get<Dept[]>('/api/dept');
}

export async function createDept(name: string): Promise<Dept> {
  return api.post<Dept>('/api/dept', { name });
}

export async function updateDept(
  id: number,
  updates: { name?: string; completed?: boolean }
): Promise<Dept> {
  return api.patch<Dept>(`/api/dept/${id}`, updates);
}

export async function deleteDept(id: number): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/api/dept/${id}`);
}

export const deptApi = {
  getAll: getDepts,
  create: createDept,
  update: updateDept,
  delete: deleteDept,
};

export default deptApi;
