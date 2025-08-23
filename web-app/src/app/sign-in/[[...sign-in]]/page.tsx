"use client"
import * as Clerk from "@clerk/elements/common"
import * as SignIn from "@clerk/elements/sign-in"
import { Button } from "@/components/ui/button"
import { Loader, CheckCircle } from "lucide-react"
import Image from "next/image"
import { Google } from "@/components/icons/icon"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { ConvexProvider, useConvex, ConvexReactClient } from "convex/react"
import { api } from "../../../../convex/_generated/api"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const convexClient = useConvex();
  const [isElectronAuth, setIsElectronAuth] = useState(false);
  const [electronAppId, setElectronAppId] = useState<string | null>(null);
  const [authComplete, setAuthComplete] = useState(false);

  useEffect(() => {
    const electronApp = searchParams.get("electronApp");
    const appId = searchParams.get("appId");
    
    if (electronApp === "true" && appId) {
      setIsElectronAuth(true);
      setElectronAppId(appId);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleElectronAuth = async () => {
      if (isLoaded && user && isElectronAuth && electronAppId && !authComplete) {
        try {
          // Create or update user in Convex
          const userId = await convexClient.mutation(api.auth.upsertUser, {
            clerkId: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            name: user.fullName || user.firstName || undefined,
            imageUrl: user.imageUrl,
          });

          // Create auth session for Electron app
          const { sessionToken } = await convexClient.mutation(api.auth.createAuthSession, {
            clerkId: user.id,
            electronAppId,
          });

          // Store the session for the electron app to retrieve
          await fetch("/api/electron-auth-store", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              electronAppId,
              sessionToken,
              user: {
                id: user.id,
                email: user.primaryEmailAddress?.emailAddress,
                name: user.fullName || user.firstName,
                imageUrl: user.imageUrl,
              },
            }),
          });

          setAuthComplete(true);

          // Show success message and redirect
          setTimeout(() => {
            router.push("/dashboard?electronAuth=success");
          }, 1500);
        } catch (error) {
          console.error("Error handling electron auth:", error);
        }
      } else if (isLoaded && user && !isElectronAuth) {
        // Normal sign-in flow
        router.push("/dashboard");
      }
    };

    handleElectronAuth();
  }, [isLoaded, user, isElectronAuth, electronAppId, convexClient, router, authComplete]);

  if (authComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500" />
          <h2 className="text-2xl font-semibold">Successfully Authenticated!</h2>
          <p className="text-gray-600">Launching 1984 Desktop App...</p>
          <p className="text-sm text-gray-500">You can close this window</p>
        </div>
      </div>
    );
  }

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

                        {isElectronAuth && (
                          <div className="text-center space-y-2">
                            <p className="text-sm text-gray-600">Sign in to connect your desktop app</p>
                          </div>
                        )}

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
  );
}

export default function SignInPage() {
  return (
    <ConvexProvider client={convex}>
      <SignInContent />
    </ConvexProvider>
  );
}
