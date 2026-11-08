import { NavLink } from 'react-router-dom'

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z"
      stroke={active ? '#3263FE' : '#9CA3AF'}
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
)

const ComposeIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M11 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H19C19.5523 21 20 20.5523 20 20V13"
      stroke={active ? '#3263FE' : '#9CA3AF'}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M17.5 2.5L21.5 6.5L12 16H8V12L17.5 2.5Z"
      stroke={active ? '#3263FE' : '#9CA3AF'}
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
)

const FriendsIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="4" stroke={active ? '#3263FE' : '#9CA3AF'} strokeWidth="1.8" />
    <path
      d="M4 20C4 17 7.58172 14 12 14C16.4183 14 20 17 20 20"
      stroke={active ? '#3263FE' : '#9CA3AF'}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
)

const SettingsIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" stroke={active ? '#3263FE' : '#9CA3AF'} strokeWidth="1.8" />
    <path
      d="M12 2V4M12 20V22M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07M2 12H4M20 12H22M4.93 19.07L6.34 17.66M17.66 6.34L19.07 4.93"
      stroke={active ? '#3263FE' : '#9CA3AF'}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
)

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex items-center justify-around px-8 z-50">
      <NavLink to="/home" end className="flex items-center justify-center p-2">
        {({ isActive }) => <HomeIcon active={isActive} />}
      </NavLink>
      <NavLink to="/compose" className="flex items-center justify-center p-2">
        {({ isActive }) => <ComposeIcon active={isActive} />}
      </NavLink>
      <NavLink to="/friends" className="flex items-center justify-center p-2">
        {({ isActive }) => <FriendsIcon active={isActive} />}
      </NavLink>
      <NavLink to="/settings" className="flex items-center justify-center p-2">
        {({ isActive }) => <SettingsIcon active={isActive} />}
      </NavLink>
    </nav>
  )
}
