import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { CloudImage } from './CloudImage';
import { resolveCloudImageUrl } from '../services/firebase';

interface ImageViewerModalProps {
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  imageUrl,
  title = 'عرض الصورة بحجم كامل',
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const pinchDistanceRef = useRef<number | null>(null);
  const pinchInitialScaleRef = useRef<number>(1);
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setFeedback(null);
  }, [imageUrl]);

  if (!imageUrl) return null;

  const clampScale = (val: number) => Math.min(Math.max(val, 1), 5);

  const handleZoomIn = () => {
    setScale((prev) => clampScale(prev + 0.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = clampScale(prev - 0.5);
      if (next <= 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleReset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleDoubleClick = () => {
    if (scale > 1.05) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    } else {
      setScale(2.5);
      setOffset({ x: 0, y: 0 });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setScale((prev) => {
      const next = clampScale(prev + delta);
      if (next <= 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchDistanceRef.current = getTouchDistance(e.touches);
      pinchInitialScaleRef.current = scale;
      setIsDragging(false);
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        handleDoubleClick();
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;
      if (scale > 1) {
        setIsDragging(true);
        dragStartRef.current = {
          x: e.touches[0].clientX - offset.x,
          y: e.touches[0].clientY - offset.y,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDistanceRef.current !== null) {
      const newDist = getTouchDistance(e.touches);
      const ratio = newDist / pinchDistanceRef.current;
      const nextScale = clampScale(pinchInitialScaleRef.current * ratio);
      setScale(nextScale);
      if (nextScale <= 1) {
        setOffset({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      setOffset({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      });
    }
  };

  const handleTouchEnd = () => {
    pinchDistanceRef.current = null;
    setIsDragging(false);
  };

  const handleDownloadImage = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const resolvedUrl = (await resolveCloudImageUrl(imageUrl)) || imageUrl;
      const fileName = `Sami_Chat_${Date.now()}.jpg`;

      if (resolvedUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = resolvedUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const response = await fetch(resolvedUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
      }

      setFeedback({ text: 'تم حفظ الصورة في جهازك بنجاح', isError: false });
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback({ text: 'تعذر حفظ الصورة، يرجى المحاولة مرة أخرى', isError: true });
      setTimeout(() => setFeedback(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md select-none overflow-hidden animate-in fade-in duration-200"
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Action Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-20">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-full transition-colors text-white cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="hidden sm:inline text-xs font-bold text-slate-300">{title}</span>
        </div>

        {/* Zoom Percentage Indicator */}
        <div className="px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 text-amber-400 text-xs font-black">
          {Math.round(scale * 100)}%
        </div>

        {/* Download / Save Image Button */}
        <button
          type="button"
          onClick={handleDownloadImage}
          disabled={isSaving}
          className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg transition disabled:opacity-50 cursor-pointer"
          title="حفظ الصورة"
        >
          <Download className="w-4 h-4" />
          <span>{isSaving ? 'جاري الحفظ...' : 'حفظ الصورة'}</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`absolute top-20 z-20 px-4 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold shadow-xl ${
            feedback.isError
              ? 'bg-red-950/90 border-red-500 text-red-200'
              : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
          }`}
        >
          {feedback.isError ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Interactive Zoom & Pan Image Viewport */}
      <div
        className={`w-full h-full flex items-center justify-center p-4 ${
          scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
        }`}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <CloudImage
          src={imageUrl}
          alt={title}
          draggable={false}
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="max-w-[95vw] max-h-[82vh] w-auto h-auto object-contain rounded-lg shadow-2xl origin-center pointer-events-none"
        />
      </div>

      {/* Bottom Zoom Controls Bar */}
      <div className="absolute bottom-6 z-20 flex items-center gap-3 px-4 py-2 rounded-3xl bg-slate-900/90 border border-slate-700 shadow-2xl">
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={scale >= 5}
          className="p-2 rounded-full hover:bg-slate-800 text-amber-400 disabled:text-slate-600 transition cursor-pointer"
          title="تكبير"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={scale === 1 && offset.x === 0 && offset.y === 0}
          className="px-3 py-1.5 rounded-xl hover:bg-slate-800 text-white disabled:text-slate-600 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          title="إعادة الحجم الأصلي"
        >
          <RotateCcw className="w-4 h-4" />
          <span>إعادة الحجم</span>
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          disabled={scale <= 1}
          className="p-2 rounded-full hover:bg-slate-800 text-amber-400 disabled:text-slate-600 transition cursor-pointer"
          title="تصغير"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
