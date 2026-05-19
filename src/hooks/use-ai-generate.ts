'use client'

import { useState } from 'react'
import type { AIGenerateRequest, AIGeneratedSlide, Block } from '@/types'
import { generateId } from '@/lib/utils'
import {
  buildSkillSlides,
  buildSkillDocSections,
  summarizeContentToSlides,
  summarizeContentToDoc,
  isContentInput,
} from '@/lib/ai-skills'

export interface DocSection {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

// Slides AI
export function useAIGenerate() {
  const [slides, setSlides] = useState<AIGeneratedSlide[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  async function generate(req: AIGenerateRequest & { skillId?: string }) {
    setSlides([])
    setIsGenerating(true)
    const skillId = req.skillId || 'free'
    // 長文入力なら要約モード、短いならテンプレートモード
    const mock = isContentInput(req.topic)
      ? summarizeContentToSlides(skillId, req.topic)
      : buildSkillSlides(skillId, req.topic)
    for (const slide of mock) {
      await delay(500)
      setSlides((prev) => [...prev, { ...slide }])
    }
    setIsGenerating(false)
  }

  function reset() {
    setSlides([])
    setIsGenerating(false)
  }

  return { slides, isGenerating, generate, reset }
}

// Doc AI
export function useAIGenerateDoc() {
  const [sections, setSections] = useState<DocSection[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  async function generate(topic: string, skillId?: string) {
    setSections([])
    setIsGenerating(true)
    const sid = skillId || 'free'
    // 長文入力なら要約モード、短いならテンプレートモード
    const mock = isContentInput(topic) ? summarizeContentToDoc(sid, topic) : buildSkillDocSections(sid, topic)
    for (const section of mock) {
      await delay(400)
      setSections((prev) => [...prev, section])
    }
    setIsGenerating(false)
  }

  function reset() {
    setSections([])
    setIsGenerating(false)
  }

  function toBlocks(topic: string): Block[] {
    const blocks: Block[] = [{ id: generateId(), type: 'h1', content: topic }]
    for (const section of sections) {
      blocks.push({ id: generateId(), type: 'h2', content: section.heading })
      for (const p of section.paragraphs) {
        blocks.push({ id: generateId(), type: 'paragraph', content: p })
      }
      if (section.bullets) {
        for (const b of section.bullets) {
          blocks.push({ id: generateId(), type: 'bullet', content: b })
        }
      }
    }
    return blocks
  }

  return { sections, isGenerating, generate, reset, toBlocks }
}
