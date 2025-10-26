import NextAuth, { DefaultSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

declare module "next-auth" {
  interface User {
    token: string
  }
  interface Session {
    user: {
      token: string
    } & DefaultSession["user"]
  }
  interface JWT {
    token: string
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        userId: { label: "User ID", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.userId || !credentials?.password) {
          return null
        }

        try {
          // Replace 'YOUR_CUSTOM_API_ENDPOINT' with your actual API endpoint
          // Example: 'https://your-api.com/auth/login'
          const response = await fetch(`${process.env.API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: credentials.userId,
              password: credentials.password,
            }),
          })

          if (!response.ok) {
            return null
          }

          const data = await response.json()

          // Assuming your API returns { user: { id, email, name }, token: "jwt_token" }
          // Adjust according to your API response structure
          if (data.user && data.token) {
            return {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              // Store the JWT token in the user object
              token: data.token,
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
        token.token = user.token
      }
      return token
    },
    async session({ session, token }) {
      session.user.token = token.token as string
      return session
    }
  },
  pages: {
    signIn: '/signin', // Customize if you have a sign-in page
  },
  trustHost: true,
})