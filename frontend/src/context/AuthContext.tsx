import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  User,
  getAdminToken,
  getUserToken,
  setAdminToken,
  setUserToken,
  adminLoginApi,
  userLoginApi,
  userRegisterApi,
  getUserMeApi,
} from '../services/api'

interface AdminUser {
  id: string
  username: string
}

interface AuthContextType {
  user: User | null
  admin: AdminUser | null
  loading: boolean
  loginAdmin: (u: string, p: string) => Promise<void>
  logoutAdmin: () => void
  loginUser: (e: string, p: string) => Promise<void>
  registerUser: (data: { name: string; email: string; password: string; phone?: string }) => Promise<void>
  logoutUser: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const adminTok = getAdminToken()
      if (adminTok) {
        setAdmin({ id: '1', username: 'admin' })
      }

      const userTok = getUserToken()
      if (userTok) {
        try {
          const profile = await getUserMeApi()
          setUser(profile)
        } catch {
          setUserToken(null)
          setUser(null)
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const loginAdmin = async (u: string, p: string) => {
    const data = await adminLoginApi(u, p)
    setAdmin(data.admin)
  }

  const logoutAdmin = () => {
    setAdminToken(null)
    setAdmin(null)
  }

  const loginUser = async (e: string, p: string) => {
    const data = await userLoginApi(e, p)
    setUser(data.user)
  }

  const registerUser = async (data: { name: string; email: string; password: string; phone?: string }) => {
    const resData = await userRegisterApi(data)
    setUser(resData.user)
  }

  const logoutUser = () => {
    setUserToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        admin,
        loading,
        loginAdmin,
        logoutAdmin,
        loginUser,
        registerUser,
        logoutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
