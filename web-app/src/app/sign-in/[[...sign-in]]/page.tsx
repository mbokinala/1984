"use client"
import * as Clerk from "@clerk/elements/common"
import * as SignIn from "@clerk/elements/sign-in"
import { Button } from "@/components/ui/button"
import { Loader } from "lucide-react"
import Image from "next/image"
import { Google } from "@/components/icons/icon"

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      {/* Left side - Form */}
      <div className="flex flex-col w-full md:w-1/2 p-8">
        <div className="flex-grow flex items-center justify-center">
          <div className="w-full max-w-[380px]">
            <SignIn.Root>
              <Clerk.Loading>
                {(isGlobalLoading: boolean) => (
                  <>
                    <SignIn.Step name="start">
                      <div className="space-y-6">
                        <div className="space-y-1 flex justify-center">
                          <Image src="/logo.svg" alt="1984" width={220} height={100} /> 
                        </div>

                        <div className="space-y-4 mt-10">
                          <div className="flex justify-center">
                            <Clerk.Connection name="google" asChild>
                              <Button
                                variant="outline"
                                type="button"
                                className="w-4/7 h-8 rounded-xl border border-gray-300 flex items-center justify-center gap-3 bg-transparent"
                                disabled={isGlobalLoading}
                              >
                                <Clerk.Loading scope="provider:google">
                                  {(isLoading: boolean) =>
                                    isLoading ? (
                                      <Loader className="size-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Google className="size-4" />
                                        <span className="text-md font-medium">Sign in with Google</span>
                                      </>
                                    )
                                  }
                                </Clerk.Loading>
                              </Button>
                            </Clerk.Connection>
                            </div>
                        </div>
                      </div>
                    </SignIn.Step>
                  </>
                )}
              </Clerk.Loading>
            </SignIn.Root>
          </div>
        </div>
      </div>
    </div>
  )
}
