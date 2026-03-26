"use client"

import { useRef, useState, useCallback, useEffect } from "react"

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void
  onClear?: () => void
  width?: number
  height?: number
}

export function SignatureCanvas({
  onSave,
  onClear,
  width = 400,
  height = 200,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (ctx) {
      ctx.strokeStyle = "#000000"
      ctx.lineWidth = 2
      ctx.lineCap = "round"
    }
  }, [])

  const getCoordinates = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }

      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      if ("touches" in e) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        }
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
    },
    []
  )

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      setIsDrawing(true)
      const { x, y } = getCoordinates(e)
      const ctx = canvasRef.current?.getContext("2d")
      if (ctx) {
        ctx.beginPath()
        ctx.moveTo(x, y)
      }
    },
    [getCoordinates]
  )

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      if (!isDrawing) return
      const { x, y } = getCoordinates(e)
      const ctx = canvasRef.current?.getContext("2d")
      if (ctx) {
        ctx.lineTo(x, y)
        ctx.stroke()
        setHasSignature(true)
      }
    },
    [isDrawing, getCoordinates]
  )

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
  }, [])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setHasSignature(false)
      onClear?.()
    }
  }, [onClear])

  const save = useCallback(() => {
    const canvas = canvasRef.current
    if (canvas && hasSignature) {
      onSave(canvas.toDataURL("image/png"))
    }
  }, [hasSignature, onSave])

  return (
    <div className="space-y-4">
        <div className="border-2 border-[#d4d4d4] rounded-xl overflow-hidden bg-[#e4e4e4]">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full touch-none cursor-crosshair block"
          style={{ maxWidth: "100%" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={clear}
          className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700"
        >
          Effacer
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!hasSignature}
          className="px-4 py-2 bg-[#C65D3B] text-white rounded-xl hover:bg-[#B04F2F] disabled:bg-[#D4C4BC] disabled:cursor-not-allowed"
        >
          Valider la signature
        </button>
      </div>
    </div>
  )
}
