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
import { useConvexAuth, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

export default function SignInPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const linkElectronApp = useMutation(api.electronAuth.linkElectronApp);
  const storeUser = useMutation(api.users.store);
  
  const [isElectronAuth, setIsElectronAuth] = useState(false);
  const [electronAppId, setElectronAppId] = useState<string | null>(null);
  const [authComplete, setAuthComplete] = useState(false);

  useEffect(() => {
    const electronApp = searchParams.get("electronApp");
    const appId = searchParams.get("appId");
    
    if (electronApp === "true" && appId) {
      setIsElectronAuth(true);
      setElectronAppId(appId);
      console.log("Electron auth detected with app ID:", appId);
    }
  }, [searchParams]);

  // Track if we've already processed this auth
  const [authProcessed, setAuthProcessed] = useState(false);

  useEffect(() => {
    const handleAuth = async () => {
      // Prevent double processing
      if (authProcessed) return;
      
      // Must have: Clerk loaded, user signed in, Convex authenticated
      if (!isLoaded || !user || !isAuthenticated) {
        return;
      }
      
      console.log("Auth ready - User:", user.id, "Electron:", isElectronAuth, "AppId:", electronAppId);
      
      // Mark as processed to prevent double execution
      setAuthProcessed(true);
      
      if (isElectronAuth && electronAppId) {
        try {
          // Simple: just link the electron app to the authenticated user
          console.log("Linking electron app:", electronAppId);
          await linkElectronApp({ electronAppId });
          console.log("Electron app linked successfully!");
          
          setAuthComplete(true);
          
          // Show success and redirect
          setTimeout(() => {
            router.push("/dashboard");
          }, 1500);
        } catch (error) {
          console.error("Failed to link electron app:", error);
          // Still redirect to dashboard
          router.push("/dashboard");
        }
      } else {
        // Normal web sign-in - just store user and go to dashboard
        try {
          await storeUser();
          router.push("/dashboard");
        } catch (error) {
          console.error("Error storing user:", error);
          router.push("/dashboard");
        }
      }
    };

    handleAuth();
  }, [isLoaded, isAuthenticated, user, isElectronAuth, electronAppId, linkElectronApp, storeUser, router, authProcessed]);

  if (authComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Image src="/logo.svg" alt="1984" width={220} height={100} /> 
          <h2 className="text-2xl font-semibold">Successfully Authenticated!</h2>
          <p className="text-gray-600">Launching 1984...</p>
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
                                    <Loader className="animate-spin w-4 h-4" />
                                  ) : (
                                    <>
                                      <Google className="w-4 h-4" />
                                      Sign in with Google
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
                )}
              </Clerk.Loading>
            </SignIn.Root>
          </div>
        </div>
      </div>
    </div>
  );
}