import { AuthScreen } from "@/features/auth";

export const metadata = { title: "Log in · Fireflies.ai Clone" };

export default function LoginPage() {
  return <AuthScreen mode="login" />;
}
