import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      checks: ["none"],
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send"
        }
      }
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session?.user && user) {
        session.user.id = user.id;
      }
      return session;
    }
  },
  debug: true,
  trustHost: true,
})
