import person1 from '@/assets/avatars/person1.svg'
import person2 from '@/assets/avatars/person2.svg'
import person3 from '@/assets/avatars/person3.svg'
import person5 from '@/assets/avatars/person5.svg'

const AVATARS = { 1: person1, 2: person2, 3: person3, 5: person5 } as const

interface AvatarProps {
  avatarId: 1 | 2 | 3 | 5
  size?: number
  className?: string
}

export default function Avatar({ avatarId, size = 56, className = '' }: AvatarProps) {
  return (
    <img
      src={AVATARS[avatarId]}
      width={size}
      height={size}
      alt=""
      className={className}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  )
}
