import React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  daily: DailyData[];
  sunrise: string;
  sunset: string;
  updatedAt: string;
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
  if (code <= 82) return "Pancadas";
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

function getHourLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
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
    { time: "2026-06-16T21:00:00", temp: 9, weatherCode: 0, precipitationProbability: 0, windSpeed: 14 },
    { time: "2026-06-16T22:00:00", temp: 8, weatherCode: 0, precipitationProbability: 0, windSpeed: 13 },
    { time: "2026-06-16T23:00:00", temp: 8, weatherCode: 0, precipitationProbability: 0, windSpeed: 12 },
    { time: "2026-06-17T00:00:00", temp: 8, weatherCode: 0, precipitationProbability: 0, windSpeed: 12 },
    { time: "2026-06-17T01:00:00", temp: 7, weatherCode: 0, precipitationProbability: 0, windSpeed: 11 },
    { time: "2026-06-17T02:00:00", temp: 7, weatherCode: 0, precipitationProbability: 0, windSpeed: 11 },
    { time: "2026-06-17T03:00:00", temp: 7, weatherCode: 0, precipitationProbability: 0, windSpeed: 10 },
    { time: "2026-06-17T06:00:00", temp: 8, weatherCode: 1, precipitationProbability: 0, windSpeed: 12 },
    { time: "2026-06-17T09:00:00", temp: 11, weatherCode: 1, precipitationProbability: 0, windSpeed: 14 },
    { time: "2026-06-17T12:00:00", temp: 14, weatherCode: 2, precipitationProbability: 10, windSpeed: 16 },
    { time: "2026-06-17T15:00:00", temp: 17, weatherCode: 1, precipitationProbability: 5, windSpeed: 18 },
    { time: "2026-06-17T18:00:00", temp: 14, weatherCode: 0, precipitationProbability: 0, windSpeed: 15 },
  ],
  daily: [
    { date: "2026-06-16", dayLabel: "Ter", tempMax: 17, tempMin: 1, weatherCode: 0, precipitationProbability: 0, windSpeed: 16 },
    { date: "2026-06-17", dayLabel: "Qua", tempMax: 17, tempMin: 5, weatherCode: 1, precipitationProbability: 5, windSpeed: 14 },
    { date: "2026-06-18", dayLabel: "Qui", tempMax: 17, tempMin: 6, weatherCode: 3, precipitationProbability: 20, windSpeed: 12 },
    { date: "2026-06-19", dayLabel: "Sex", tempMax: 16, tempMin: 7, weatherCode: 61, precipitationProbability: 60, windSpeed: 18 },
    { date: "2026-06-20", dayLabel: "Sáb", tempMax: 14, tempMin: 6, weatherCode: 63, precipitationProbability: 80, windSpeed: 20 },
    { date: "2026-06-21", dayLabel: "Dom", tempMax: 16, tempMin: 6, weatherCode: 2, precipitationProbability: 30, windSpeed: 15 },
    { date: "2026-06-22", dayLabel: "Seg", tempMax: 15, tempMin: 4, weatherCode: 61, precipitationProbability: 55, windSpeed: 17 },
  ],
};

interface WeatherWidgetProps {
  compact?: boolean;
  variant?: "dark" | "light" | "home";
}

// BUGFIX B3: Deteccao de alerta de tempo reutilizada do previsao-tempo
function getWeatherAlertWidget(code: number, windSpeed: number): { level: "orange" | "red"; title: string; message: string; safety: string } | null {
  if (code >= 96) return { level: "red", title: "ALERTA VERMELHO — GRANIZO", message: "Tempestade com granizo detectada em Pelotas. Risco de danos.", safety: "Evite sair. Proteja veiculos. Fique longe de janelas." };
  if (code >= 95) return { level: "red", title: "ALERTA VERMELHO — TEMPESTADE ELETRICA", message: "Tempestade eletrica em Pelotas. Raios intensos.", safety: "Busque abrigo seguro. Evite agua e metais." };
  if (code >= 80) return { level: "orange", title: "ALERTA LARANJA — CHUVA INTENSA", message: "Chuvas intensas em Pelotas. Risco de alagamentos.", safety: "Reduza velocidade ao dirigir. Evite areas alagadas." };
  if (code >= 65) return { level: "orange", title: "ALERTA LARANJA — CHUVA FORTE", message: "Chuva forte em Pelotas. Transito complicado.", safety: "Cuidado em areas de alagamento. Use farois baixos." };
  if (windSpeed >= 50) return { level: "red", title: "ALERTA VERMELHO — VENTOS FORTES", message: `Ventos de ${windSpeed} km/h em Pelotas. Risco de quedas.`, safety: "Evite areas abertas e arvores. Busque abrigo." };
  if (windSpeed >= 30) return { level: "orange", title: "ALERTA LARANJA — VENTOS MODERADOS", message: `Ventos de ${windSpeed} km/h. Cuidado ao ar livre.`, safety: "Cuidado ao dirigir. Proteja objetos soltos." };
  return null;
}

export default function WeatherWidget({ compact = false, variant = "dark" }: WeatherWidgetProps) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"temp" | "precip" | "wind">("temp");
  const [error, setError] = useState(false);
  const alertSentRef = React.useRef(false);
  
  // BUGFIX B3: Enviar alerta de tempo em segundo plano quando detectado
  useEffect(() => {
    if (!data || alertSentRef.current) return;
    const alert = getWeatherAlertWidget(data.weatherCode, data.windSpeed);
    if (alert) {
      alertSentRef.current = true;
      supabase.functions.invoke("weather-alert-notify", {
        body: {
          alert: { level: alert.level, title: alert.title, message: alert.message, safety: alert.safety },
          dateKey: new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        },
      }).catch(() => {});
    }
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    const fetchWeather = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${PELOTAS_LAT}&longitude=${PELOTAS_LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation,pressure_msl,uv_index,visibility&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset&timezone=America%2FSao_Paulo&forecast_days=7&models=icon_seamless`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("API error");
        const json = await res.json();
        if (cancelled) return;
        
        const current = json.current;
        const hourly = json.hourly;
        const daily = json.daily;
        
        const now = new Date();
        const currentHour = now.getHours();
        const hourlyData: HourlyData[] = [];
        
        for (let i = 0; i < hourly.time.length; i++) {
          const h = new Date(hourly.time[i]);
          const hLocal = h.toLocaleTimeString("pt-BR", { hour: "2-digit", timeZone: "America/Sao_Paulo" });
          const hNum = parseInt(hLocal.split(":")[0]);
          
          if (hNum >= currentHour && hourlyData.length < 12) {
            hourlyData.push({
              time: hourly.time[i],
              temp: Math.round(hourly.temperature_2m[i]),
              weatherCode: hourly.weather_code[i],
              precipitationProbability: hourly.precipitation_probability[i] ?? 0,
              windSpeed: Math.round(hourly.wind_speed_10m[i]),
            });
          }
        }
        
        if (hourlyData.length < 12) {
          for (let i = 0; i < hourly.time.length && hourlyData.length < 12; i++) {
            const h = new Date(hourly.time[i]);
            const hLocal = h.toLocaleTimeString("pt-BR", { hour: "2-digit", timeZone: "America/Sao_Paulo" });
            const hNum = parseInt(hLocal.split(":")[0]);
            
            if (hNum < currentHour) {
              const exists = hourlyData.find(hd => hd.time === hourly.time[i]);
              if (!exists) {
                hourlyData.push({
                  time: hourly.time[i],
                  temp: Math.round(hourly.temperature_2m[i]),
                  weatherCode: hourly.weather_code[i],
                  precipitationProbability: hourly.precipitation_probability[i] ?? 0,
                  windSpeed: Math.round(hourly.wind_speed_10m[i]),
                });
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

        setData({
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
          daily: dailyData,
        });
      } catch (err) {
        console.error("[WeatherWidget] API error:", err);
        if (!cancelled) {
          setError(true);
          setData(mockData);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchWeather();
    return () => { cancelled = true; };
  }, []);

  // ──────────────────────── PREMIUM COMPACT MODE ────────────────────────
  if (compact) {
    if (loading) {
      return (
        <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white/50 rounded-full animate-spin"></div>
          <span>Clima...</span>
        </div>
      );
    }
    if (!data) return null;

    const icon = getWeatherIcon(data.weatherCode, "text-base");
    const iconColor = getWeatherIconColor(data.weatherCode);
    const label = getWeatherLabel(data.weatherCode);

    return (
      <div className="flex items-center gap-2 select-none">
        {/* Icon */}
        <span className={`w-6 h-6 flex items-center justify-center ${iconColor}`}>
          <i className={icon}></i>
        </span>

        {/* Temp */}
        <span className="text-white/90 text-base font-medium tabular-nums">{data.temp}°</span>

        {/* Label (desktop only) */}
        <span className="text-white/40 text-xs hidden sm:inline ml-0.5">{label}</span>

        {/* Dot separator */}
        <span className="w-px h-3.5 rounded-full bg-white/15 hidden sm:inline mx-0.5"></span>

        {/* Subtle details (desktop only) */}
        <span className="text-white/30 text-xs hidden sm:inline">
          {data.humidity}% · {data.windSpeed} km/h
        </span>

        {/* Previsão link - desktop */}
        <Link 
          to="/previsao-tempo" 
          className="text-[#E8A020]/70 hover:text-[#E8A020] text-xs transition-colors cursor-pointer whitespace-nowrap hidden sm:inline font-medium"
        >
          Previsão →
        </Link>

        {/* Mobile: compact link */}
        <Link 
          to="/previsao-tempo" 
          className="text-[#E8A020]/70 hover:text-[#E8A020] text-xs transition-colors cursor-pointer whitespace-nowrap sm:hidden font-medium"
        >
          Previsão →
        </Link>
      </div>
    );
  }

  // ──────────────────────── DARK BLUE VARIANT (for sidebar) ────────────────────────
  if (variant === "dark") {
    if (loading) {
      return (
        <div className="flex items-center gap-2.5 text-sm text-white/40 py-3 px-4 bg-[#020C1B] rounded-2xl border border-white/10">
          <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
          <span>Carregando clima...</span>
        </div>
      );
    }
    if (!data) return null;

    const icon = getWeatherIcon(data.weatherCode, "text-3xl");
    const iconColor = getWeatherIconColor(data.weatherCode);
    const label = getWeatherLabel(data.weatherCode);

    return (
      <div className="bg-gradient-to-br from-[#020C1B] to-[#051525] rounded-2xl border border-white/10 p-5 text-white">
        {/* Top row: icon + temp + label */}
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 flex items-center justify-center ${iconColor}`}>
            <i className={icon}></i>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-white text-4xl font-light">{data.temp}</span>
              <span className="text-white/50 text-xl">°C</span>
            </div>
            <p className="text-white/60 text-sm">{label}</p>
          </div>
        </div>

        {/* Sensação */}
        <p className="text-white/40 text-xs mt-1 ml-16">
          Sensação de {data.feelsLike}°C
        </p>

        {/* Details row */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-white/50 text-xs">
            <span className="w-3.5 h-3.5 flex items-center justify-center text-sky-400">
              <i className="ri-drop-line text-xs"></i>
            </span>
            <span>{data.humidity}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/50 text-xs">
            <span className="w-3.5 h-3.5 flex items-center justify-center text-sky-400">
              <i className="ri-windy-line text-xs"></i>
            </span>
            <span>{data.windSpeed} km/h</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/50 text-xs">
            <span className="w-3.5 h-3.5 flex items-center justify-center text-sky-400">
              <i className="ri-rainy-line text-xs"></i>
            </span>
            <span>{data.precipitationProbability}%</span>
          </div>
        </div>

        {/* Saiba Mais link */}
        <Link to="/previsao-tempo" className="mt-4 inline-flex items-center gap-1.5 text-[#E8A020] text-xs hover:text-[#f0b030] transition-colors cursor-pointer whitespace-nowrap">
          <span>Ver previsão completa</span>
          <i className="ri-arrow-right-line text-[10px]"></i>
        </Link>
      </div>
    );
  }

  // ──────────────────────── HOME VARIANT (subtle light card) ────────────────────────
  if (variant === "home") {
    if (loading) {
      return (
        <div className="flex items-center gap-2.5 text-sm text-gray-400 py-1">
          <div className="w-3.5 h-3.5 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin"></div>
          <span>Carregando clima...</span>
        </div>
      );
    }
    if (!data) return null;

    const icon = getWeatherIcon(data.weatherCode, "text-2xl");
    const iconColor = getWeatherIconColor(data.weatherCode);
    const label = getWeatherLabel(data.weatherCode);

    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 h-full flex flex-col justify-between">
        <div>
          {/* Top row: icon + temp + label */}
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 flex items-center justify-center ${iconColor}`}>
              <i className={icon}></i>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-gray-900 text-3xl font-light">{data.temp}</span>
                <span className="text-gray-400 text-lg">°C</span>
              </div>
              <p className="text-gray-500 text-sm">{label}</p>
            </div>
          </div>

          {/* Sensação */}
          <p className="text-gray-400 text-xs mt-2 ml-[3.75rem]">
            Sensação de {data.feelsLike}°C
          </p>

          {/* Details row */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-50">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
              <span className="w-3.5 h-3.5 flex items-center justify-center text-sky-400">
                <i className="ri-drop-line text-xs"></i>
              </span>
              <span>{data.humidity}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
              <span className="w-3.5 h-3.5 flex items-center justify-center text-sky-400">
                <i className="ri-windy-line text-xs"></i>
              </span>
              <span>{data.windSpeed} km/h</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
              <span className="w-3.5 h-3.5 flex items-center justify-center text-sky-400">
                <i className="ri-rainy-line text-xs"></i>
              </span>
              <span>{data.precipitationProbability}%</span>
            </div>
          </div>
        </div>

        {/* Saiba Mais link */}
        <Link to="/previsao-tempo" className="mt-4 inline-flex items-center gap-1.5 text-gray-400 text-xs hover:text-gray-600 transition-colors cursor-pointer whitespace-nowrap">
          <span>Saiba Mais</span>
          <i className="ri-arrow-right-line text-[10px]"></i>
        </Link>
      </div>
    );
  }

  // ──────────────────────── FULL MODE (Google-like) ────────────────────────
  if (loading) {
    return (
      <div className="bg-[#0f172a] rounded-2xl p-5 text-white">
        <div className="flex items-center justify-center gap-2 py-8 text-white/40 text-sm">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
          Carregando previsão...
        </div>
      </div>
    );
  }

  if (!data) return null;

  const icon = getWeatherIcon(data.weatherCode, "text-6xl");
  const iconColor = getWeatherIconColor(data.weatherCode);
  const label = getWeatherLabel(data.weatherCode);

  const chartTemps = data.hourly.map(h => h.temp);
  const minChart = Math.min(...chartTemps) - 1;
  const maxChart = Math.max(...chartTemps) + 1;
  const chartRange = maxChart - minChart || 1;
  const chartWidth = data.hourly.length * 40;
  const chartHeight = 60;
  
  const points = data.hourly.map((h, i) => {
    const x = (i / (data.hourly.length - 1 || 1)) * chartWidth;
    const y = chartHeight - ((h.temp - minChart) / chartRange) * chartHeight;
    return `${x},${y}`;
  }).join(" ");

  const currentTabData = activeTab === "temp" ? data.hourly.map(h => h.temp) : 
    activeTab === "precip" ? data.hourly.map(h => h.precipitationProbability) : 
    data.hourly.map(h => h.windSpeed);
  
  const tabMin = Math.min(...currentTabData) - (activeTab === "temp" ? 1 : 0);
  const tabMax = Math.max(...currentTabData) + (activeTab === "temp" ? 1 : 0);
  const tabRange = tabMax - tabMin || 1;

  const tabPoints = data.hourly.map((h, i) => {
    const x = (i / (data.hourly.length - 1 || 1)) * chartWidth;
    const val = activeTab === "temp" ? h.temp : activeTab === "precip" ? h.precipitationProbability : h.windSpeed;
    const y = chartHeight - ((val - tabMin) / tabRange) * chartHeight;
    return `${x},${y}`;
  }).join(" ");

  const tabAreaPoints = `0,${chartHeight} ${tabPoints} ${chartWidth},${chartHeight}`;

  const tabColor = activeTab === "temp" ? "#fbbf24" : activeTab === "precip" ? "#38bdf8" : "#a78bfa";
  const tabBg = activeTab === "temp" ? "rgba(251,191,36,0.15)" : activeTab === "precip" ? "rgba(56,189,248,0.15)" : "rgba(167,139,250,0.15)";
  const tabUnit = activeTab === "temp" ? "°" : activeTab === "precip" ? "%" : " km/h";

  return (
    <div className="bg-[#0f172a] rounded-2xl text-white overflow-hidden">
      {/* Header: Location */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 flex items-center justify-center text-white/60">
            <i className="ri-map-pin-line text-xs"></i>
          </span>
          <span className="text-sm font-medium">Pelotas, RS</span>
          {error && (
            <span className="text-[10px] text-white/30 ml-1">(offline)</span>
          )}
        </div>
        <div className="text-right">
          <span className="text-white/40 text-xs">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" })}
          </span>
          <p className="text-white/30 text-[10px]">
            {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
          </p>
        </div>
      </div>

      {/* Current conditions */}
      <div className="px-5 pb-3 flex items-center gap-4">
        <div className={`w-16 h-16 flex items-center justify-center ${iconColor}`}>
          <i className={icon}></i>
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-light text-white">{data.temp}</span>
            <span className="text-2xl text-white/60">°C</span>
          </div>
          <p className="text-white/60 text-sm">{label}</p>
        </div>
      </div>

      {/* Details grid */}
      <div className="px-5 pb-3 grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.50)" }}>
          <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-drop-line text-[10px] text-sky-400"></i></span>
          <span>Precipitação: {data.precipitationProbability}%</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.50)" }}>
          <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-water-percent-line text-[10px] text-sky-400"></i></span>
          <span>Umidade: {data.humidity}%</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.50)" }}>
          <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-windy-line text-[10px] text-sky-400"></i></span>
          <span>Vento: {data.windSpeed} km/h</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.50)" }}>
          <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-dashboard-line text-[10px] text-sky-400"></i></span>
          <span>Pressão: {data.pressure} hPa</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.50)" }}>
          <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-sun-line text-[10px] text-amber-400"></i></span>
          <span>UV: {data.uvIndex}</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.50)" }}>
          <span className="w-3.5 h-3.5 flex items-center justify-center"><i className="ri-eye-line text-[10px] text-sky-400"></i></span>
          <span>Visibilidade: {data.visibility} km</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 pb-2 flex gap-1 border-b border-white/10">
        {(["temp", "precip", "wind"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab ? "text-white" : "text-white/40 hover:text-white/60"
            }`}
            style={activeTab === tab ? { background: "rgba(255,255,255,0.10)" } : {}}
          >
            {tab === "temp" && <i className="ri-thermometer-line mr-1"></i>}
            {tab === "precip" && <i className="ri-rainy-line mr-1"></i>}
            {tab === "wind" && <i className="ri-windy-line mr-1"></i>}
            {tab === "temp" ? "Temperatura" : tab === "precip" ? "Precipitação" : "Vento"}
          </button>
        ))}
      </div>

      {/* Hourly chart */}
      <div className="px-5 py-3 border-b border-white/10">
        <div className="overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <div style={{ minWidth: chartWidth + "px" }}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-[60px]" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tabColor} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={tabColor} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`M${tabAreaPoints}Z`} fill={tabBg} />
              <polyline points={tabPoints} fill="none" stroke={tabColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {data.hourly.map((h, i) => {
                const x = (i / (data.hourly.length - 1 || 1)) * chartWidth;
                const val = activeTab === "temp" ? h.temp : activeTab === "precip" ? h.precipitationProbability : h.windSpeed;
                const y = chartHeight - ((val - tabMin) / tabRange) * chartHeight;
                return (
                  <circle key={i} cx={x} cy={y} r="3" fill={tabColor} />
                );
              })}
            </svg>
            <div className="flex justify-between text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              {data.hourly.map((h, i) => (
                <span key={i} className="text-center" style={{ minWidth: "30px" }}>
                  {getHourLabel(h.time)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Daily forecast */}
      <div className="px-3 py-3">
        <div className="space-y-0.5">
          {data.daily.map((day, i) => (
            <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3 w-20">
                <span className="text-sm font-semibold w-10" style={{ color: i === 0 ? "#fff" : "rgba(255,255,255,0.50)" }}>
                  {day.dayLabel}
                </span>
                <div className={`w-6 h-6 flex items-center justify-center ${getWeatherIconColor(day.weatherCode)}`}>
                  <i className={getWeatherIcon(day.weatherCode, "text-sm")}></i>
                </div>
              </div>
              
              <div className="flex-1 mx-3">
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${day.precipitationProbability}%`,
                      background: day.precipitationProbability > 50 ? "rgba(56,189,248,0.6)" : "rgba(255,255,255,0.15)",
                    }}
                  ></div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-20 justify-end">
                <span className="text-sm font-bold text-white">{day.tempMax}°</span>
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>{day.tempMin}°</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sunrise/Sunset */}
      <div className="px-5 pb-4 pt-1 border-t border-white/10 flex items-center justify-between text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 flex items-center justify-center text-amber-400">
            <i className="ri-sun-line text-xs"></i>
          </span>
          <span>Nascer: {data.sunrise}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 flex items-center justify-center text-orange-400">
            <i className="ri-moon-line text-xs"></i>
          </span>
          <span>Pôr: {data.sunset}</span>
        </div>
      </div>
    </div>
  );
}