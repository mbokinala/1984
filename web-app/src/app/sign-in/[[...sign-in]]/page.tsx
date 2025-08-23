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
  const storeUser = useMutation(api.users.store);
  const linkElectronApp = useMutation(api.electronAuth.linkElectronApp);
  
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

  useEffect(() => {
    const handleAuth = async () => {
      // Wait for Clerk to load and user to be authenticated
      if (!isLoaded || !user) return;
      
      // Wait for Convex to be authenticated
      if (!isAuthenticated) {
        console.log("Waiting for Convex authentication...");
        return;
      }
      
      if (isElectronAuth && electronAppId) {
        try {
          console.log("Starting electron auth flow for:", electronAppId);
          console.log("User authenticated:", user.id);
          
          // Store user in Convex first
          const userId = await storeUser();
          console.log("User stored in Convex with ID:", userId);

          // Link electron app to user - this will create/update the session
          await linkElectronApp({ electronAppId });
          console.log("Electron app linked successfully");

          setAuthComplete(true);

          // Redirect after showing success
          setTimeout(() => {
            router.push("/dashboard?electronAuth=success");
          }, 1500);
        } catch (error) {
          console.error("Error handling electron auth:", error);
          // Still try to redirect on error
          setTimeout(() => {
            router.push("/dashboard?electronAuth=error");
          }, 1500);
        }
      } else if (!isElectronAuth) {
        // Normal sign-in flow
        try {
          const userId = await storeUser();
          console.log("User stored in Convex with ID:", userId);
          router.push("/dashboard");
        } catch (error) {
          console.error("Error storing user:", error);
          router.push("/dashboard");
        }
      }
    };

    handleAuth();
  }, [isLoaded, isAuthenticated, user, isElectronAuth, electronAppId, storeUser, linkElectronApp, router]);

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

                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-background px-2 text-muted-foreground">
                                Or continue with
                              </span>
                            </div>
                          </div>

                          <Clerk.Field name="identifier" className="space-y-2">
                            <Clerk.Label className="text-sm font-medium">
                              Email address
                            </Clerk.Label>
                            <Clerk.Input
                              type="email"
                              className="w-full px-3 py-2 border rounded-md"
                              required
                            />
                            <Clerk.FieldError className="text-xs text-red-600" />
                          </Clerk.Field>

                          <SignIn.Action submit asChild>
                            <Button
                              className="w-full"
                              disabled={isGlobalLoading}
                            >
                              <Clerk.Loading>
                                {(isLoading: boolean) =>
                                  isLoading ? (
                                    <Loader className="animate-spin" />
                                  ) : (
                                    "Continue"
                                  )
                                }
                              </Clerk.Loading>
                            </Button>
                          </SignIn.Action>
                        </div>
                      </div>
                    </SignIn.Step>

                    <SignIn.Step name="verifications">
                      <SignIn.Strategy name="email_code">
                        <div className="space-y-6">
                          <div className="space-y-1 flex justify-center">
                            <Image src="/logo.svg" alt="1984" width={220} height={100} /> 
                          </div>
                          
                          <div className="text-center space-y-2">
                            <h1 className="text-2xl font-semibold">Check your email</h1>
                            <p className="text-sm text-muted-foreground">
                              We sent a code to <SignIn.SafeIdentifier />
                            </p>
                          </div>

                          <Clerk.Field name="code" className="space-y-2">
                            <Clerk.Label className="text-sm font-medium">
                              Verification code
                            </Clerk.Label>
                            <Clerk.Input
                              type="otp"
                              className="w-full px-3 py-2 border rounded-md text-center"
                              required
                            />
                            <Clerk.FieldError className="text-xs text-red-600" />
                          </Clerk.Field>

                          <SignIn.Action submit asChild>
                            <Button className="w-full" disabled={isGlobalLoading}>
                              Continue
                            </Button>
                          </SignIn.Action>
                        </div>
                      </SignIn.Strategy>
                    </SignIn.Step>
                  </>
                )}
              </Clerk.Loading>
            </SignIn.Root>
          </div>
        </div>
      </div>

      {/* Right side - Hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 bg-black text-white p-8 min-h-screen items-center justify-center">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold mb-4">Welcome to 1984</h1>
          <p className="text-lg opacity-90">
            Your AI-powered screen recording assistant that helps you remember everything.
          </p>
        </div>
      </div>
    </div>
  );
}