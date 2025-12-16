import NextAuth, { DefaultSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface User {
    id: string
    token: string
    roles?: string[]
    permissions?: string[]
  }
  interface Session {
    user: {
      id: string
      token: string
      roles: string[]
      permissions: string[]
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    token?: string
    roles?: string[]
    permissions?: string[]
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        emailOrPhone: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.emailOrPhone || !credentials?.password) {
          return null
        }

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              emailOrPhone: credentials.emailOrPhone,
              password: credentials.password,
            }),
          })

          if (!response.ok) {
            return null
          }

          const data = await response.json()

          // API returns: { user: { id, email, name, roles, permissions }, token: "jwt_token" }
          if (data.user && data.token) {
            return {
              id: String(data.user.id),
              email: data.user.email,
              name: data.user.name,
              token: data.token,
              // Include roles and permissions from backend
              roles: data.user.roles || ['General'],
              permissions: data.user.permissions || [],
            }
          }

          return null
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.token = user.token
        token.roles = user.roles || ['General']
        token.permissions = user.permissions || []
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = (token.id as string) || ''
      session.user.token = (token.token as string) || ''
      session.user.roles = (token.roles as string[]) || ['General']
      session.user.permissions = (token.permissions as string[]) || []
      return session
    }
  },
  pages: {
    signIn: '/signin',
  },
  trustHost: true,
})