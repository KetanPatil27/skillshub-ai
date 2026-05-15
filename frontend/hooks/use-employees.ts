"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  Employee,
  EmployeeListResponse,
  Project,
  Skill,
} from "@/types";

export interface EmployeeFilters {
  location?: string;
  allocation_status?: string;
  min_years?: number;
  status?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

export function useEmployees(filters: EmployeeFilters = {}) {
  return useQuery<EmployeeListResponse>({
    queryKey: ["employees", filters],
    queryFn: async () => {
      const { data } = await api.get<EmployeeListResponse>("/employees", {
        params: filters,
      });
      return data;
    },
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery<Employee>({
    queryKey: ["employee", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<Employee>(`/employees/${id}`);
      return data;
    },
  });
}

export function useMyProfile() {
  return useQuery<Employee>({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data } = await api.get<Employee>("/employees/me");
      return data;
    },
    retry: false,
  });
}

export function useUpdateEmployee(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Employee>) => {
      const { data } = await api.patch<Employee>(`/employees/${id}`, patch);
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(["employee", id], data);
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useReplaceSkills(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (skills: Skill[]) => {
      const { data } = await api.put<Employee>(`/employees/${id}/skills`, skills);
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(["employee", id], data);
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

export function useReplaceProjects(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projects: Project[]) => {
      const { data } = await api.put<Employee>(`/employees/${id}/projects`, projects);
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(["employee", id], data);
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}
