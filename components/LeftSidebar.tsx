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
}

function SubCard({ type, icon, title, subscribers, desc, btnColor }: SubCardProps) {
  const [subscribed, setSubscribed] = useState(false)

  const bgClass = type === 'tg' ? 'bg-bg-sub-tg' : type === 'mx' ? 'bg-bg-sub-mx' : 'bg-bg-sub-vk'

  return (
    <div className={`${bgClass} border border-border rounded-lg p-3 transition-colors duration-200`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex-shrink-0">{icon}</div>
        <div>
          <div className="text-sm font-semibold text-text leading-tight">{title}</div>
          <div className="text-[10.5px] text-text-light mt-0.5">{subscribers}</div>
        </div>
      </div>
      <div className="text-[11.5px] text-text-muted leading-relaxed mb-2">{desc}</div>
      <button
        className={`block w-full text-center py-1.5 rounded-md text-[11.5px] font-semibold text-white border-none cursor-pointer transition-opacity hover:opacity-85 ${btnColor}`}
        onClick={(e) => { e.preventDefault(); setSubscribed(true) }}
      >
        {subscribed ? '\u2713 Подписан' : 'Подписаться'}
      </button>
    </div>
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
  <Image src="/max-app.webp" alt="Макс" width={36} height={36} className="rounded-lg" />
)

const VkIcon = () => (
  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#0077ff' }}>
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
      <path d="M21.547 7h-3.29a.743.743 0 0 0-.655.392s-1.312 2.416-1.734 3.23C14.734 12.813 14 12.126 14 11.11V7.603A1.104 1.104 0 0 0 12.896 6.5h-2.474a1.982 1.982 0 0 0-1.75.813s1.255-.204 1.255 1.49c0 .42.022 1.626.04 2.64a.73.73 0 0 1-1.272.503 21.54 21.54 0 0 1-2.498-4.543.693.693 0 0 0-.63-.403h-2.99a.508.508 0 0 0-.48.685C3.005 10.175 6.918 18 11.38 18h1.878a.742.742 0 0 0 .742-.742v-1.135a.73.73 0 0 1 1.23-.53l2.247 2.112a1.1 1.1 0 0 0 .746.295h2.953c1.424 0 1.424-.988.647-1.753-.546-.538-2.518-2.617-2.518-2.617a1.02 1.02 0 0 1-.078-1.323c.637-.84 1.68-2.212 2.122-2.8.603-.804 1.697-2.507.197-2.507z" />
    </svg>
  </div>
)

export default function LeftSidebar() {
  return (
    <div className="space-y-6">
      {/* Social subscribe cards */}
      <div className="space-y-3">
        <h3 className="s-lbl">Вакансии в соцсетях</h3>
        <a href="https://t.me/web_vacancy" target="_blank" rel="noopener noreferrer" className="block">
          <SubCard type="tg" icon={<TgIcon />} title="Telegram" subscribers="14 200 подписчиков" desc="Свежие вакансии каждый день прямо в Telegram." btnColor="bg-brand-tg" />
        </a>
        <a href="https://max.ru/join/TdAOrknpNtm20J92ke2oXJGoKA8OI_nH6GnQ5xtH2TQ" target="_blank" rel="noopener noreferrer" className="block">
          <SubCard type="mx" icon={<MxIcon />} title="Макс" subscribers="6 800 подписчиков" desc="Те же вакансии в экосистеме ВКонтакте." btnColor="bg-brand-mx" />
        </a>
        <a href="https://vk.com/digital_pub_vacancies" target="_blank" rel="noopener noreferrer" className="block">
          <SubCard type="vk" icon={<VkIcon />} title="ВКонтакте" subscribers="9 300 подписчиков" desc="Вакансии и карьерные советы в вашей ленте ВК." btnColor="bg-brand-vk" />
        </a>
      </div>

      {/* Stats */}
      <div>
        <h3 className="s-lbl">Платформа</h3>
        <div className="space-y-0">
          <div className="flex justify-between items-center py-1.5 border-b border-border-light text-sm">
            <span className="text-text-light">Вакансий</span>
            <span className="text-sm font-bold text-text">248</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-border-light text-sm">
            <span className="text-text-light">Резюме</span>
            <span className="text-sm font-bold text-text">1 204</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-border-light text-sm">
            <span className="text-text-light">Компаний</span>
            <span className="text-sm font-bold text-text">87</span>
          </div>
          <div className="flex justify-between items-center py-1.5 text-sm">
            <span className="text-text-light">Новых сегодня</span>
            <span className="text-sm font-bold text-brand-green">14</span>
          </div>
        </div>
      </div>
    </div>
  )
}
