"use client"
import * as Clerk from "@clerk/elements/common"
import * as SignIn from "@clerk/elements/sign-in"
import { Button } from "@/components/ui/button"
import { Loader, CheckCircle } from "lucide-react"
import Image from "next/image"
import { Google } from "@/components/icons/icon"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth, useUser } from "@clerk/nextjs"
import { ConvexProvider, useConvex, ConvexReactClient } from "convex/react"
import { api } from "../../../../convex/_generated/api"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
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
      console.log("handleElectronAuth called:", { 
        isLoaded, 
        hasUser: !!user, 
        isElectronAuth, 
        electronAppId, 
        authComplete 
      });
      
      if (isLoaded && user && isElectronAuth && electronAppId && !authComplete) {
        try {
          console.log("Starting electron auth flow for:", electronAppId);
          
          // Get JWT token from Clerk
          const token = await getToken();
          
          if (!token) {
            console.error("Failed to get JWT token from Clerk");
            return;
          }
          
          console.log("Got JWT token from Clerk");
          
          // Create or update user in Convex
          const userId = await convexClient.mutation(api.auth.upsertUser, {
            clerkId: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            name: user.fullName || user.firstName || undefined,
            imageUrl: user.imageUrl,
          });
          console.log("User upserted in Convex:", userId);

          // Store the JWT token with the electron app ID for retrieval
          const { success } = await convexClient.mutation(api.auth.storeElectronAuth, {
            electronAppId,
            jwtToken: token,
            clerkId: user.id,
          });
          console.log("JWT token stored for electron app:", success);

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
