export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  departmentId: string | null;
  roles: string[];
}
