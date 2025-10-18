import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await auth()

  if (!session) {
    redirect('/signin')
  }
  console.log("User=", session.user)
  return (
    <div className="p-8 w-screen bg-red-50 ">
      <h1 className="text-2xl font-bold mb-4">Welcome, {session.user?.name}!</h1>
      <p className="mb-4">Your User ID: {session.user?.id}</p>
      <p className="mb-4 max-w-full break-words">Your JWT Token: {session.user?.token}</p>
    </div>
  )
}
