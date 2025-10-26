'use client' // Error boundaries must be Client Components
 
import { useEffect } from 'react'
 import { signOut } from "next-auth/react"
import { Button } from '@/components/ui/button'
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])
 
  return (
    <div className='h-[90vh] flex items-center justify-center flex-col gap-4 '>
      <h2 className='font-semibold text-3xl'>Something went wrong!</h2>
      <p>Please logout and login again.</p>
      <Button onClick={() => signOut()}>Log Out</Button>
    </div>
  )
}