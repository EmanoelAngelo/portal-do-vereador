import { useState, useEffect, useCallback, useRef } from "react";

export interface TourStep {
  target: string;
  title: string;
  description: string;
  icon: string;
  position?: "top" | "bottom" | "left" | "right";
}

export interface TourDefinition {
  id: string;
  name: string;
  steps: TourStep[];
}

const TOUR_STORAGE_PREFIX = "ah_tour_completed_";
const TOUR_WELCOME_PREFIX = "ah_tour_welcome_";

function getCompletedKey(userId: string): string {
  return `${TOUR_STORAGE_PREFIX}${userId}`;
}

function getCompletedTours(userId: string): string[] {
  try {
    const raw = localStorage.getItem(getCompletedKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markTourCompleted(userId: string, tourId: string): void {
  try {
    const completed = getCompletedTours(userId);
    if (!completed.includes(tourId)) {
      completed.push(tourId);
      localStorage.setItem(getCompletedKey(userId), JSON.stringify(completed));
    }
  } catch {
    // ignora
  }
}

/**
 * Hook do Tour Guiado.
 *
 * Regras:
 * 1. Auto-start só se sessionStorage tem "ah_tour_welcome_{userId}" (setado pelo complete-profile).
 * 2. Usuário padrão NUNCA recebe auto-start.
 * 3. Botão "?" sempre disponível pra iniciar manualmente.
 */
export function useTour(tourDef: TourDefinition | null, autoStart: boolean = false) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const autoStartAttempted = useRef(false);
  const autoStartCompletedRef = useRef(false);

  const totalSteps = tourDef?.steps.length ?? 0;

  const getUserId = useCallback((): string => {
    try {
      const raw = sessionStorage.getItem("ah_session");
      if (!raw) return "unknown";
      const stored = JSON.parse(raw);
      return stored?.id || "unknown";
    } catch {
      return "unknown";
    }
  }, []);

  const userId = getUserId();

  const isCompleted = tourDef ? getCompletedTours(userId).includes(tourDef.id) : true;

  const hasWelcomeFlag = (): boolean => {
    try {
      return sessionStorage.getItem(`${TOUR_WELCOME_PREFIX}${userId}`) === "1";
    } catch {
      return false;
    }
  };

  const consumeWelcomeFlag = (): void => {
    try {
      sessionStorage.removeItem(`${TOUR_WELCOME_PREFIX}${userId}`);
    } catch {
      // ignora
    }
  };

  // Auto-start
  // ⚠️ CORREÇÃO DEFINITIVA: NÃO consumir a flag nem setar autoStartAttempted
  // ANTES do timer disparar. Se o React limpar o efeito (re-render), a flag
  // sobrevive no sessionStorage e o próximo efeito tenta de novo.
  // Só marca como "completado" quando o timer REALMENTE dispara.
  useEffect(() => {
    if (!tourDef || !autoStart) return;

    // Se já completou o auto-start com sucesso, nunca mais tenta
    if (autoStartCompletedRef.current) return;

    // Lê a flag diretamente do sessionStorage
    let hasFlag = false;
    try {
      hasFlag = sessionStorage.getItem(`${TOUR_WELCOME_PREFIX}${userId}`) === "1";
    } catch {
      // ignora
    }

    if (!hasFlag) return;

    // Limpa tours completados anteriores para forçar o auto-start
    // (cenário: admin editou email → mesmo userId, tour já foi feito antes)
    if (isCompleted) {
      try {
        localStorage.removeItem(getCompletedKey(userId));
      } catch {
        // ignora
      }
    }

    // ⚠️ NÃO consome a flag aqui — só quando o timer disparar
    // ⚠️ NÃO seta autoStartAttempted aqui — só quando o timer disparar

    const timer = setTimeout(() => {
      // Agora sim: timer disparou, consome a flag e marca como completado
      autoStartCompletedRef.current = true;
      try {
        sessionStorage.removeItem(`${TOUR_WELCOME_PREFIX}${userId}`);
      } catch {
        // ignora
      }
      setIsActive(true);
      setCurrentStep(0);
    }, 1000);

    return () => clearTimeout(timer);
    // NOTA: isCompleted e userId nas deps são seguros porque:
    // - Se o efeito for limpo, a flag AINDA está no sessionStorage
    // - O próximo efeito começa do zero (autoStartCompletedRef ainda false)
    // - Só marca completed quando o timer REALMENTE dispara
  }, [tourDef, autoStart, isCompleted, userId]);

  /**
   * Inicia o tour.
   * Se onBeforeStart for fornecida, executa a callback ANTES de iniciar
   * (ex: redirecionar para a aba home do painel).
   * O tour começa após um delay de 400ms para garantir que o DOM esteja pronto.
   */
  const startTour = useCallback((onBeforeStart?: () => void) => {
    if (!tourDef) return;
    if (onBeforeStart) {
      onBeforeStart();
      // Aguarda o DOM atualizar (aba mudar, elementos renderizarem)
      setTimeout(() => {
        setIsActive(true);
        setCurrentStep(0);
      }, 450);
    } else {
      setIsActive(true);
      setCurrentStep(0);
    }
  }, [tourDef]);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev >= totalSteps - 1) {
        if (tourDef) markTourCompleted(userId, tourDef.id);
        setIsActive(false);
        return prev;
      }
      return prev + 1;
    });
  }, [totalSteps, tourDef, userId]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const skipTour = useCallback(() => {
    if (tourDef) markTourCompleted(userId, tourDef.id);
    setIsActive(false);
    setCurrentStep(0);
  }, [tourDef, userId]);

  const finishTour = useCallback(() => {
    if (tourDef) markTourCompleted(userId, tourDef.id);
    setIsActive(false);
    setCurrentStep(0);
  }, [tourDef, userId]);

  const currentTourStep: TourStep | null =
    tourDef && currentStep < totalSteps ? tourDef.steps[currentStep] : null;

  return {
    isActive,
    currentStep,
    totalSteps,
    currentTourStep,
    isCompleted,
    startTour,   // startTour(onBeforeStart?: () => void)
    nextStep,
    prevStep,
    skipTour,
    finishTour,
  };
}