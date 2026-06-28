"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

export type SignaturePadHandle = {
  getSignatureDataUrl: () => string | null;
  isEmpty: () => boolean;
};

const SignaturePadField = forwardRef<
  SignaturePadHandle,
  {
    onSignatureChange: (hasSignature: boolean) => void;
    watermark?: string;
    heightClass?: string;
  }
>(function SignaturePadField(
  {
    onSignatureChange,
    watermark = "여기에 정자로 서명해 주세요",
    heightClass = "h-40",
  },
  ref,
) {
  const sigRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasSignature, setHasSignature] = useState(false);

  useImperativeHandle(ref, () => ({
    getSignatureDataUrl: () => {
      if (!sigRef.current || sigRef.current.isEmpty()) return null;
      return sigRef.current.getTrimmedCanvas().toDataURL("image/png");
    },
    isEmpty: () => sigRef.current?.isEmpty() ?? true,
  }));

  const syncSignature = () => {
    const signed = sigRef.current != null && !sigRef.current.isEmpty();
    setHasSignature(signed);
    onSignatureChange(signed);
  };

  const handleClear = () => {
    sigRef.current?.clear();
    setHasSignature(false);
    onSignatureChange(false);
  };

  useEffect(() => {
    const canvas = sigRef.current?.getCanvas();
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = container.offsetWidth;
    const height = container.offsetHeight;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(ratio, ratio);
  }, [heightClass]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${heightClass} bg-gray-50 rounded-2xl overflow-hidden touch-none border border-gray-200`}
    >
      {!hasSignature && (
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-[13px] text-gray-300 tracking-[-0.02em] leading-[1.55] pointer-events-none select-none z-10">
          {watermark}
        </p>
      )}
      <SignatureCanvas
        ref={sigRef}
        penColor="#191F28"
        minWidth={1.2}
        maxWidth={2.4}
        onBegin={() => setHasSignature(true)}
        onEnd={syncSignature}
        canvasProps={{
          className: `w-full ${heightClass} rounded-2xl bg-gray-50`,
        }}
      />
      <button
        type="button"
        onClick={handleClear}
        className="absolute bottom-2 right-2 z-20 px-2.5 py-1 rounded-md bg-white/90 border border-gray-200 text-[11px] font-semibold text-gray-500 shadow-sm active:scale-[0.97]"
      >
        지우기
      </button>
    </div>
  );
});

export default SignaturePadField;
