import type { Friend, Receipt } from '@/types/app'

export const FRIENDS: Friend[] = [
  { id: 'carmah', name: 'Carmah Hawwari', address: '459 Lagunita Dr, 94305', avatarId: 1 },
  { id: 'matthew', name: 'Matthew Guck', address: '459 Lagunita Dr, 94305', avatarId: 3 },
  { id: 'lucy', name: 'Lucy Loughdrige', address: '459 Lagunita Dr, 94305', avatarId: 2 },
  { id: 'sophie', name: 'Sophie Cline', address: '459 Lagunita Dr, 94305', avatarId: 5 },
]

export const RECEIPTS: Receipt[] = [
  {
    id: 'r1',
    date: 'April 16, 2026',
    to: 'Carmah',
    from: 'Matthew',
    prompt: 'What was the best part of your day yesterday?',
    content:
      'The class presidents got to taste test the menu for Senior Dinner on the Quad. I wish you could\'ve tasted the sushi. it was MAGNIFICENT!! We had dim sum and Thai coconut curry. Can\'t wait for you to try all the yummy stuff, I think you\'ll love the green beans.',
    friendId: 'carmah',
  },
  {
    id: 'r2',
    date: 'April 11, 2026',
    to: 'Carmah',
    from: 'Matthew',
    prompt: 'What is something you have been thankful for recently?',
    content:
      'I have been so thankful for Pierre lately. I look up to him in so many little ways. He always reminding me how to be confident and be myself.',
    friendId: 'carmah',
  },
  {
    id: 'r3',
    date: 'April 14, 2026',
    to: 'Carmah',
    from: 'Matthew',
    content: 'Just found this old photo and thought you would want to have it. #SCHIFF4LIFE',
    friendId: 'carmah',
  },
  {
    id: 'r4',
    date: 'April 4, 2026',
    to: 'Carmah',
    from: 'Matthew',
    content: 'Happy birthday! Happy birthday! Happy birthday! Happy birthday! Happy birthday!',
    friendId: 'carmah',
  },
  {
    id: 'r5',
    date: 'April 10, 2026',
    to: 'Matthew',
    from: 'Carmah',
    prompt: 'What made you smile today?',
    content: 'Seeing you across the quad and knowing you were thinking of me too.',
    friendId: 'matthew',
  },
  {
    id: 'r6',
    date: 'April 7, 2026',
    to: 'Lucy',
    from: 'Matthew',
    prompt: 'Tell me something you\'ve been excited about.',
    content: 'I finally finished the painting I\'ve been working on for three weeks. It\'s not perfect but it\'s mine.',
    friendId: 'lucy',
  },
  {
    id: 'r7',
    date: 'April 3, 2026',
    to: 'Sophie',
    from: 'Matthew',
    content: 'Thinking of you! Hope your week is full of good surprises.',
    friendId: 'sophie',
  },
]

export const PENDING_COUNT = 2
