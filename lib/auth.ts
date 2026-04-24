import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "./prisma"
import { isAdmin } from "./admin"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase()
        const password = credentials?.password
        if (!email || !password) return null
        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        })
        if (!user) return null
        const valid = await compare(password, user.passwordHash)
        if (!valid) return null
        return {
          id: user.id,
          email: user.email,
          name: user.raisonSociale || user.email,
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/connexion",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.isAdmin = isAdmin({ user: { email: token.email as string } } as Parameters<typeof isAdmin>[0])
      }
      return session
    },
  },
}
