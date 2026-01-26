import { redirect } from "next/navigation";

export default function Page() {
  // Root route should not render UI in this app.
  // Redirect users to the real entry point.
  redirect("/login");
}
