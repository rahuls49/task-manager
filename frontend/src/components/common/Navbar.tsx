"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { User, ChevronDown } from "lucide-react"
import { Button } from "../ui/button";
import SignOutButton from "./SignOutButton";
import { useSession } from "next-auth/react";

export default function Navbar() {
    const { data: session, status } = useSession();
    
    // Don't render anything while loading
    if (status === "loading") return null;
    return (
        session ? <nav className="bg-slate-50 flex justify-end px-10">
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="flex items-center gap-2 px-3 py-2 h-auto hover:bg-gray-50 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    >
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-sm">
                                {session?.user?.email}
                            </AvatarFallback>
                        </Avatar>
                        <span className="hidden sm:block text-sm font-medium">
                            {session?.user?.name}
                        </span>
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className="w-56"
                    sideOffset={5}
                    style={{ zIndex: 9999 }}
                >
                    <div className="flex items-center gap-2 p-2">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-sm">
                                {session?.user?.email}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <p className="text-sm font-medium">
                                {session?.user?.name}
                            </p>
                        </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link
                            href="/my-profile"
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <User className="h-4 w-4" />
                            My Profile
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <SignOutButton />
                </DropdownMenuContent>
            </DropdownMenu>
        </nav> : null
    )
}