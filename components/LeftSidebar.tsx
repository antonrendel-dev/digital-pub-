'use client'

import { useState } from 'react'
import Image from 'next/image'

interface SubCardProps {
  type: 'tg' | 'mx' | 'vk'
  icon: React.ReactNode
  title: string
  subscribers: string
  desc: string
  btnClass: string
  btnText: string
}

function SubCard({ type, icon, title, subscribers, desc, btnClass, btnText }: SubCardProps) {
  const [subscribed, setSubscribed] = useState(false)

  return (
    <div className={`sub-card ${type}`}>
      <div className="sub-card-head">
        <div className={`sub-icon ${type}-ic`}>{icon}</div>
        <div>
          <div className="sub-title">{title}</div>
          <div className="sub-num">{subscribers}</div>
        </div>
      </div>
      <div className="sub-desc">{desc}</div>
      <button className={`sub-btn ${btnClass}`} onClick={() => setSubscribed(true)}>
        {subscribed ? '✓ Подписан' : btnText}
      </button>
    </div>
  )
}

const TgIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.16 13.947l-2.954-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.982.612z" />
  </svg>
)

const MxIcon = () => (
  <Image src="/max-app.webp" alt="Макс" width={32} height={32} style={{ borderRadius: 6 }} />
)

const VkIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M21.547 7h-3.29a.743.743 0 0 0-.655.392s-1.312 2.416-1.734 3.23C14.734 12.813 14 12.126 14 11.11V7.603A1.104 1.104 0 0 0 12.896 6.5h-2.474a1.982 1.982 0 0 0-1.75.813s1.255-.204 1.255 1.49c0 .42.022 1.626.04 2.64a.73.73 0 0 1-1.272.503 21.54 21.54 0 0 1-2.498-4.543.693.693 0 0 0-.63-.403h-2.99a.508.508 0 0 0-.48.685C3.005 10.175 6.918 18 11.38 18h1.878a.742.742 0 0 0 .742-.742v-1.135a.73.73 0 0 1 1.23-.53l2.247 2.112a1.1 1.1 0 0 0 .746.295h2.953c1.424 0 1.424-.988.647-1.753-.546-.538-2.518-2.617-2.518-2.617a1.02 1.02 0 0 1-.078-1.323c.637-.84 1.68-2.212 2.122-2.8.603-.804 1.697-2.507.197-2.507z" />
  </svg>
)

export default function LeftSidebar() {
  return (
    <div className="left-col">
      <div className="s-sec">
        <div className="s-lbl">Вакансии в соцсетях</div>
        <SubCard
          type="tg"
          icon={<TgIcon />}
          title="Telegram"
          subscribers="14 200 подписчиков"
          desc="Свежие вакансии каждый день прямо в Telegram."
          btnClass="tg-btn"
          btnText="Подписаться"
        />
        <SubCard
          type="mx"
          icon={<MxIcon />}
          title="Макс"
          subscribers="6 800 подписчиков"
          desc="Те же вакансии в экосистеме ВКонтакте."
          btnClass="mx-btn"
          btnText="Подписаться"
        />
        <SubCard
          type="vk"
          icon={<VkIcon />}
          title="ВКонтакте"
          subscribers="9 300 подписчиков"
          desc="Вакансии и карьерные советы в вашей ленте ВК."
          btnClass="vk-btn"
          btnText="Подписаться"
        />
      </div>

      <div className="s-sec">
        <div className="s-lbl">Платформа</div>
        <div className="stat-row">
          <span className="lb">Вакансий</span>
          <span className="n">248</span>
        </div>
        <div className="stat-row">
          <span className="lb">Резюме</span>
          <span className="n">1 204</span>
        </div>
        <div className="stat-row">
          <span className="lb">Компаний</span>
          <span className="n">87</span>
        </div>
        <div className="stat-row">
          <span className="lb">Новых сегодня</span>
          <span className="n" style={{ color: '#1f8a50' }}>
            14
          </span>
        </div>
      </div>
    </div>
  )
}
