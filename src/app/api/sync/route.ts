import { syncEmails } from '@/lib/email';

export async function GET() {
  const emails = await syncEmails();
  return Response.json(emails);
}
