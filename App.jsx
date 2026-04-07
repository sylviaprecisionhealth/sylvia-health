import { useEffect, useState } from 'react'
import AdminApp from './AdminApp.jsx'
import UserApp from './UserApp.jsx'

export default function App() {
  const isAdmin = window.location.pathname.startsWith('/admin')
  return isAdmin ? <AdminApp /> : <UserApp />
}
