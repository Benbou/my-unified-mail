import { MailLayout } from "@/components/mail-layout";
import { getUnifiedEmails } from "@/lib/email";

export default async function Home() {
  const emails = await getUnifiedEmails();

  return <MailLayout emails={emails} />;
}
