"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import toast from "react-hot-toast"

export default function SignIn() {
    const [emailOrPhone, setEmailOrPhone] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        const result = await signIn("credentials", {
            emailOrPhone,
            password,
            redirect: false,
        })

        if (result?.error) {
            toast.error("Invalid Email/Phone or Password")
            setError("Invalid credentials")
            console.error(result?.error)
        } else {
            toast.success("Signed in successfully")
            router.push("/")
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center">
            <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-center">Sign In</h1>
                {error && <p className="text-red-500 mb-4">{error}</p>}
                <div className="mb-4">
                    <Label htmlFor="emailOrPhone" className="mb-2">Email or Phone</Label>
                    <Input
                        type="text"
                        name="emailOrPhone"
                        value={emailOrPhone}
                        onChange={(e) => setEmailOrPhone(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-4">
                    <Label htmlFor="password" className="mb-2">Password</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required/>
                </div>
                <Button type="submit" className="w-full">
                    Sign In
                </Button>
            </form>
        </div>
    )
}