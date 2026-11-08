import { useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Splash from '@/components/Splash'
import FindInklings from '@/pages/FindInklings'
import Login from '@/pages/Login'
import SignUp from '@/pages/SignUp'
import HomeScreen from '@/pages/HomeScreen'
import Profile from '@/pages/Profile'
import FriendsScreen from '@/pages/FriendsScreen'
import FriendDetailScreen from '@/pages/FriendDetailScreen'
import LettersScreen from '@/pages/ArchiveScreen'
import ReceiptEditor from '@/pages/ReceiptEditor'
import ReceiptSent from '@/pages/ReceiptSent'
import PrintingScreen from '@/pages/PrintingScreen'
import TestPrintScreen from '@/pages/TestPrintScreen'
import AdminScreen from '@/pages/AdminScreen'
import OnboardIntro from '@/pages/onboarding/OnboardIntro'
import OnboardRecipient from '@/pages/onboarding/OnboardRecipient'
import OnboardCompose from '@/pages/onboarding/OnboardCompose'
import OnboardSent from '@/pages/onboarding/OnboardSent'
import VerifyEmail from '@/pages/VerifyEmail'
import Privacy from '@/pages/Privacy'
import Terms from '@/pages/Terms'
import RecipientReceipt from '@/pages/RecipientReceipt'
import ShareRecipient from '@/pages/ShareRecipient'

const SPLASH_SEEN_KEY = 'inklings.splashSeen'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<OnboardIntro />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/find-friends" element={<FindInklings />} />
        <Route path="/home" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/friends" element={<ProtectedRoute><FriendsScreen /></ProtectedRoute>} />
        <Route path="/friends/:id" element={<ProtectedRoute><FriendDetailScreen /></ProtectedRoute>} />
        <Route path="/archive" element={<ProtectedRoute><LettersScreen /></ProtectedRoute>} />
        <Route path="/letters" element={<ProtectedRoute><LettersScreen /></ProtectedRoute>} />
        <Route path="/compose" element={<ProtectedRoute><ReceiptEditor /></ProtectedRoute>} />
        <Route path="/receipt-sent" element={<ProtectedRoute><ReceiptSent /></ProtectedRoute>} />
        <Route path="/prints" element={<ProtectedRoute><PrintingScreen /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminScreen /></ProtectedRoute>} />
        <Route path="/test-print" element={<TestPrintScreen />} />
        <Route path="/onboard" element={<OnboardIntro />} />
        <Route path="/onboard/compose" element={<ProtectedRoute><OnboardCompose /></ProtectedRoute>} />
        <Route path="/onboard/recipient" element={<ProtectedRoute><OnboardRecipient /></ProtectedRoute>} />
        <Route path="/onboard/sent" element={<OnboardSent />} />
        <Route path="/onboard/verify-email" element={<ProtectedRoute><VerifyEmail /></ProtectedRoute>} />
        <Route path="*" element={<OnboardIntro />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/r/:id" element={<RecipientReceipt />} />
        <Route path="/share/recipient" element={<ProtectedRoute><ShareRecipient /></ProtectedRoute>} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  const [showSplash, setShowSplash] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(SPLASH_SEEN_KEY) !== '1',
  )

  const handleSplashComplete = () => {
    sessionStorage.setItem(SPLASH_SEEN_KEY, '1')
    setShowSplash(false)
  }

  return (
    <BrowserRouter>
      <div className="md:flex md:justify-center md:min-h-screen">
        <div className="md:w-[max(24rem,35vw)]">
          {showSplash && <Splash onComplete={handleSplashComplete} />}
          <AuthProvider>
            <AnimatedRoutes />
          </AuthProvider>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
