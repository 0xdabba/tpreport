import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { firm: { select: { id: true, name: true, plan: true } } },
        });

        if (!user) {
          throw new Error("No account found with this email");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          firm: user.firm.name,
          firmId: user.firmId,
          firmRole: user.firmRole,
          role: user.role,
        } as {
          id: string;
          name: string | null;
          email: string;
          firm: string;
          firmId: string;
          firmRole: string;
          role: string;
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as {
          id: string;
          firm?: string | null;
          firmId?: string;
          firmRole?: string;
          role?: string;
        };
        token.id = u.id;
        token.firm = u.firm;
        token.firmId = u.firmId;
        token.firmRole = u.firmRole;
        token.role = u.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const su = session.user as {
          id?: string;
          firm?: string | null;
          firmId?: string;
          firmRole?: string;
          role?: string;
        };
        su.id = token.id as string;
        su.firm = token.firm as string | null;
        su.firmId = token.firmId as string;
        su.firmRole = token.firmRole as string;
        su.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
