import api from "./axios";

export type StaffDto = {
  id: number;
  firstName: string;
  lastName: string;
  department: string;
  title: string;
  email: string;
  phoneNumber: string;
  tcKn: string;
  role: string;
  active: boolean;
};

export async function fetchStaffPage(page=0, size=100) {
  const { data } = await api.get(`/api/staff`, { params: { page, size, sort: "firstName,asc" }});

  return data as { content: StaffDto[]; totalElements: number; totalPages: number; number: number; size: number; };
}
