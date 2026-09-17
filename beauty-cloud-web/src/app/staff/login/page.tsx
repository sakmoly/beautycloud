import { StaffLoginForm } from "@/components/layout/staff-login-form";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";

export default async function StaffLoginPage() {
  const bootstrap = await getPublicBootstrap();
  const appTitle = bootstrap.application_title ?? "Beauty Cloud";
  const companyName =
    bootstrap.branding?.company_display_name ??
    bootstrap.company_display_name ??
    bootstrap.company ??
    appTitle;

  return (
    <StaffLoginForm
      branding={bootstrap.branding}
      appTitle={appTitle}
      companyName={companyName}
    />
  );
}
