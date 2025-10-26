"use client"

import { signOut } from "next-auth/react"
import { DropdownMenuItem } from "../ui/dropdown-menu"

export default function SignOutButton() {
  return (
    <DropdownMenuItem
      onClick={() => signOut()}
      className="cursor-pointer bg-red-600 focus:bg-red-600 text-white focus:text-white text-center!"
    >
      Sign Out
    </DropdownMenuItem>
  )
}