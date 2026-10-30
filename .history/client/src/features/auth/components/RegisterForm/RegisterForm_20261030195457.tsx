import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    BrandLogo,
    Button,
    FormField,
    Input,
    Label,
    PasswordInput,
    Spacer,
    Text,
} from "../../../../design-system";
import { useAuth } from "../../../../context/AuthContext";
import styles from "./RegisterForm.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterForm() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    function validateForm() {
        const name = form.name.trim();
        const email = form.email.trim();

        if (!name) {
            return "Full name is required.";
        }

        if (!email) {
            return "Email is required.";
        }

        if (!EMAIL_PATTERN.test(email)) {
            return "Please enter a valid email address.";
        }

        if (form.password.length < 8) {
            return "Password must be at least 8 characters long.";
        }

        if (new TextEncoder().encode(form.password).length > 72) {
            return "Password must be 72 bytes or fewer.";
        }

        if (!form.confirmPassword) {
            return "Please confirm your password.";
        }

        if (form.password !== form.confirmPassword) {
            return "Passwords do not match.";
        }

        return "";
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);

        try {
            await register(form.name.trim(), form.email.trim().toLowerCase(), form.password);
            navigate("/", { replace: true });
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Unable to create your account.";
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <div className={styles.brand}>
                <BrandLogo />
            </div>

            <header className={styles.header}>
                <Text variant="headline-lg" className={styles.title}>
                    Create your account
                </Text>
                <Text variant="label-md" color="secondary">
                    Join Ali-Mama in a few easy steps
                </Text>
            </header>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
                <FormField
                    label={
                        <Label htmlFor="name" variant="muted">
                            Full name
                        </Label>
                    }
                >
                    <Input
                        id="name"
                        type="text"
                        name="name"
                        autoComplete="name"
                        placeholder="Enter your full name"
                        value={form.name}
                        onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                        state={error ? "error" : "default"}
                        required
                    />
                </FormField>

                <FormField
                    label={
                        <Label htmlFor="email" variant="muted">
                            Email
                        </Label>
                    }
                >
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        autoComplete="email"
                        placeholder="Enter your email"
                        value={form.email}
                        onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                        state={error ? "error" : "default"}
                        required
                    />
                </FormField>

                <div className={styles.passwordField}>
                    <Label htmlFor="password" variant="muted">
                        Password
                    </Label>
                    <PasswordInput
                        id="password"
                        name="password"
                        autoComplete="new-password"
                        placeholder="Create a password"
                        value={form.password}
                        onChange={(e) =>
                            setForm((current) => ({ ...current, password: e.target.value }))
                        }
                        state={error ? "error" : "default"}
                        required
                    />
                </div>

                <div className={styles.passwordField}>
                    <Label htmlFor="confirmPassword" variant="muted">
                        Confirm password
                    </Label>
                    <PasswordInput
                        id="confirmPassword"
                        name="confirmPassword"
                        autoComplete="new-password"
                        placeholder="Re-enter your password"
                        value={form.confirmPassword}
                        onChange={(e) =>
                            setForm((current) => ({ ...current, confirmPassword: e.target.value }))
                        }
                        state={error ? "error" : "default"}
                        required
                    />
                </div>

                <Spacer size="xs" />

                {error ? (
                    <Text variant="label-md" color="danger" className={styles.error}>
                        {error}
                    </Text>
                ) : null}

                <Button type="submit" variant="primary" size="md" fullWidth disabled={isSubmitting}>
                    {isSubmitting ? "Creating account…" : "Create account"}
                </Button>

                <div className={styles.footerRow}>
                    <Text variant="label-md" color="secondary">
                        Already have an account?
                    </Text>
                    <Link to="/login" className={styles.link}>
                        Sign in
                    </Link>
                </div>
            </form>
        </>
    );
}
