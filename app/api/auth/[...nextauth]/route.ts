import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";

// Vercel provides VERCEL_URL automatically for preview and production deployments.
// Use it when NEXTAUTH_URL has not been configured explicitly.
if (!process.env.NEXTAUTH_URL && process.env.VERCEL_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
