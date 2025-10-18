"use client"

import { signOut } from "next-auth/react"
import { DropdownMenuItem } from "../ui/dropdown-menu"

export default function SignOutButton() {
  return (
    <DropdownMenuItem
      onClick={() => signOut()}
      className="flex items-center gap-2 cursor-pointer bg-red-600 focus:bg-red-600 text-white text-center"
    >
      Sign Out
    </DropdownMenuItem>
  )
}