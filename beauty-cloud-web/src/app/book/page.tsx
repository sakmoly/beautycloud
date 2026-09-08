import { BookingWizard } from "@/components/booking/booking-wizard";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";

export const metadata = { title: "Book appointment" };

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ services?: string; c?: string }>;
}) {
  const bootstrap = await getPublicBootstrap();
  const params = await searchParams;
  const initialServices = params.services?.split(",").filter(Boolean) ?? [];
  const initialCategory = params.c ?? null;

  return (
    <BookingWizard
      bootstrap={bootstrap}
      initialSelectedServices={initialServices}
      initialCategory={initialCategory}
    />
  );
}
