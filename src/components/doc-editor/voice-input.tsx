'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any

interface Props {
  onTranscript: (text: string) => void
}

function getSpeechRecognition(): SpeechRecognitionType | null {
  if (typeof window === 'undefined') return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  return w.webkitSpeechRecognition || w.SpeechRecognition || null
}

export default function VoiceInput({ onTranscript }: Props) {
  const [isRecording, setIsRecording] = useState(false)
  const [interim, setInterim] = useState('')
  const [lang, setLang] = useState<'ja-JP' | 'en-US'>('ja-JP')
  const recognitionRef = useRef<SpeechRecognitionType | null>(null)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    if (!getSpeechRecognition()) {
      setSupported(false)
    }
  }, [])

  const startRecording = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognition()
    if (!SpeechRecognitionCtor) return

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      if (finalTranscript) {
        onTranscript(finalTranscript)
        setInterim('')
      } else {
        setInterim(interimTranscript)
      }
    }

    recognition.onerror = () => {
      setIsRecording(false)
      setInterim('')
    }

    recognition.onend = () => {
      setIsRecording(false)
      setInterim('')
    }

    recognition.start()
    recognitionRef.current = recognition
    setIsRecording(true)
  }, [lang, onTranscript])

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsRecording(false)
    setInterim('')
  }, [])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  if (!supported) {
    return (
      <button
        disabled
        className="flex items-center gap-1 px-2 py-1 rounded text-slate-600 cursor-not-allowed text-xs"
        title="このブラウザでは音声入力に対応していません"
      >
        <MicOff size={14} />
      </button>
    )
  }

  return (
    <div className="relative flex items-center gap-1">
      <button
        onClick={toggleRecording}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
          isRecording
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'text-slate-400 hover:bg-slate-700 hover:text-white'
        }`}
        title={isRecording ? '音声入力を停止' : '音声入力を開始'}
      >
        {isRecording ? (
          <>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="max-md:hidden">録音中</span>
          </>
        ) : (
          <>
            <Mic size={14} />
            <span className="max-md:hidden">音声入力</span>
          </>
        )}
      </button>

      {/* Language toggle */}
      <button
        onClick={() => setLang(l => l === 'ja-JP' ? 'en-US' : 'ja-JP')}
        className="text-[9px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-500 hover:text-white hover:border-slate-500 transition-colors"
        title="言語切替"
      >
        {lang === 'ja-JP' ? 'JP' : 'EN'}
      </button>

      {/* Interim transcript display */}
      {interim && (
        <div className="absolute top-full mt-1 left-0 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 shadow-xl z-50 max-w-[300px] whitespace-pre-wrap">
          <span className="text-indigo-400 mr-1">...</span>
          {interim}
        </div>
      )}
    </div>
  )
}
