import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Button,
  Card,
  FormField,
  Input,
  Label,
  PasswordInput,
  Text,
} from "../design-system";
import { useAuth } from "../context/AuthContext";
import { updateUserEmailRequest, updateUserPasswordRequest } from "../api/user.api";
import styles from "./AccountPage.module.css";

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function AccountPage() {
  const { user, token, updateUser } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
    }
  }, [user]);

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();

    if (!user || !token) {
      return;
    }

    const trimmedEmail = email.trim();
    setEmailError("");
    setEmailSuccess("");

    if (!trimmedEmail) {
      setEmailError("Email is required.");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setIsEmailSubmitting(true);

    try {
      const response = await updateUserEmailRequest(token, trimmedEmail);
      updateUser(response.user);
      setEmail(response.user.email);
      setEmailSuccess("Your email has been updated.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to update your email.";
      setEmailError(message);
    } finally {
      setIsEmailSubmitting(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();

    if (!token) {
      return;
    }

    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    if (new TextEncoder().encode(newPassword).length > 72) {
      setPasswordError("New password must be 72 bytes or fewer.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsPasswordSubmitting(true);

    try {
      await updateUserPasswordRequest(token, currentPassword, newPassword);
      setPasswordSuccess("Your password has been updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to update your password.";
      setPasswordError(message);
    } finally {
      setIsPasswordSubmitting(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Text variant="headline-xl" as="h1">
          My Account
        </Text>
        <Text variant="body-md" color="secondary">
          Update your profile information and keep your account secure.
        </Text>
      </header>

      <div className={styles.grid}>
        <Card className={styles.card}>
          <Text variant="headline-md" as="h2">
            Email address
          </Text>

          <form className={styles.form} onSubmit={handleEmailSubmit} noValidate>
            <FormField
              label={
                <Label htmlFor="account-email" variant="muted">
                  Email
                </Label>
              }
            >
              <Input
                id="account-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                state={emailError ? "error" : "default"}
              />
            </FormField>

            {emailError ? (
              <Text variant="label-md" color="danger">
                {emailError}
              </Text>
            ) : null}

            {emailSuccess ? (
              <Text variant="label-md" color="success">
                {emailSuccess}
              </Text>
            ) : null}

            <Button type="submit" variant="primary" size="md" disabled={isEmailSubmitting}>
              {isEmailSubmitting ? "Saving…" : "Save email"}
            </Button>
          </form>
        </Card>

        <Card className={styles.card}>
          <Text variant="headline-md" as="h2">
            Password
          </Text>

          <form className={styles.form} onSubmit={handlePasswordSubmit} noValidate>
            <FormField
              label={
                <Label htmlFor="current-password" variant="muted">
                  Current password
                </Label>
              }
            >
              <PasswordInput
                id="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                state={passwordError ? "error" : "default"}
              />
            </FormField>

            <FormField
              label={
                <Label htmlFor="new-password" variant="muted">
                  New password
                </Label>
              }
            >
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                state={passwordError ? "error" : "default"}
              />
            </FormField>

            <FormField
              label={
                <Label htmlFor="confirm-password" variant="muted">
                  Confirm new password
                </Label>
              }
            >
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                state={passwordError ? "error" : "default"}
              />
            </FormField>

            {passwordError ? (
              <Text variant="label-md" color="danger">
                {passwordError}
              </Text>
            ) : null}

            {passwordSuccess ? (
              <Text variant="label-md" color="success">
                {passwordSuccess}
              </Text>
            ) : null}

            <Button type="submit" variant="primary" size="md" disabled={isPasswordSubmitting}>
              {isPasswordSubmitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
