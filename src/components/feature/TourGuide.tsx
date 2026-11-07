import { useState, useEffect, useRef, useCallback } from "react";
import type { TourStep } from "@/hooks/useTour";

interface TourGuideProps {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  currentTourStep: TourStep | null;
  tourName?: string;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFinish: () => void;
  onTourFinished?: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function TourGuide({
  isActive,
  currentStep,
  totalSteps,
  currentTourStep,
  tourName,
  onNext,
  onPrev,
  onSkip,
  onFinish,
  onTourFinished,
}: TourGuideProps) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isStable, setIsStable] = useState(false);
  const rafRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const prevStepRef = useRef<number>(-1);
  const prevTargetRef = useRef<string>("");
  const calcTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportRef = useRef({ vw: 1024, vh: 768 });

  const accentGold = "#E8A020";
  const accentLight = "#f5b94a";
  const cardBg = "rgba(22, 32, 55, 0.98)";
  // Overlay mais leve — o bastante pra dar foco, mas ainda deixa o ambiente visível
  const overlayColor = "rgba(13, 22, 41, 0.55)";

  /**
   * Check if an element is actually rendered (not display:none, not zero size)
   * We intentionally DO NOT check viewport position — the tour will scroll to it.
   */
  const isElementVisible = useCallback((el: Element): boolean => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    const htmlEl = el as HTMLElement;
    const style = getComputedStyle(htmlEl);
    if (style.display === "none") return false;
    if (style.visibility === "hidden") return false;
    if (style.opacity === "0") return false;
    return true;
  }, []);

  /**
   * Find the first RENDERED element matching the selector.
   * If none is "visible" (display:none etc), fallback to the first match.
   */
  const findVisibleTarget = useCallback((selector: string): HTMLElement | null => {
    const all = document.querySelectorAll(selector);
    for (let i = 0; i < all.length; i++) {
      if (isElementVisible(all[i])) {
        return all[i] as HTMLElement;
      }
    }
    // Fallback: return the first match even if it seems hidden
    // (it might just be off-screen, which scrollIntoView will fix)
    if (all.length > 0) return all[0] as HTMLElement;
    return null;
  }, [isElementVisible]);

  const recalc = useCallback(() => {
    if (!currentTourStep) return;

    const selector = currentTourStep.target;
    const targetEl = findVisibleTarget(selector);

    if (!targetEl) {
      setTargetRect(null);
      setIsStable(true);
      return;
    }

    // Scroll to element — center it in viewport so it always has breathing room
    targetEl.scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" });

    const doCalc = () => {
      const rect = targetEl.getBoundingClientRect();
      const viewW = window.innerWidth;
      const viewH = window.innerHeight;
      viewportRef.current = { vw: viewW, vh: viewH };
      const mobile = viewW < 768;

      const pad = mobile ? 8 : 14;

      // Limita a viewport com margem minima
      const top = Math.max(4, rect.top - pad);
      const left = Math.max(4, rect.left - pad);
      const width = Math.min(rect.width + pad * 2, viewW - left - 4);
      const height = Math.min(rect.height + pad * 2, viewH - top - 4);

      const finalWidth = Math.max(width, 48);
      const finalHeight = Math.max(height, 48);
      const finalLeft = Math.min(left, viewW - finalWidth - 4);
      const finalTop = Math.min(top, viewH - finalHeight - 4);

      setTargetRect({
        top: finalTop,
        left: finalLeft,
        width: finalWidth,
        height: finalHeight,
      });
      setIsStable(true);
    };

    // Wait for browser to render the scroll result before calculating rect
    requestAnimationFrame(() => {
      doCalc();
      // Backup calc after a short delay for any pending layout
      if (calcTimeoutRef.current) clearTimeout(calcTimeoutRef.current);
      calcTimeoutRef.current = setTimeout(doCalc, 200);
    });
  }, [currentTourStep, findVisibleTarget]);

  useEffect(() => {
    if (!isActive) {
      setIsVisible(false);
      setIsStable(false);
      setTargetRect(null);
      return;
    }

    const selector = currentTourStep?.target || "";
    if (prevStepRef.current === currentStep && prevTargetRef.current === selector && isStable) {
      return;
    }

    prevStepRef.current = currentStep;
    prevTargetRef.current = selector;

    setIsVisible(false);
    setIsStable(false);
    setTargetRect(null);

    const t1 = setTimeout(() => {
      recalc();
      const t2 = setTimeout(() => {
        setIsVisible(true);
      }, 200);
      return () => clearTimeout(t2);
    }, 250);

    return () => {
      clearTimeout(t1);
      if (calcTimeoutRef.current) clearTimeout(calcTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStep, currentTourStep]);

  useEffect(() => {
    if (!isActive) return;
    const onResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => recalc());
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, recalc]);

  useEffect(() => {
    if (!isActive || !currentTourStep) return;
    const targetEl = findVisibleTarget(currentTourStep.target);
    if (!targetEl) return;
    resizeObserverRef.current = new ResizeObserver(() => recalc());
    resizeObserverRef.current.observe(targetEl);
    return () => resizeObserverRef.current?.disconnect();
  }, [isActive, currentTourStep, findVisibleTarget, recalc]);

  useEffect(() => {
    return () => {
      if (calcTimeoutRef.current) clearTimeout(calcTimeoutRef.current);
    };
  }, []);

  const handleFinish = () => { onFinish(); onTourFinished?.(); };
  const handleSkip = () => { onSkip(); };

  if (!isActive || !currentTourStep) return null;

  const isLast = currentStep === totalSteps - 1;
  const isFirst = currentStep === 0;
  const progressPct = ((currentStep + 1) / totalSteps) * 100;

  const { vw, vh } = viewportRef.current;
  const isMobile = vw < 768;

  // ─── Card Positioning ───
  const cardMinWidth = isMobile ? Math.min(360, vw - 32) : 400;
  const cardMaxWidth = isMobile ? vw - 32 : 400;
  const cardWidth = Math.min(cardMaxWidth, cardMinWidth);

  let cardLeft: number;
  let cardTop: number;
  let cardPosition: "bottom" | "top" | "center";

  if (targetRect && isStable) {
    const requestedPos = currentTourStep.position || "bottom";
    const cardHeight = isMobile ? 230 : 240;
    const gap = isMobile ? 40 : 16; // MUCH bigger gap on mobile to keep card away from target

    // Center horizontally
    cardLeft = Math.max(8, Math.min(
      targetRect.left + targetRect.width / 2 - cardWidth / 2,
      vw - cardWidth - 8
    ));

    // Mobile: ALWAYS try to position at screen bottom, target visible above
    if (isMobile) {
      const spaceAtBottom = vh - cardHeight - 12;
      // If there's enough room, put card at bottom of screen
      if (spaceAtBottom > targetRect.top + targetRect.height + 24) {
        cardTop = vh - cardHeight - 12;
        cardPosition = "bottom";
      } else {
        // Not enough room at bottom, put at top
        cardTop = Math.max(12, targetRect.top - cardHeight - gap);
        cardPosition = "top";
      }
      // Safety: ensure card doesn't overlap target
      const cardBottom = cardTop + cardHeight;
      const targetBottom = targetRect.top + targetRect.height;
      const targetTop = targetRect.top;
      if (cardPosition === "bottom" && cardTop < targetBottom + 8) {
        cardTop = Math.min(targetBottom + gap, vh - cardHeight - 8);
      }
      if (cardPosition === "top" && cardBottom > targetTop - 8) {
        cardTop = Math.max(8, targetTop - cardHeight - gap);
      }
    } else {
      // Desktop: respect position prop
      const spaceBelow = vh - (targetRect.top + targetRect.height) - gap;
      const spaceAbove = targetRect.top - gap;

      if (requestedPos === "top" && spaceAbove >= cardHeight) {
        cardTop = targetRect.top - cardHeight - gap;
        cardPosition = "top";
      } else if (requestedPos === "bottom" && spaceBelow >= cardHeight) {
        cardTop = targetRect.top + targetRect.height + gap;
        cardPosition = "bottom";
      } else if (spaceBelow >= cardHeight) {
        cardTop = targetRect.top + targetRect.height + gap;
        cardPosition = "bottom";
      } else if (spaceAbove >= cardHeight) {
        cardTop = targetRect.top - cardHeight - gap;
        cardPosition = "top";
      } else {
        cardTop = Math.max(16, (vh - cardHeight) / 2);
        cardPosition = "center";
      }
    }
  } else {
    // No target — centered card
    cardLeft = (vw - cardWidth) / 2;
    cardTop = Math.max(16, (vh - 260) / 2);
    cardPosition = "center";
  }

  const tooltipStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 9995,
    pointerEvents: "auto",
    left: `${cardLeft}px`,
    top: `${cardTop}px`,
    width: `${cardWidth}px`,
    maxWidth: `${cardWidth}px`,
    boxSizing: "border-box",
  };

  return (
    <>
      <style>{`
        @keyframes tour-border-pulse {
          0%, 100% { box-shadow: 0 0 0 9999px ${overlayColor}, 0 0 20px rgba(232,160,32,0.40), 0 0 60px rgba(232,160,32,0.15); border-color: rgba(232,160,32,0.85); }
          50% { box-shadow: 0 0 0 9999px ${overlayColor}, 0 0 32px rgba(232,160,32,0.55), 0 0 80px rgba(232,160,32,0.22); border-color: rgba(245,185,74,0.95); }
        }
        @keyframes tour-border-pulse-static {
          0%, 100% { box-shadow: 0 0 0 9999px ${overlayColor}, 0 0 20px rgba(232,160,32,0.40), 0 0 60px rgba(232,160,32,0.15); }
        }
        @keyframes tour-tooltip-in {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Overlay base when no target */}
      {isStable && !targetRect && (
        <div
          className="fixed inset-0"
          style={{
            background: overlayColor,
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            opacity: isVisible ? 1 : 0,
            transition: "opacity 0.25s ease",
            zIndex: 9990,
            pointerEvents: isVisible ? "auto" : "none",
          }}
          onClick={handleSkip}
        />
      )}

      {/* Spotlight — box-shadow cria o overlay com recorte preciso: o alvo fica 100% visível e iluminado */}
      {targetRect && isStable && (
        <div
          className="fixed"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            opacity: isVisible ? 1 : 0,
            transition: "opacity 0.3s ease, top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease",
            background: "transparent",
            borderRadius: "12px",
            border: isMobile ? "3.5px solid rgba(232, 160, 32, 0.95)" : "3px solid rgba(232, 160, 32, 0.9)",
            boxShadow: isMobile
              ? `0 0 0 9999px ${overlayColor}, 0 0 28px rgba(232,160,32,0.50), 0 0 70px rgba(232,160,32,0.18)`
              : `0 0 0 9999px ${overlayColor}, 0 0 20px rgba(232,160,32,0.40), 0 0 60px rgba(232,160,32,0.15)`,
            animation: isVisible ? "tour-border-pulse 2.2s ease-in-out infinite" : "none",
            zIndex: 9992,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Pointer line from spotlight to card (when card is far) */}
      {targetRect && isStable && cardPosition !== "center" && isVisible && (
        <svg
          className="fixed inset-0"
          style={{ zIndex: 9993, pointerEvents: "none", width: "100vw", height: "100vh" }}
        >
          <line
            x1={targetRect.left + targetRect.width / 2}
            y1={cardPosition === "bottom" ? targetRect.top + targetRect.height : targetRect.top}
            x2={cardLeft + cardWidth / 2}
            y2={cardPosition === "bottom" ? cardTop : cardTop + 260}
            stroke="rgba(232, 160, 32, 0.4)"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
        </svg>
      )}

      {/* Tooltip */}
      {isStable && (
        <div
          className="fixed"
          style={{
            opacity: isVisible ? 1 : 0,
            animation: isVisible ? "tour-tooltip-in 0.25s ease forwards" : "none",
            ...tooltipStyle,
          }}
        >
          {/* Arrow (desktop only) */}
          {targetRect && !isMobile && (
            <div
              className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
              style={
                cardPosition === "bottom"
                  ? {
                      top: "-10px",
                      borderLeft: "10px solid transparent",
                      borderRight: "10px solid transparent",
                      borderBottom: `10px solid ${cardBg}`,
                      filter: "drop-shadow(0 -1px 3px rgba(0,0,0,0.3))",
                    }
                  : cardPosition === "top"
                    ? {
                        bottom: "-10px",
                        borderLeft: "10px solid transparent",
                        borderRight: "10px solid transparent",
                        borderTop: `10px solid ${cardBg}`,
                        filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.3))",
                      }
                    : { display: "none" }
              }
            />
          )}

          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: `linear-gradient(155deg, ${cardBg} 0%, rgba(15, 24, 44, 0.99) 100%)`,
              border: "1px solid rgba(232, 160, 32, 0.25)",
              boxShadow: "0 28px 72px rgba(0,0,0,0.60), 0 0 0 1px rgba(232,160,32,0.05) inset",
            }}
          >
            <div className="p-4 pb-2">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background: "linear-gradient(135deg, rgba(232,160,32,0.28), rgba(245,185,74,0.14))",
                    border: "1.5px solid rgba(232,160,32,0.35)",
                  }}
                >
                  <i className={`${currentTourStep.icon} text-lg`} style={{ color: accentGold }}></i>
                </div>
                <div className="flex-1 min-w-0">
                  {tourName && (
                    <p className="text-[10px] font-extrabold uppercase tracking-widest mb-0.5" style={{ color: "rgba(232,160,32,0.72)" }}>
                      {tourName}
                    </p>
                  )}
                  <h3 className="text-white font-extrabold text-sm leading-snug mb-1">
                    {currentTourStep.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.58)" }}>
                    {currentTourStep.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-4 pt-1 pb-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${accentGold}, ${accentLight})` }}
                  />
                </div>
                <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: "rgba(255,255,255,0.36)" }}>
                  {currentStep + 1}/{totalSteps}
                </span>
              </div>
              <div className="flex items-center justify-center gap-1.5 pt-2">
                {Array.from({ length: totalSteps }).map((_, idx) => (
                  <div
                    key={idx}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: idx === currentStep ? "22px" : "6px",
                      height: "6px",
                      background: idx === currentStep ? accentGold : idx < currentStep ? "rgba(232,160,32,0.38)" : "rgba(255,255,255,0.08)",
                      borderRadius: "999px",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="p-4 pt-2 flex items-center gap-2">
              <button
                onClick={handleSkip}
                className="flex-shrink-0 text-[11px] font-semibold cursor-pointer whitespace-nowrap px-2.5 py-2 rounded-xl hover:opacity-80 transition-all"
                style={{ color: "rgba(255,255,255,0.30)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                Pular tour
              </button>
              <div className="flex items-center gap-2 ml-auto">
                {!isFirst && (
                  <button
                    onClick={onPrev}
                    className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl font-bold cursor-pointer whitespace-nowrap transition-all"
                    style={{
                      color: "rgba(255,255,255,0.60)",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      fontSize: isMobile ? "11px" : "13px",
                    }}
                  >
                    <i className="ri-arrow-left-line text-xs"></i>
                    <span>Voltar</span>
                  </button>
                )}
                <button
                  onClick={isLast ? handleFinish : onNext}
                  className="flex-shrink-0 flex items-center gap-1 px-4 py-2 rounded-xl font-bold cursor-pointer whitespace-nowrap hover:opacity-90 transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${accentGold}, ${accentLight})`,
                    color: "#0D1629",
                    fontSize: isMobile ? "11px" : "13px",
                  }}
                >
                  {isLast ? (
                    <>
                      <i className="ri-check-line text-xs"></i>
                      <span>Finalizar</span>
                    </>
                  ) : (
                    <>
                      <span>Próximo</span>
                      <i className="ri-arrow-right-line text-xs"></i>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}