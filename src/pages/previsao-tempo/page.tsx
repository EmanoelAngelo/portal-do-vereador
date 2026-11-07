import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import { supabase } from "@/lib/supabase";

interface HourlyData {
  time: string;
  temp: number;
  weatherCode: number;
  precipitationProbability: number;
  windSpeed: number;
}

interface DailyData {
  date: string;
  dayLabel: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipitationProbability: number;
  windSpeed: number;
}

interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  weatherCode: number;
  windSpeed: number;
  precipitation: number;
  precipitationProbability: number;
  pressure: number;
  uvIndex: number;
  visibility: number;
  hourly: HourlyData[];
  allHourly: HourlyData[];
  daily: DailyData[];
  sunrise: string;
  sunset: string;
  updatedAt: string;
}

interface WeatherAlert {
  level: "orange" | "red";
  title: string;
  message: string;
  safety: string;
  icon: string;
}

const PELOTAS_LAT = -31.77;
const PELOTAS_LON = -52.34;

function getWeatherIcon(code: number, size = "text-base"): string {
  if (code === 0) return `ri-sun-line ${size}`;
  if (code === 1) return `ri-sun-cloudy-line ${size}`;
  if (code === 2) return `ri-cloudy-line ${size}`;
  if (code === 3) return `ri-cloudy-2-line ${size}`;
  if (code <= 48) return `ri-foggy-line ${size}`;
  if (code <= 57) return `ri-drizzle-line ${size}`;
  if (code <= 67) return `ri-rainy-line ${size}`;
  if (code <= 77) return `ri-snowy-line ${size}`;
  if (code <= 82) return `ri-showers-line ${size}`;
  if (code <= 86) return `ri-snowy-line ${size}`;
  if (code <= 99) return `ri-thunderstorms-line ${size}`;
  return `ri-question-line ${size}`;
}

function getWeatherIconColor(code: number): string {
  if (code === 0) return "text-amber-400";
  if (code === 1) return "text-amber-300";
  if (code === 2) return "text-yellow-200";
  if (code === 3) return "text-gray-400";
  if (code <= 48) return "text-gray-400";
  if (code <= 57) return "text-sky-300";
  if (code <= 67) return "text-sky-400";
  if (code <= 77) return "text-cyan-200";
  if (code <= 82) return "text-sky-400";
  if (code <= 86) return "text-cyan-200";
  if (code <= 99) return "text-yellow-400";
  return "text-gray-400";
}

function getWeatherLabel(code: number): string {
  if (code === 0) return "Céu limpo";
  if (code === 1) return "Predominantemente limpo";
  if (code === 2) return "Parcialmente nublado";
  if (code === 3) return "Nublado";
  if (code <= 48) return "Neblina";
  if (code <= 57) return "Garoa";
  if (code <= 67) return "Chuva";
  if (code <= 77) return "Neve";
  if (code <= 82) return "Pancadas de chuva";
  if (code <= 86) return "Neve";
  if (code <= 99) return "Tempestade";
  return "Desconhecido";
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  if (date.getTime() === today.getTime()) return "Hoje";
  if (date.getTime() === tomorrow.getTime()) return "Amanhã";
  return date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}

function getFullDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  });
}

function getHourLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

function getWeatherAlert(code: number, windSpeed: number): WeatherAlert | null {
  if (code >= 96) {
    return {
      level: "red",
      title: "ALERTA VERMELHO — GRANIZO",
      message: "Tempestade com granizo detectada em Pelotas/RS. Granizo pode causar danos a veículos, telhados e áreas abertas.",
      safety: "Evite sair de casa. Proteja veículos em garagem ou cobertura. Fique longe de janelas e portas de vidro. Não pare embaixo de árvores ou postes.",
      icon: "ri-alarm-warning-line",
    };
  }
  if (code >= 95) {
    return {
      level: "red",
      title: "ALERTA VERMELHO — TEMPESTADE ELÉTRICA",
      message: "Tempestade elétrica em andamento na região de Pelotas. Raios e trovoadas intensas podem ocorrer.",
      safety: "Procure abrigo seguro imediatamente. Fique em ambientes fechados e evite contato com água, metais e equipamentos elétricos. Desligue aparelhos sensíveis.",
      icon: "ri-thunderstorms-line",
    };
  }
  if (code >= 80) {
    return {
      level: "orange",
      title: "ALERTA LARANJA — CHUVA INTENSA",
      message: "Pancadas de chuva intensas previstas para Pelotas. Há risco de alagamentos em pontos críticos da cidade.",
      safety: "Reduza a velocidade ao dirigir e mantenha distância segura dos veículos da frente. Evite áreas de alagamento conhecidas. Não tente atravessar ruas alagadas.",
      icon: "ri-showers-line",
    };
  }
  if (code >= 65) {
    return {
      level: "orange",
      title: "ALERTA LARANJA — CHUVA FORTE",
      message: "Chuva forte prevista na região. Condições de trânsito podem ficar complicadas.",
      safety: "Cuidado em áreas de alagamento e estradas. Use faróis baixos ao dirigir. Evite sair se não for necessário. Mantenha documentos e eletrônicos protegidos.",
      icon: "ri-rainy-line",
    };
  }
  if (windSpeed >= 50) {
    return {
      level: "red",
      title: "ALERTA VERMELHO — VENTOS MUITO FORTES",
      message: `Ventos de ${windSpeed} km/h detectados em Pelotas/RS. Risco de queda de árvores, postes e estruturas frágeis.`,
      safety: "Evite áreas abertas, árvores e postes. Não fique próximo a janelas de vidro. Procure abrigo em local estruturalmente seguro. Resguarde objetos que podem ser arremessados.",
      icon: "ri-windy-line",
    };
  }
  if (windSpeed >= 30) {
    return {
      level: "orange",
      title: "ALERTA LARANJA — VENTOS FORTES",
      message: `Ventos de ${windSpeed} km/h previstos. Condições de ventania podem dificultar atividades ao ar livre e dirigibilidade.`,
      safety: "Cuidado ao dirigir, especialmente em veículos altos. Evite áreas com árvores altas ou placas soltas. Fique atento a queda de galhos. Proteja objetos leves no exterior.",
      icon: "ri-windy-line",
    };
  }
  return null;
}

function getDayAlert(daily: DailyData): WeatherAlert | null {
  return getWeatherAlert(daily.weatherCode, daily.windSpeed);
}

async function sendWeatherAlertNotification(alert: WeatherAlert) {
  try {
    const { data } = await supabase.functions.invoke("weather-alert-notify", {
      body: {
        alert: {
          level: alert.level,
          title: alert.title,
          message: alert.message,
          safety: alert.safety,
        },
        dateKey: new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      },
    });
    console.log("[Previsao] Alerta enviado:", data);
  } catch (err) {
    console.error("[Previsao] Falha ao enviar alerta:", err);
  }
}

const mockData: WeatherData = {
  temp: 9,
  feelsLike: 7,
  humidity: 70,
  weatherCode: 0,
  windSpeed: 16,
  precipitation: 0,
  precipitationProbability: 0,
  pressure: 1013,
  uvIndex: 0,
  visibility: 10,
  sunrise: "07:12",
  sunset: "17:45",
  updatedAt: new Date().toISOString(),
  hourly: [
    { time: "2026-06-17T09:00:00", temp: 11, weatherCode: 1, precipitationProbability: 0, windSpeed: 14 },
    { time: "2026-06-17T12:00:00", temp: 14, weatherCode: 2, precipitationProbability: 10, windSpeed: 16 },
    { time: "2026-06-17T15:00:00", temp: 17, weatherCode: 1, precipitationProbability: 5, windSpeed: 18 },
    { time: "2026-06-17T18:00:00", temp: 14, weatherCode: 0, precipitationProbability: 0, windSpeed: 15 },
    { time: "2026-06-17T21:00:00", temp: 9, weatherCode: 0, precipitationProbability: 0, windSpeed: 14 },
    { time: "2026-06-18T00:00:00", temp: 8, weatherCode: 0, precipitationProbability: 0, windSpeed: 12 },
    { time: "2026-06-18T03:00:00", temp: 7, weatherCode: 0, precipitationProbability: 0, windSpeed: 10 },
    { time: "2026-06-18T06:00:00", temp: 8, weatherCode: 1, precipitationProbability: 0, windSpeed: 12 },
  ],
  allHourly: [
    { time: "2026-06-17T00:00:00", temp: 6, weatherCode: 0, precipitationProbability: 0, windSpeed: 8 },
    { time: "2026-06-17T03:00:00", temp: 5, weatherCode: 0, precipitationProbability: 0, windSpeed: 6 },
    { time: "2026-06-17T06:00:00", temp: 8, weatherCode: 1, precipitationProbability: 0, windSpeed: 10 },
    { time: "2026-06-17T09:00:00", temp: 11, weatherCode: 1, precipitationProbability: 0, windSpeed: 14 },
    { time: "2026-06-17T12:00:00", temp: 14, weatherCode: 2, precipitationProbability: 10, windSpeed: 16 },
    { time: "2026-06-17T15:00:00", temp: 17, weatherCode: 1, precipitationProbability: 5, windSpeed: 18 },
    { time: "2026-06-17T18:00:00", temp: 14, weatherCode: 0, precipitationProbability: 0, windSpeed: 15 },
    { time: "2026-06-17T21:00:00", temp: 9, weatherCode: 0, precipitationProbability: 0, windSpeed: 14 },
    { time: "2026-06-18T00:00:00", temp: 8, weatherCode: 0, precipitationProbability: 0, windSpeed: 12 },
    { time: "2026-06-18T03:00:00", temp: 7, weatherCode: 0, precipitationProbability: 0, windSpeed: 10 },
    { time: "2026-06-18T06:00:00", temp: 8, weatherCode: 1, precipitationProbability: 0, windSpeed: 12 },
    { time: "2026-06-18T09:00:00", temp: 10, weatherCode: 3, precipitationProbability: 5, windSpeed: 11 },
    { time: "2026-06-18T12:00:00", temp: 14, weatherCode: 3, precipitationProbability: 15, windSpeed: 13 },
    { time: "2026-06-18T15:00:00", temp: 17, weatherCode: 2, precipitationProbability: 10, windSpeed: 14 },
    { time: "2026-06-18T18:00:00", temp: 13, weatherCode: 3, precipitationProbability: 20, windSpeed: 11 },
    { time: "2026-06-18T21:00:00", temp: 10, weatherCode: 3, precipitationProbability: 15, windSpeed: 10 },
    { time: "2026-06-19T00:00:00", temp: 9, weatherCode: 3, precipitationProbability: 10, windSpeed: 10 },
    { time: "2026-06-19T03:00:00", temp: 8, weatherCode: 61, precipitationProbability: 30, windSpeed: 12 },
    { time: "2026-06-19T06:00:00", temp: 9, weatherCode: 61, precipitationProbability: 40, windSpeed: 13 },
    { time: "2026-06-19T09:00:00", temp: 12, weatherCode: 61, precipitationProbability: 55, windSpeed: 15 },
    { time: "2026-06-19T12:00:00", temp: 15, weatherCode: 63, precipitationProbability: 60, windSpeed: 17 },
    { time: "2026-06-19T15:00:00", temp: 16, weatherCode: 63, precipitationProbability: 55, windSpeed: 18 },
    { time: "2026-06-19T18:00:00", temp: 14, weatherCode: 61, precipitationProbability: 50, windSpeed: 16 },
    { time: "2026-06-19T21:00:00", temp: 11, weatherCode: 61, precipitationProbability: 45, windSpeed: 15 },
    { time: "2026-06-20T00:00:00", temp: 10, weatherCode: 63, precipitationProbability: 65, windSpeed: 16 },
    { time: "2026-06-20T03:00:00", temp: 9, weatherCode: 63, precipitationProbability: 70, windSpeed: 18 },
    { time: "2026-06-20T06:00:00", temp: 8, weatherCode: 65, precipitationProbability: 75, windSpeed: 19 },
    { time: "2026-06-20T09:00:00", temp: 10, weatherCode: 65, precipitationProbability: 80, windSpeed: 20 },
    { time: "2026-06-20T12:00:00", temp: 13, weatherCode: 63, precipitationProbability: 75, windSpeed: 19 },
    { time: "2026-06-20T15:00:00", temp: 14, weatherCode: 63, precipitationProbability: 65, windSpeed: 18 },
    { time: "2026-06-20T18:00:00", temp: 12, weatherCode: 61, precipitationProbability: 55, windSpeed: 17 },
    { time: "2026-06-20T21:00:00", temp: 10, weatherCode: 61, precipitationProbability: 40, windSpeed: 15 },
    { time: "2026-06-21T00:00:00", temp: 8, weatherCode: 2, precipitationProbability: 20, windSpeed: 14 },
    { time: "2026-06-21T03:00:00", temp: 7, weatherCode: 1, precipitationProbability: 15, windSpeed: 13 },
    { time: "2026-06-21T06:00:00", temp: 8, weatherCode: 1, precipitationProbability: 10, windSpeed: 12 },
    { time: "2026-06-21T09:00:00", temp: 12, weatherCode: 2, precipitationProbability: 15, windSpeed: 14 },
    { time: "2026-06-21T12:00:00", temp: 15, weatherCode: 2, precipitationProbability: 25, windSpeed: 15 },
    { time: "2026-06-21T15:00:00", temp: 16, weatherCode: 1, precipitationProbability: 30, windSpeed: 16 },
    { time: "2026-06-21T18:00:00", temp: 13, weatherCode: 2, precipitationProbability: 20, windSpeed: 14 },
    { time: "2026-06-21T21:00:00", temp: 9, weatherCode: 0, precipitationProbability: 10, windSpeed: 13 },
    { time: "2026-06-22T00:00:00", temp: 7, weatherCode: 0, precipitationProbability: 5, windSpeed: 12 },
    { time: "2026-06-22T03:00:00", temp: 5, weatherCode: 0, precipitationProbability: 5, windSpeed: 10 },
    { time: "2026-06-22T06:00:00", temp: 6, weatherCode: 61, precipitationProbability: 25, windSpeed: 11 },
    { time: "2026-06-22T09:00:00", temp: 10, weatherCode: 61, precipitationProbability: 40, windSpeed: 14 },
    { time: "2026-06-22T12:00:00", temp: 14, weatherCode: 63, precipitationProbability: 55, windSpeed: 16 },
    { time: "2026-06-22T15:00:00", temp: 15, weatherCode: 61, precipitationProbability: 50, windSpeed: 17 },
    { time: "2026-06-22T18:00:00", temp: 13, weatherCode: 61, precipitationProbability: 45, windSpeed: 15 },
    { time: "2026-06-22T21:00:00", temp: 10, weatherCode: 2, precipitationProbability: 30, windSpeed: 14 },
    { time: "2026-06-23T00:00:00", temp: 6, weatherCode: 0, precipitationProbability: 0, windSpeed: 10 },
    { time: "2026-06-23T03:00:00", temp: 4, weatherCode: 0, precipitationProbability: 0, windSpeed: 8 },
    { time: "2026-06-23T06:00:00", temp: 5, weatherCode: 0, precipitationProbability: 0, windSpeed: 9 },
    { time: "2026-06-23T09:00:00", temp: 9, weatherCode: 0, precipitationProbability: 0, windSpeed: 10 },
    { time: "2026-06-23T12:00:00", temp: 13, weatherCode: 0, precipitationProbability: 0, windSpeed: 12 },
    { time: "2026-06-23T15:00:00", temp: 14, weatherCode: 0, precipitationProbability: 0, windSpeed: 11 },
    { time: "2026-06-23T18:00:00", temp: 11, weatherCode: 0, precipitationProbability: 0, windSpeed: 10 },
    { time: "2026-06-23T21:00:00", temp: 7, weatherCode: 0, precipitationProbability: 0, windSpeed: 9 },
  ],
  daily: [
    { date: "2026-06-17", dayLabel: "Hoje", tempMax: 17, tempMin: 5, weatherCode: 1, precipitationProbability: 5, windSpeed: 14 },
    { date: "2026-06-18", dayLabel: "Qui", tempMax: 17, tempMin: 6, weatherCode: 3, precipitationProbability: 20, windSpeed: 12 },
    { date: "2026-06-19", dayLabel: "Sex", tempMax: 16, tempMin: 7, weatherCode: 61, precipitationProbability: 60, windSpeed: 18 },
    { date: "2026-06-20", dayLabel: "Sáb", tempMax: 14, tempMin: 6, weatherCode: 63, precipitationProbability: 80, windSpeed: 20 },
    { date: "2026-06-21", dayLabel: "Dom", tempMax: 16, tempMin: 6, weatherCode: 2, precipitationProbability: 30, windSpeed: 15 },
    { date: "2026-06-22", dayLabel: "Seg", tempMax: 15, tempMin: 4, weatherCode: 61, precipitationProbability: 55, windSpeed: 17 },
    { date: "2026-06-23", dayLabel: "Ter", tempMax: 14, tempMin: 3, weatherCode: 0, precipitationProbability: 0, windSpeed: 12 },
  ],
};

export default function PrevisaoTempoPage() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"temp" | "precip" | "wind">("temp");
  const [error, setError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [alertSent, setAlertSent] = useState(false);
  const alertRef = useRef(false);
  const [hourlyExpanded, setHourlyExpanded] = useState(true);

  const fetchWeather = async () => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${PELOTAS_LAT}&longitude=${PELOTAS_LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation,pressure_msl,uv_index,visibility&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset&timezone=America%2FSao_Paulo&forecast_days=7&models=icon_seamless`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("API error");
      const json = await res.json();

      const current = json.current;
      const hourly = json.hourly;
      const daily = json.daily;

      const allHourlyData: HourlyData[] = [];
      for (let i = 0; i < hourly.time.length; i++) {
        allHourlyData.push({
          time: hourly.time[i],
          temp: Math.round(hourly.temperature_2m[i]),
          weatherCode: hourly.weather_code[i],
          precipitationProbability: hourly.precipitation_probability[i] ?? 0,
          windSpeed: Math.round(hourly.wind_speed_10m[i]),
        });
      }

      const now = new Date();
      const currentHour = now.getHours();
      const hourlyData: HourlyData[] = [];

      for (let i = 0; i < allHourlyData.length; i++) {
        const h = new Date(allHourlyData[i].time);
        const hLocal = h.toLocaleTimeString("pt-BR", { hour: "2-digit", timeZone: "America/Sao_Paulo" });
        const hNum = parseInt(hLocal.split(":")[0]);
        if (hNum >= currentHour && hourlyData.length < 12) {
          hourlyData.push(allHourlyData[i]);
        }
      }

      if (hourlyData.length < 12) {
        for (let i = 0; i < allHourlyData.length && hourlyData.length < 12; i++) {
          const h = new Date(allHourlyData[i].time);
          const hLocal = h.toLocaleTimeString("pt-BR", { hour: "2-digit", timeZone: "America/Sao_Paulo" });
          const hNum = parseInt(hLocal.split(":")[0]);
          if (hNum < currentHour) {
            const exists = hourlyData.find((hd) => hd.time === allHourlyData[i].time);
            if (!exists) {
              hourlyData.push(allHourlyData[i]);
            }
          }
        }
      }

      hourlyData.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

      const dailyData: DailyData[] = daily.time.map((t: string, i: number) => ({
        date: t,
        dayLabel: getDayLabel(t),
        tempMax: Math.round(daily.temperature_2m_max[i]),
        tempMin: Math.round(daily.temperature_2m_min[i]),
        weatherCode: daily.weather_code[i],
        precipitationProbability: daily.precipitation_probability_max[i] ?? 0,
        windSpeed: Math.round(daily.wind_speed_10m_max[i]),
      }));

      const weatherData: WeatherData = {
        temp: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        weatherCode: current.weather_code,
        windSpeed: Math.round(current.wind_speed_10m),
        precipitation: current.precipitation ?? 0,
        precipitationProbability: hourly.precipitation_probability?.[0] ?? 0,
        pressure: Math.round(current.pressure_msl ?? 1013),
        uvIndex: Math.round(current.uv_index ?? 0),
        visibility: Math.round((current.visibility ?? 10) / 1000),
        sunrise: daily.sunrise[0] ? new Date(daily.sunrise[0]).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "07:00",
        sunset: daily.sunset[0] ? new Date(daily.sunset[0]).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "18:00",
        updatedAt: new Date().toISOString(),
        hourly: hourlyData.slice(0, 12),
        allHourly: allHourlyData,
        daily: dailyData,
      };

      setData(weatherData);
      setLastUpdate(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }));
      setError(false);
      setAlertSent(false);
      alertRef.current = false;
    } catch (err) {
      console.error("[Previsao] API error:", err);
      setError(true);
      setData(mockData);
      setLastUpdate(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await fetchWeather();
    };
    run();
    const interval = setInterval(() => {
      if (!cancelled) fetchWeather();
    }, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Calcular alerta baseado no dia selecionado
  const alert = useMemo(() => {
    if (!data) return null;
    if (selectedDayIndex === 0) {
      return getWeatherAlert(data.weatherCode, data.windSpeed);
    }
    const selectedDay = data.daily[selectedDayIndex];
    if (!selectedDay) return null;
    return getDayAlert(selectedDay);
  }, [data, selectedDayIndex]);

  // Enviar notificação de alerta quando detectado
  useEffect(() => {
    if (alert && !alertRef.current && !alertSent) {
      alertRef.current = true;
      setAlertSent(true);
      sendWeatherAlertNotification(alert);
    }
  }, [alert, alertSent]);

  // Dados do dia selecionado para o card principal
  const selectedDay = data?.daily[selectedDayIndex];
  const isToday = selectedDayIndex === 0;

  const displayTemp = isToday ? data?.temp : selectedDay?.tempMax;
  const displayFeelsLike = isToday ? data?.feelsLike : Math.round((selectedDay?.tempMax ?? 0) - 3);
  const displayWeatherCode = isToday ? data?.weatherCode : selectedDay?.weatherCode;
  const displayWindSpeed = isToday ? data?.windSpeed : selectedDay?.windSpeed;
  const displayPrecipProb = isToday ? data?.precipitationProbability : selectedDay?.precipitationProbability;
  const displayLabel = isToday ? getWeatherLabel(displayWeatherCode ?? 0) : getWeatherLabel(displayWeatherCode ?? 0);
  const displayDate = isToday
    ? "Agora"
    : selectedDay
      ? getFullDateLabel(selectedDay.date)
      : "";

  // Filtrar horas do dia selecionado
  const filteredHourly = useMemo(() => {
    if (!data) return [];
    if (selectedDayIndex === 0) return data.hourly;
    const selectedDate = data.daily[selectedDayIndex]?.date;
    if (!selectedDate) return [];
    return data.allHourly.filter((h) => h.time.startsWith(selectedDate));
  }, [data, selectedDayIndex]);

  return (
    <div className="min-h-screen bg-[#020C1B]">
      <Navbar />
      <main className="max-w-screen-xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link to="/" className="text-white/40 text-xs hover:text-white/70 transition-colors flex items-center gap-1">
            <i className="ri-arrow-left-line text-[10px]"></i>
            <span>Voltar ao início</span>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-white/40">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
              <span>Carregando previsão do tempo...</span>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Page title */}
            <div>
              <h1 className="text-white text-2xl md:text-3xl font-bold">
                Previsão do Tempo
              </h1>
              <p className="text-white/40 text-sm mt-1">
                Pelotas, Rio Grande do Sul · Atualizado às {lastUpdate}
                {error && <span className="text-amber-400 ml-2">(dados offline)</span>}
              </p>
            </div>

            {/* Alert Banner */}
            {alert ? (
              <div
                className={`rounded-2xl p-4 md:p-5 border ${
                  alert.level === "red"
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-orange-500/10 border-orange-500/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 ${
                    alert.level === "red" ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"
                  }`}>
                    <i className={`${alert.icon} text-sm`}></i>
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${
                      alert.level === "red" ? "text-red-400" : "text-orange-400"
                    }`}>
                      {alert.title}
                    </p>
                    <p className="text-white/60 text-xs mt-1">{alert.message}</p>
                    {alert.safety && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-[#3BBFD4] text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                          Recomendações de segurança
                        </p>
                        <p className="text-white/70 text-xs leading-relaxed">{alert.safety}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-4 md:p-5 border bg-emerald-500/10 border-emerald-500/30">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 bg-emerald-500/20 text-emerald-400">
                    <i className="ri-shield-check-line text-sm"></i>
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-emerald-400 text-sm font-bold">
                      Tempo Estável
                    </p>
                    <p className="text-white/60 text-xs mt-1">
                      Sem nenhum alerta no momento. As condições meteorológicas estão dentro da normalidade para a região de Pelotas.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Current weather card */}
            <div className="bg-[#0D1629]/80 rounded-2xl border border-white/10 p-6 md:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div className={`w-20 h-20 flex items-center justify-center shrink-0 ${getWeatherIconColor(displayWeatherCode ?? 0)}`}>
                  <i className={getWeatherIcon(displayWeatherCode ?? 0, "text-6xl")}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-white text-7xl font-light">{displayTemp}</span>
                    <span className="text-white/50 text-3xl">°C</span>
                  </div>
                  <p className="text-white/60 text-lg mt-1">{displayLabel}</p>
                  <p className="text-white/40 text-sm mt-0.5">
                    {isToday ? `Sensação de ${displayFeelsLike}°C` : `Máxima ${selectedDay?.tempMax}°C · Mínima ${selectedDay?.tempMin}°C`}
                  </p>
                  <p className="text-[#3BBFD4] text-xs font-medium mt-1">{displayDate}</p>
                </div>
                {isToday ? (
                  <div className="grid grid-cols-3 lg:grid-cols-2 gap-3 lg:gap-4">
                    <div className="text-center">
                      <div className="w-9 h-9 mx-auto flex items-center justify-center text-[#3BBFD4] bg-[#3BBFD4]/10 rounded-xl">
                        <i className="ri-drop-line text-sm"></i>
                      </div>
                      <p className="text-white/40 text-[10px] mt-1">Umidade</p>
                      <p className="text-white text-sm font-semibold">{data.humidity}%</p>
                    </div>
                    <div className="text-center">
                      <div className="w-9 h-9 mx-auto flex items-center justify-center text-[#3BBFD4] bg-[#3BBFD4]/10 rounded-xl">
                        <i className="ri-windy-line text-sm"></i>
                      </div>
                      <p className="text-white/40 text-[10px] mt-1">Vento</p>
                      <p className="text-white text-sm font-semibold">{displayWindSpeed} km/h</p>
                    </div>
                    <div className="text-center">
                      <div className="w-9 h-9 mx-auto flex items-center justify-center text-[#3BBFD4] bg-[#3BBFD4]/10 rounded-xl">
                        <i className="ri-rainy-line text-sm"></i>
                      </div>
                      <p className="text-white/40 text-[10px] mt-1">Chuva</p>
                      <p className="text-white text-sm font-semibold">{displayPrecipProb}%</p>
                    </div>
                    <div className="text-center">
                      <div className="w-9 h-9 mx-auto flex items-center justify-center text-[#3BBFD4] bg-[#3BBFD4]/10 rounded-xl">
                        <i className="ri-dashboard-line text-sm"></i>
                      </div>
                      <p className="text-white/40 text-[10px] mt-1">Pressão</p>
                      <p className="text-white text-sm font-semibold">{data.pressure} hPa</p>
                    </div>
                    <div className="text-center">
                      <div className="w-9 h-9 mx-auto flex items-center justify-center text-[#E8A020] bg-[#E8A020]/10 rounded-xl">
                        <i className="ri-sun-line text-sm"></i>
                      </div>
                      <p className="text-white/40 text-[10px] mt-1">Índice UV</p>
                      <p className="text-white text-sm font-semibold">{data.uvIndex}</p>
                    </div>
                    <div className="text-center">
                      <div className="w-9 h-9 mx-auto flex items-center justify-center text-[#3BBFD4] bg-[#3BBFD4]/10 rounded-xl">
                        <i className="ri-eye-line text-sm"></i>
                      </div>
                      <p className="text-white/40 text-[10px] mt-1">Visibilidade</p>
                      <p className="text-white text-sm font-semibold">{data.visibility} km</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 lg:gap-4">
                    <div className="text-center">
                      <div className="w-9 h-9 mx-auto flex items-center justify-center text-[#E8A020] bg-[#E8A020]/10 rounded-xl">
                        <i className="ri-arrow-up-line text-sm"></i>
                      </div>
                      <p className="text-white/40 text-[10px] mt-1">Máxima</p>
                      <p className="text-white text-sm font-semibold">{selectedDay?.tempMax}°C</p>
                    </div>
                    <div className="text-center">
                      <div className="w-9 h-9 mx-auto flex items-center justify-center text-sky-400 bg-sky-400/10 rounded-xl">
                        <i className="ri-arrow-down-line text-sm"></i>
                      </div>
                      <p className="text-white/40 text-[10px] mt-1">Mínima</p>
                      <p className="text-white text-sm font-semibold">{selectedDay?.tempMin}°C</p>
                    </div>
                    <div className="text-center">
                      <div className="w-9 h-9 mx-auto flex items-center justify-center text-[#3BBFD4] bg-[#3BBFD4]/10 rounded-xl">
                        <i className="ri-windy-line text-sm"></i>
                      </div>
                      <p className="text-white/40 text-[10px] mt-1">Vento</p>
                      <p className="text-white text-sm font-semibold">{displayWindSpeed} km/h</p>
                    </div>
                    <div className="text-center">
                      <div className="w-9 h-9 mx-auto flex items-center justify-center text-[#3BBFD4] bg-[#3BBFD4]/10 rounded-xl">
                        <i className="ri-rainy-line text-sm"></i>
                      </div>
                      <p className="text-white/40 text-[10px] mt-1">Chuva</p>
                      <p className="text-white text-sm font-semibold">{displayPrecipProb}%</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Nascer/Pôr do sol */}
            <div className="bg-[#0D1629]/80 rounded-2xl border border-white/10 p-5 flex items-center justify-center gap-10">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 flex items-center justify-center text-[#E8A020] bg-[#E8A020]/10 rounded-lg">
                  <i className="ri-sun-line text-sm"></i>
                </span>
                <div>
                  <p className="text-white/40 text-xs">Nascer do sol</p>
                  <p className="text-white text-sm font-semibold">{data.sunrise}</p>
                </div>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 flex items-center justify-center text-orange-400 bg-orange-400/10 rounded-lg">
                  <i className="ri-moon-line text-sm"></i>
                </span>
                <div>
                  <p className="text-white/40 text-xs">Pôr do sol</p>
                  <p className="text-white text-sm font-semibold">{data.sunset}</p>
                </div>
              </div>
            </div>

            {/* Hourly forecast */}
            {(filteredHourly.length > 0) && (
              <div className="bg-[#0D1629]/80 rounded-2xl border border-white/10 p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold text-sm">
                      {isToday ? "Próximas horas" : `Previsão horária`}
                    </h3>
                    <span className="text-white/20 text-[10px]">
                      ({filteredHourly.length} horários)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5">
                      {(["temp", "precip", "wind"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === tab ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                          }`}
                        >
                          {tab === "temp" ? "Temp." : tab === "precip" ? "Chuva" : "Vento"}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setHourlyExpanded(!hourlyExpanded)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer shrink-0"
                      title={hourlyExpanded ? "Minimizar" : "Maximizar"}
                    >
                      <i className={`${hourlyExpanded ? "ri-subtract-line" : "ri-add-line"} text-sm`}></i>
                    </button>
                  </div>
                </div>

                {/* Collapsible content */}
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    hourlyExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  {/* Mobile/Tablet: lista vertical */}
                  <div className="lg:hidden space-y-2">
                    {filteredHourly.map((h, i) => {
                      const val = activeTab === "temp" ? h.temp : activeTab === "precip" ? h.precipitationProbability : h.windSpeed;
                      const unit = activeTab === "temp" ? "°" : activeTab === "precip" ? "%" : " km/h";
                      const barColor = activeTab === "temp"
                        ? h.temp > 15 ? "bg-[#E8A020]" : h.temp > 10 ? "bg-[#3BBFD4]" : "bg-sky-400"
                        : activeTab === "precip"
                          ? h.precipitationProbability > 50 ? "bg-[#3BBFD4]" : "bg-sky-400"
                          : "bg-white/20";
                      const barWidth = activeTab === "temp"
                        ? Math.max(4, ((h.temp + 5) / 30) * 100)
                        : activeTab === "precip"
                          ? Math.max(4, h.precipitationProbability)
                          : Math.max(4, (h.windSpeed / 25) * 100);
                      return (
                        <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white/5">
                          <span className="text-white/50 text-xs font-medium w-12 shrink-0">
                            {getHourLabel(h.time)}
                          </span>
                          <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${getWeatherIconColor(h.weatherCode)}`}>
                            <i className={getWeatherIcon(h.weatherCode, "text-base")}></i>
                          </div>
                          <span className="text-white/40 text-xs w-20 shrink-0 hidden xs:block">
                            {getWeatherLabel(h.weatherCode)}
                          </span>
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${barColor}`}
                                style={{ width: `${barWidth}%`, minWidth: "2px" }}
                              ></div>
                            </div>
                            <span className="text-white text-xs font-semibold w-14 text-right shrink-0">
                              {val}{unit}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop: cards horizontais com scroll */}
                  <div className="hidden lg:relative">
                    <div
                      className="overflow-x-auto snap-x snap-mandatory"
                      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                    >
                      <div className="flex gap-4 pb-3 px-1">
                        {filteredHourly.map((h, i) => {
                          const val = activeTab === "temp" ? h.temp : activeTab === "precip" ? h.precipitationProbability : h.windSpeed;
                          const unit = activeTab === "temp" ? "°" : activeTab === "precip" ? "%" : " km/h";
                          const barHeight = activeTab === "temp"
                            ? Math.max(8, ((h.temp + 5) / 30) * 100)
                            : activeTab === "precip"
                              ? Math.max(8, h.precipitationProbability)
                              : Math.max(8, (h.windSpeed / 25) * 100);
                          const barColor = activeTab === "temp"
                            ? h.temp > 15 ? "bg-[#E8A020]" : h.temp > 10 ? "bg-[#3BBFD4]" : "bg-sky-400"
                            : activeTab === "precip"
                              ? h.precipitationProbability > 50 ? "bg-[#3BBFD4]" : "bg-sky-400"
                              : "bg-white/20";
                          return (
                            <div
                              key={i}
                              className="flex flex-col items-center gap-2 min-w-[72px] snap-start"
                            >
                              <span className="text-white/40 text-[10px] whitespace-nowrap">
                                {getHourLabel(h.time)}
                              </span>
                              <div className={`w-9 h-9 flex items-center justify-center ${getWeatherIconColor(h.weatherCode)}`}>
                                <i className={getWeatherIcon(h.weatherCode, "text-base")}></i>
                              </div>
                              <div className="w-full bg-white/5 rounded-full h-14 relative flex items-end overflow-hidden">
                                <div
                                  className={`w-full rounded-full ${barColor} transition-all`}
                                  style={{ height: `${barHeight}%`, minHeight: "4px" }}
                                ></div>
                              </div>
                              <span className="text-white text-xs font-semibold whitespace-nowrap">{val}{unit}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Scroll indicator */}
                    <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0D1629] to-transparent pointer-events-none"></div>
                  </div>
                </div>
              </div>
            )}

            {/* 7-Day forecast */}
            <div className="bg-[#0D1629]/80 rounded-2xl border border-white/10 p-5 md:p-6">
              <h3 className="text-white font-semibold text-sm mb-5">Previsão de 7 dias</h3>
              <div className="space-y-0.5">
                {data.daily.map((day, i) => {
                  const isSelected = selectedDayIndex === i;
                  const dayAlert = getDayAlert(day);
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedDayIndex(i);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full flex items-center gap-3 py-3 px-3 rounded-xl transition-all text-left cursor-pointer ${
                        isSelected ? "bg-white/10 ring-1 ring-white/20" : "hover:bg-white/5"
                      }`}
                    >
                      {/* Day label */}
                      <span className={`text-sm font-semibold w-14 shrink-0 ${isSelected ? "text-white" : "text-white/50"}`}>
                        {day.dayLabel}
                      </span>

                      {/* Icon */}
                      <div className={`w-7 h-7 flex items-center justify-center shrink-0 ${getWeatherIconColor(day.weatherCode)}`}>
                        <i className={getWeatherIcon(day.weatherCode, "text-sm")}></i>
                      </div>

                      {/* Weather label */}
                      <span className="text-white/40 text-xs w-24 shrink-0 hidden lg:block">
                        {getWeatherLabel(day.weatherCode)}
                      </span>

                      {/* Alert badge */}
                      {dayAlert && (
                        <span className={`hidden lg:flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                          dayAlert.level === "red" ? "bg-red-500/15 text-red-400" : "bg-orange-500/15 text-orange-400"
                        }`}>
                          <i className={`${dayAlert.icon} text-[8px]`}></i>
                          {dayAlert.level === "red" ? "Alerta" : "Atenção"}
                        </span>
                      )}

                      {/* Precipitation bar */}
                      <div className="flex-1 mx-2 hidden lg:flex items-center gap-2">
                        <span className="text-[#3BBFD4] text-[10px] w-4 text-right">{day.precipitationProbability}%</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/5">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${day.precipitationProbability}%`,
                              background: day.precipitationProbability > 50 ? "#3BBFD4" : "rgba(59,191,212,0.4)",
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Rain % (mobile/tablet) */}
                      <span className="text-[#3BBFD4] text-xs lg:hidden">{day.precipitationProbability}%</span>

                      {/* Min/Max temps */}
                      <div className="flex items-center gap-3 shrink-0 ml-auto">
                        <span className="text-white text-sm font-bold w-8 text-right">{day.tempMax}°</span>
                        <span className="text-white/40 text-sm w-8 text-right">{day.tempMin}°</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-white/30 text-[10px] mt-3 pl-3">
                Clique em um dia para ver os detalhes da previsão
              </p>
            </div>

            {/* Additional info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-[#0D1629]/80 rounded-2xl border border-white/10 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 flex items-center justify-center text-[#3BBFD4] bg-[#3BBFD4]/10 rounded-lg">
                    <i className="ri-water-percent-line text-sm"></i>
                  </span>
                  <span className="text-white/60 text-xs font-semibold">Umidade relativa</span>
                </div>
                <p className="text-white text-2xl font-light">{data.humidity}%</p>
                <p className="text-white/40 text-xs mt-1">
                  {data.humidity > 70 ? "Ar úmido" : data.humidity < 40 ? "Ar seco" : "Confortável"}
                </p>
              </div>
              <div className="bg-[#0D1629]/80 rounded-2xl border border-white/10 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 flex items-center justify-center text-[#3BBFD4] bg-[#3BBFD4]/10 rounded-lg">
                    <i className="ri-windy-line text-sm"></i>
                  </span>
                  <span className="text-white/60 text-xs font-semibold">Velocidade do vento</span>
                </div>
                <p className="text-white text-2xl font-light">{data.windSpeed} <span className="text-base text-white/40">km/h</span></p>
                <p className="text-white/40 text-xs mt-1">
                  {data.windSpeed < 10 ? "Calmo" : data.windSpeed < 20 ? "Moderado" : "Forte"}
                </p>
              </div>
              <div className="bg-[#0D1629]/80 rounded-2xl border border-white/10 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 flex items-center justify-center text-[#3BBFD4] bg-[#3BBFD4]/10 rounded-lg">
                    <i className="ri-dashboard-line text-sm"></i>
                  </span>
                  <span className="text-white/60 text-xs font-semibold">Pressão atmosférica</span>
                </div>
                <p className="text-white text-2xl font-light">{data.pressure} <span className="text-base text-white/40">hPa</span></p>
                <p className="text-white/40 text-xs mt-1">
                  {data.pressure > 1020 ? "Alta pressão" : data.pressure < 1010 ? "Baixa pressão" : "Normal"}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}