'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Circle, Square, Download, Clock, Mic, MicOff } from 'lucide-react'

interface Props {
  targetRef: React.RefObject<HTMLDivElement | null>
  visible: boolean
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function PresentationRecorder({ targetRef, visible }: Props) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [includeAudio, setIncludeAudio] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecording()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    setRecordedBlob(null)
    chunksRef.current = []

    try {
      // Use getDisplayMedia for screen capture
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
        } as any,
        audio: false,
      })

      let combinedStream = displayStream

      // Optionally add microphone audio
      if (includeAudio) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          })
          const tracks = [
            ...displayStream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
          ]
          combinedStream = new MediaStream(tracks)
        } catch {
          // Proceed without audio if mic permission denied
          console.warn('Microphone access denied, recording without audio')
        }
      }

      streamRef.current = combinedStream

      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : 'video/webm'

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2500000,
      })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setRecordedBlob(blob)
        // Stop all tracks
        combinedStream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      // Handle stream ending externally (user stops share)
      displayStream.getVideoTracks()[0].addEventListener('ended', () => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording()
        }
      })

      recorder.start(1000) // Collect data every second
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setDuration(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
    } catch (err) {
      setError('Recording failed. Please allow screen sharing access.')
      console.error('Recording error:', err)
    }
  }, [includeAudio])

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    setIsRecording(false)
    setIsPaused(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const downloadRecording = useCallback(() => {
    if (!recordedBlob) return
    const url = URL.createObjectURL(recordedBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `presentation-${new Date().toISOString().slice(0, 16).replace(/:/g, '-')}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [recordedBlob])

  if (!visible) return null

  return (
    <div className="fixed bottom-20 right-4 z-[9997] flex flex-col items-end gap-2">
      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-900/90 backdrop-blur rounded-full shadow-lg animate-pulse">
          <Circle size={10} className="text-red-400 fill-red-400" />
          <span className="text-white text-sm font-mono tabular-nums">
            {formatDuration(duration)}
          </span>
          <span className="text-red-300 text-xs">REC</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="px-3 py-2 bg-red-900/80 border border-red-700 rounded-lg text-xs text-red-300 max-w-xs">
          {error}
        </div>
      )}

      {/* Download button when recording is done */}
      {recordedBlob && !isRecording && (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg shadow-lg">
          <span className="text-xs text-slate-400">
            {(recordedBlob.size / (1024 * 1024)).toFixed(1)} MB
          </span>
          <button
            onClick={downloadRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg transition-colors"
          >
            <Download size={12} />
            Download WebM
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg shadow-lg">
        {!isRecording ? (
          <>
            <button
              onClick={() => setIncludeAudio(!includeAudio)}
              className={`p-1.5 rounded transition-colors ${
                includeAudio
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title={includeAudio ? 'Audio enabled' : 'Audio disabled'}
            >
              {includeAudio ? <Mic size={14} /> : <MicOff size={14} />}
            </button>
            <button
              onClick={startRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded-lg transition-colors"
            >
              <Circle size={10} className="fill-white" />
              Record
            </button>
          </>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded-lg transition-colors"
          >
            <Square size={10} className="fill-white" />
            Stop
          </button>
        )}
      </div>
    </div>
  )
}
