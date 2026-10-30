import type {
  LoginCredentials,
  LoginResponse,
  RegisterCredentials,
  RegisterResponse,
} from "../types/auth.types";
import { apiClient } from "./client";

export function loginRequest(credentials: LoginCredentials): Promise<LoginResponse> {
  return apiClient<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: credentials,
  });
}

export function registerRequest(
  credentials: RegisterCredentials
): Promise<RegisterResponse> {
  return apiClient<RegisterResponse>("/api/auth/register", {
    method: "POST",
    body: credentials,
  });
}
