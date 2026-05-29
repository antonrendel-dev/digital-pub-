'use client'

import { useState } from 'react'
import Image from 'next/image'

interface SubCardProps {
  type: 'tg' | 'mx' | 'vk'
  icon: React.ReactNode
  title: string
  subscribers: string
  desc: string
  btnColor: string
  url: string
}

function SubCard({ type, icon, title, subscribers, desc, btnColor, url }: SubCardProps) {
  const [subscribed, setSubscribed] = useState(false)

  const bgClass = type === 'tg' ? 'bg-bg-sub-tg' : type === 'mx' ? 'bg-bg-sub-mx' : 'bg-bg-sub-vk'

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block no-underline text-inherit"
    >
      <div className={`${bgClass} rounded-lg p-3 hover:opacity-90 transition`}>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-shrink-0">{icon}</div>
          <div>
            <div className="text-sm font-medium text-text">{title}</div>
            <div className="text-xs text-text-light">{subscribers}</div>
          </div>
        </div>
        <div className="text-xs text-text-muted mb-2">{desc}</div>
        <div
          className={`block w-full text-center py-1.5 rounded-md text-xs font-medium text-white cursor-pointer transition-opacity hover:opacity-85 ${btnColor}`}
          onClick={() => setSubscribed(true)}
        >
          {subscribed ? '✓ Подписан' : 'Подписаться'}
        </div>
      </div>
    </a>
  )
}

const TgIcon = () => (
  <div className="w-8 h-8 bg-brand-tg rounded-full flex items-center justify-center">
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.16 13.947l-2.954-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.982.612z" />
    </svg>
  </div>
)

const MxIcon = () => (
  <Image
    src="/max-app.webp"
    alt="Макс"
    width={36}
    height={36}
    className="rounded-lg"
    style={{ objectFit: 'cover' }}
  />
)

const VkIcon = () => (
  <div
    className="w-8 h-8 rounded-full flex items-center justify-center"
    style={{ background: '#0077ff' }}
  >
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
      <path d="M21.547 7h-3.29a.743.743 0 0 0-.655.392s-1.312 2.416-1.734 3.23C14.734 12.813 14 12.126 14 11.11V7.603A1.104 1.104 0 0 0 12.896 6.5h-2.474a1.982 1.982 0 0 0-1.75.813s1.255-.204 1.255 1.49c0 .42.022 1.626.04 2.64a.73.73 0 0 1-1.272.503 21.54 21.54 0 0 1-2.498-4.543.693.693 0 0 0-.63-.403h-2.99a.508.508 0 0 0-.48.685C3.005 10.175 6.918 18 11.38 18h1.878a.742.742 0 0 0 .742-.742v-1.135a.73.73 0 0 1 1.23-.53l2.247 2.112a1.1 1.1 0 0 0 .746.295h2.953c1.424 0 1.424-.988.647-1.753-.546-.538-2.518-2.617-2.518-2.617a1.02 1.02 0 0 1-.078-1.323c.637-.84 1.68-2.212 2.122-2.8.603-.804 1.697-2.507.197-2.507z" />
    </svg>
  </div>
)

export interface SocialChannel {
  name: string
  url: string
  subscribers?: string
}

export const DEFAULT_CHANNELS: SocialChannel[] = [
  { name: 'Telegram', url: 'https://t.me/+69rdOEDrfvgyMDMy', subscribers: '14 200 подписчиков' },
  {
    name: 'Макс',
    url: 'https://max.ru/join/TdAOrknpNtm20J92ke2oXJGoKA8OI_nH6GnQ5xtH2TQ',
    subscribers: '6 800 подписчиков',
  },
  {
    name: 'ВКонтакте',
    url: 'https://vk.com/digital_pub_vacancies',
    subscribers: '9 300 подписчиков',
  },
]

interface LeftSidebarProps {
  stats?: {
    vacancyCount: number
    resumeCount: number
    companyCount: number
    newToday: number
  }
  channels?: SocialChannel[]
}

export default function LeftSidebar({ stats, channels }: LeftSidebarProps) {
  const socialChannels = channels ?? DEFAULT_CHANNELS
  return (
    <div className="space-y-6">
      {/* Subscribe cards - wrapped in border container per mockup */}
      <div className="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="s-lbl">Вакансии в соцсетях</h3>
        {socialChannels.map((ch) => {
          const name = ch.name
          const type: 'tg' | 'mx' | 'vk' =
            name === 'Telegram' ? 'tg' : name === 'Макс' ? 'mx' : 'vk'
          const icon = name === 'Telegram' ? <TgIcon /> : name === 'Макс' ? <MxIcon /> : <VkIcon />
          const btnColor =
            name === 'Telegram' ? 'bg-brand-tg' : name === 'Макс' ? 'bg-brand-mx' : 'bg-brand-vk'
          const desc =
            name === 'Telegram'
              ? 'Свежие вакансии каждый день прямо в Telegram.'
              : name === 'Макс'
                ? 'Те же вакансии в экосистеме ВКонтакте.'
                : 'Вакансии и карьерные советы в вашей ленте ВК.'
          return (
            <SubCard
              key={name}
              type={type}
              icon={icon}
              title={name}
              subscribers={ch.subscribers ?? ''}
              desc={desc}
              btnColor={btnColor}
              url={ch.url}
            />
          )
        })}
      </div>

      {/* Stats - wrapped in border container per mockup */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <h3 className="s-lbl">Платформа</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Вакансий</span>
            <span className="font-semibold text-text">
              {stats?.vacancyCount?.toLocaleString('ru-RU') ?? '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Новых сегодня</span>
            <span className="font-semibold text-green-600">
              {stats?.newToday?.toLocaleString('ru-RU') ?? '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Резюме</span>
            <span className="font-semibold text-text">
              {stats?.resumeCount?.toLocaleString('ru-RU') ?? '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
