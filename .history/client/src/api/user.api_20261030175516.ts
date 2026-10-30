import type { User } from "../types/auth.types";
import { apiClient } from "./client";

export interface UpdateEmailPayload {
  email: string;
}

export interface UpdatePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export function updateUserEmailRequest(
  token: string,
  email: string
): Promise<{ user: User }> {
  return apiClient<{ user: User }>("/api/users/me/email", {
    method: "PATCH",
    token,
    body: { email },
  });
}

export function updateUserPasswordRequest(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> {
  return apiClient<{ message: string }>("/api/users/me/password", {
    method: "PATCH",
    token,
    body: { currentPassword, newPassword },
  });
}
