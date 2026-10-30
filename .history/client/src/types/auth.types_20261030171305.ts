export type UserRole = "admin" | "shopper";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type LoginResponse = AuthResponse;
export type RegisterResponse = AuthResponse;

export interface AuthSession {
  token: string;
  user: User;
}
