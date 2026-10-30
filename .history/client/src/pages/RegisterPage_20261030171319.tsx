import { RegisterForm } from "../features/auth/components/RegisterForm/RegisterForm";
import { AuthLayout } from "../layouts/AuthLayout/AuthLayout";

export default function RegisterPage() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  );
}
