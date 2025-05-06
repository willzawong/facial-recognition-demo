// components/WebcamFeed.tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { startWebcam, stopWebcam } from '@/features/webcam/webcamSlice'
import { setFaces, clearFaces } from '@/features/face/faceSlice'
import { Button } from '@/components/ui/button'
import { loadModels, detectFaces } from '@/lib/faceApi'
import * as faceapi from 'face-api.js'
import { FaceCard } from '@/components/FaceCard'
import { RootState } from '@/lib/store'

export default function WebcamFeed() {
  const videoRef = useRef<HTMLVideoElement|null>(null)
  const canvasRef = useRef<HTMLCanvasElement|null>(null)
  const fileInputRef = useRef<HTMLInputElement|null>(null)
  const dispatch = useDispatch()
  const faces = useSelector((s: RootState) => s.face.faces)

  const [loading, setLoading] = useState(false)
  const [paused, setPaused] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File|null>(null)
  const [uploadedSrc, setUploadedSrc] = useState<string|null>(null)

  // Play/pause webcam video
  useEffect(() => {
    const vid = videoRef.current; if (!vid) return
    paused ? vid.pause() : vid.play().catch(console.error)
  }, [paused])

  // clear any upload state
  const clearUploaded = useCallback(() => {
    if (uploadedSrc) URL.revokeObjectURL(uploadedSrc)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setUploadedSrc(null)
    setUploadedFile(null)
    setPaused(false)
    setLoading(false)
    clearCanvas()
    dispatch(clearFaces())
  }, [uploadedSrc, dispatch])

  // START webcam
  const start = async () => {
    clearUploaded()
    try {
      setLoading(true)
      await loadModels()
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        dispatch(startWebcam())
        setStreaming(true)
      }
      setTimeout(() => runDetection(), 300)
    } catch (err) {
      console.error('Webcam error:', err)
    } finally {
      setLoading(false)
    }
  }

  // STOP webcam
  const stop = useCallback(() => {
    if (videoRef.current?.srcObject) {
      ;(videoRef.current.srcObject as MediaStream)
        .getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    dispatch(stopWebcam())
    dispatch(clearFaces())
    setStreaming(false)
    setPaused(false)
    setLoading(false)
    setUploadedFile(null)
    setUploadedSrc(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    clearCanvas()
    clearUploaded()
    if (videoRef.current) {
      videoRef.current.pause()
    }
  }, [dispatch])

  // load models once
  useEffect(() => {
    loadModels().catch(console.error)
    return () => stop()
  }, [stop])

  // ─── WEBCAM DETECTION ────────────────────────────────────────────────────────
  const runDetection = async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const loop = async () => {
      const stream = video.srcObject as MediaStream|null
      if (!stream || stream.getVideoTracks().length === 0) {
        clearCanvas()
        dispatch(clearFaces())
        return
      }

      let results: any[] = []
      try {
        results = await detectFaces(video)
      } catch (err) {
        console.error('Detection error:', err)
      }

      if (results.length === 0) dispatch(clearFaces())
      else
        dispatch(setFaces(
          results.map(res => ({
            age: Math.round(res.age),
            gender: res.gender,
            expressions: JSON.parse(JSON.stringify(res.expressions)),
          }))
        ))

      ctx.clearRect(0,0,canvas.width,canvas.height)
      results.forEach(res => {
        const { x,y,width,height } = res.detection.box
        const flippedX = canvas.width - x - width

        ctx.strokeStyle = '#00ffe0'
        ctx.lineWidth = 2
        ctx.strokeRect(flippedX, y, width, height)

        const fontSize = 16
        ctx.font = `${fontSize}px sans-serif`
        ctx.fillStyle = '#00ffe0'
        ctx.textBaseline = 'bottom'

        const [emotion] = Object.entries(res.expressions)
                             .sort((a,b)=>b[1]-a[1])[0]
        const label = `${res.gender}, ${Math.round(res.age)}y (${emotion})`
        ctx.fillText(label, flippedX, y - 5)
      })

      setTimeout(loop, 100)
    }

    loop()
  }

  // ─── IMAGE DETECTION ────────────────────────────────────────────────────────
  const detectOnImage = async (file: File) => {
    if (!canvasRef.current) return
    await loadModels()

    const img = new Image()
    const url = URL.createObjectURL(file)
    img.src = url
    await new Promise(res => img.onload = res)

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!

    const container = canvas.parentElement!
    const maxW = container.clientWidth
    const maxH = 480

    const ar = img.naturalWidth / img.naturalHeight
    let dw = maxW, dh = dw / ar
    if (dh > maxH) { dh = maxH; dw = dh * ar }

    canvas.width = maxW
    canvas.height = maxH
    const offsetX = (maxW - dw)/2
    const offsetY = (maxH - dh)/2

    ctx.clearRect(0,0,canvas.width,canvas.height)
    ctx.drawImage(img, offsetX, offsetY, dw, dh)

    const results = await faceapi
      .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
      .withAgeAndGender()
      .withFaceExpressions()

    if (results.length===0) dispatch(clearFaces())
    else
      dispatch(setFaces(
        results.map(res => ({
          age: Math.round(res.age),
          gender: res.gender,
          expressions: JSON.parse(JSON.stringify(res.expressions)),
        }))
      ))

    const scaleX = dw / img.naturalWidth
    const scaleY = dh / img.naturalHeight

    results.forEach(res => {
      const { x,y,width,height } = res.detection.box
      const bx = offsetX + x*scaleX
      const by = offsetY + y*scaleY
      const bw = width*scaleX
      const bh = height*scaleY

      ctx.strokeStyle = '#00ffe0'
      ctx.lineWidth = Math.max(2, bh*0.02)
      ctx.strokeRect(bx, by, bw, bh)

      const fontSize = Math.max(14, bh*0.15)
      ctx.font = `${fontSize}px sans-serif`
      ctx.fillStyle = '#00ffe0'
      ctx.textBaseline = 'bottom'

      const [emotion] = Object.entries(res.expressions)
                           .sort((a,b)=>b[1]-a[1])[0]
      const label = `${res.gender}, ${Math.round(res.age)}y (${emotion})`
      ctx.fillText(label, bx, by - fontSize/2)
    })

    URL.revokeObjectURL(url)
  }

  // ─── CANVAS CLEAR ─────────────────────────────────────────────────────────
  const clearCanvas = () => {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d')
    if (ctx) {
      ctx.setTransform(1,0,0,1,0,0)
      ctx.clearRect(0,0,c.width,c.height)
    }
  }

  // ─── HANDLERS ─────────────────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // make sure webcam is stopped
    if (streaming) stop()

    clearCanvas()
    dispatch(clearFaces())
    const url = URL.createObjectURL(file)
    setUploadedSrc(url)
    setUploadedFile(file)
    detectOnImage(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (streaming) {
      console.log('Cannot drop file while webcam is active')
      return
    }
    const file = e.dataTransfer.files[0]
    if (!file) return
    console.log('File dropped:', file)
    clearCanvas()
    dispatch(clearFaces())
    const url = URL.createObjectURL(file)
    setUploadedSrc(url)
    setUploadedFile(file)
    detectOnImage(file)
  }

  useEffect(() => {
    if (!streaming && !uploadedSrc) {
      clearCanvas()
      dispatch(clearFaces())
    }
  }, [streaming, uploadedSrc, dispatch])

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 items-center [@media(min-width:1020px)]:flex-row [@media(min-width:1020px)]:items-start">
      {/* Left column */}
      <div className="flex flex-col gap-4 w-full [@media(min-width:1020px)]:w-3/5">
        {/* video + canvas + drag/drop + controls */}
        <div
          className="w-full h-[360px] sm:h-[420px] md:h-[480px] rounded-xl border-2 border-neutral-500 bg-black overflow-hidden relative flex items-center justify-center"
          onDragOver={e => !streaming && e.preventDefault()}
          onDrop={handleDrop}
        >
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"/>
            </div>
          )}

          {!streaming && !uploadedSrc && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-4 z-10">
              <div className="animate-bounce mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Drag & Drop Images</h2>
              <p className="text-neutral-400">
                or click the "Upload Image" or "Start Webcam" button below
              </p>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay muted playsInline
            className={`w-full h-full object-cover transform scale-x-[-1] ${uploadedSrc ? 'hidden' : ''}`}
          />

          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 justify-center [@media(min-width:1020px)]:justify-start">
          <Button onClick={start}
                  className={`w-[140px] bg-black text-white border border-neutral-500 hover:bg-neutral-900 ${streaming ? 'hidden' : ''}`}>
            Start Webcam
          </Button>
          <Button onClick={stop} variant="destructive"
                  className={`w-[140px] ${!streaming ? 'hidden' : ''}`}>
            Stop Webcam
          </Button>
          <Button onClick={() => streaming && setPaused(p => !p)}
                  className={`w-[140px] bg-black text-white border border-neutral-500 hover:bg-neutral-900 ${!streaming ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {paused ? 'Resume' : 'Pause'}
          </Button>
          <Button onClick={() => fileInputRef.current?.click()}
                  className={`w-[140px] bg-black text-white border border-neutral-500 hover:bg-neutral-900 `}>
            Upload Image
          </Button>
          <Button onClick={clearUploaded}
                  className={`w-[140px] bg-black text-white border border-neutral-500 hover:bg-red-500 ${!uploadedFile ? 'hidden' : ''}`}>
            Clear Image
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Right column: Face cards */}
      <div className="w-full [@media(min-width:1020px)]:w-2/5 max-h-[700px] overflow-y-auto">
        <div
          className="
            grid grid-cols-1
            [@media(min-width:620px)_and_(max-width:1019px)]:grid-cols-2
            [@media(min-width:1020px)_and_(max-width:1359px)]:grid-cols-1

            [@media(min-width:1360px)]:flex
            [@media(min-width:1360px)]:flex-wrap
            [@media(min-width:1360px)]:justify-start

            [@media(max-width:1359px)]:flex
            [@media(max-width:1359px)]:flex-wrap
            [@media(max-width:1359px)]:justify-center
            gap-3
          "
        >
          {faces.map((face, i) => {
            const emotion = Object
              .entries(face.expressions)
              .sort((a, b) => b[1] - a[1])[0][0]

            return (
              <FaceCard
                key={i}
                index={i}
                age={face.age}
                gender={face.gender}
                emotion={emotion}
              />
            )
          })}
        </div>
      </div>

    </div>
  )
}
