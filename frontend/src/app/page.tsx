import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import SignOutButton from "@/components/common/SignOutButton"

export default async function Home() {
  const session = await auth()

  if (!session) {
    redirect('/signin')
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Welcome, {session.user?.name}!</h1>
      <p className="mb-4">Your User ID: {session.user?.id}</p>
      <p className="mb-4">Your JWT Token: {session.user?.token}</p>
      <SignOutButton />
    </div>
  )
}
