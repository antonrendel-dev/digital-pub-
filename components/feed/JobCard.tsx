'use client'

import { useState } from 'react'
import { Job } from '@/lib/data'

interface JobCardProps {
  job: Job
  onTagClick: (tag: string) => void
}

export default function JobCard({ job, onTagClick }: JobCardProps) {
  const [saved, setSaved] = useState(false)

  return (
    <div className="jcard">
      <div className="jcard-head">
        <div className="jtitle">
          {job.title}
          {job.isNew && <span className="nbadge">Новое</span>}
        </div>
        <div className="jdate">{job.date}</div>
      </div>

      <div className="jmeta">
        {job.co}
        <span className="dot" />
        {job.city}
      </div>

      <div className="jsalary">{job.salary}</div>
      <div className="jdesc">{job.desc}</div>

      <div className="jtags">
        {job.tags.map((tag) => (
          <span
            key={tag.t}
            className={`jtag ${tag.tp}`}
            onClick={(e) => {
              e.stopPropagation()
              onTagClick(tag.t)
            }}
          >
            {tag.t}
          </span>
        ))}
      </div>

      <div className="jcard-foot">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="jco-logo">{job.init}</div>
          <span className="jco-name">{job.co}</span>
        </div>
        <button className="jsave" onClick={() => setSaved(!saved)}>
          {saved ? '♥ Сохранено' : '♡ Сохранить'}
        </button>
      </div>
    </div>
  )
}
