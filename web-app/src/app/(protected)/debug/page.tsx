"use client"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useUser } from "@clerk/nextjs"
import { useConvexAuth } from "convex/react"

export default function DebugPage() {
  const { user: clerkUser } = useUser()
  const { isAuthenticated } = useConvexAuth()
  
  const allUsers = useQuery(api.debug.listAllUsers)
  const electronSessions = useQuery(api.debug.listElectronSessions)
  const currentUser = useQuery(api.users.getCurrentUser)

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Dashboard</h1>
      
      <div className="space-y-6">
        {/* Authentication Status */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
          <p>Clerk User: {clerkUser ? `${clerkUser.fullName} (${clerkUser.id})` : 'Not signed in'}</p>
          <p>Convex Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
          <p>Current User in DB: {currentUser ? `${currentUser.name} (${currentUser._id})` : 'Not found'}</p>
        </div>

        {/* All Users */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">All Users in Database</h2>
          {allUsers ? (
            <div className="space-y-2">
              {allUsers.length === 0 ? (
                <p>No users found</p>
              ) : (
                allUsers.map((user) => (
                  <div key={user.id} className="bg-white p-2 rounded text-sm">
                    <p><strong>ID:</strong> {user.id}</p>
                    <p><strong>Name:</strong> {user.name || 'N/A'}</p>
                    <p><strong>Email:</strong> {user.email || 'N/A'}</p>
                    <p><strong>Token:</strong> {user.tokenIdentifier || 'N/A'}</p>
                    <p><strong>Clerk ID:</strong> {user.clerkId || 'N/A'}</p>
                    <p><strong>Electron Linked:</strong> {user.electronAppLinked ? 'Yes' : 'No'}</p>
                    <p><strong>Last Auth:</strong> {user.lastAuthenticatedAt ? new Date(user.lastAuthenticatedAt).toLocaleString() : 'N/A'}</p>
                  </div>
                ))
              )}
            </div>
          ) : (
            <p>Loading...</p>
          )}
        </div>

        {/* Electron Sessions */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Electron Sessions</h2>
          {electronSessions ? (
            <div className="space-y-2">
              {electronSessions.length === 0 ? (
                <p>No sessions found</p>
              ) : (
                electronSessions.map((session) => (
                  <div key={session.id} className="bg-white p-2 rounded text-sm">
                    <p><strong>App ID:</strong> {session.electronAppId}</p>
                    <p><strong>User ID:</strong> {session.userId || 'N/A'}</p>
                    <p><strong>Active:</strong> {session.isActive ? 'Yes' : 'No'}</p>
                    <p><strong>Created:</strong> {session.createdAt ? new Date(session.createdAt).toLocaleString() : 'N/A'}</p>
                    <p><strong>Expires:</strong> {session.expiresAt ? new Date(session.expiresAt).toLocaleString() : 'N/A'}</p>
                  </div>
                ))
              )}
            </div>
          ) : (
            <p>Loading...</p>
          )}
        </div>
      </div>
    </div>
  )
}
