import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { AlertTriangle, CloudRain, CloudSnow, Sun, Shield } from "lucide-react";

export default function WeatherAlertCard() {
  const [weather, setWeather] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 石狩市役所の座標
  const lat = 43.1746;
  const lon = 141.3540;

  // Weather code to description mapping (WMO codes)
  const getWeatherDescription = (code) => {
    if (code === 0) return { text: '晴れ', icon: '☀️' };
    if (code >= 1 && code <= 3) return { text: code === 1 ? '快晴' : code === 2 ? '晴れ時々曇り' : '曇り', icon: code === 1 ? '🌤️' : code === 2 ? '⛅' : '☁️' };
    if (code >= 45 && code <= 48) return { text: '霧', icon: '🌫️' };
    if (code >= 51 && code <= 55) return { text: '霧雨', icon: '🌦️' };
    if (code >= 61 && code <= 65) return { text: '雨', icon: '🌧️' };
    if (code >= 71 && code <= 75) return { text: '雪', icon: '🌨️' };
    if (code >= 95 && code <= 99) return { text: '雷雨', icon: '⛈️' };
    return { text: '不明', icon: '🌡️' };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Open-Meteo API で天気情報を取得（hourly snowfallで24時間降雪量を取得）
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&hourly=snowfall,precipitation&past_days=1&forecast_days=1&timezone=Asia/Tokyo`
        );
        const weatherData = await weatherRes.json();
        
        // 過去24時間の降雪量と降水量を合計
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        let total24hSnowfall = 0;
        let total24hPrecipitation = 0;
        
        if (weatherData.hourly && weatherData.hourly.time) {
          weatherData.hourly.time.forEach((time, index) => {
            const timeDate = new Date(time);
            if (timeDate >= twentyFourHoursAgo && timeDate <= now) {
              total24hSnowfall += weatherData.hourly.snowfall[index] || 0;
              total24hPrecipitation += weatherData.hourly.precipitation[index] || 0;
            }
          });
        }
        
        setWeather({
          temperature_2m: weatherData.current.temperature_2m,
          weather_code: weatherData.current.weather_code,
          snowfall: total24hSnowfall,
          precipitation: total24hPrecipitation,
        });

        // 気象庁の注意報情報を取得
        const alertRes = await fetch(
          'https://www.jma.go.jp/bosai/warning/data/warning/016000.json'
        );
        const alertData = await alertRes.json();
        
        // 石狩市（0123500）の情報を抽出
        const ishikariAlerts = alertData?.['0123500']?.warning || [];
        setAlerts(ishikariAlerts);
      } catch (error) {
        console.error('天気情報の取得に失敗しました', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // 30分ごとに更新
    const interval = setInterval(fetchData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="p-4">
        <div className="text-slate-400 text-sm">天気情報を読み込み中...</div>
      </Card>
    );
  }

  const currentMonth = new Date().getMonth() + 1;
  const isWinter = currentMonth === 12 || currentMonth <= 3;
  const isSummer = currentMonth >= 6 && currentMonth <= 9;
  
  const hasAlerts = alerts && alerts.length > 0;
  const alertColor = hasAlerts ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200';
  const alertTextColor = hasAlerts ? 'text-red-700' : 'text-green-700';
  const alertIconColor = hasAlerts ? 'text-red-500' : 'text-green-500';
  
  const weatherDesc = weather?.weather_code !== undefined ? getWeatherDescription(weather.weather_code) : null;

  return (
    <Card className={`p-4 border-2 ${alertColor} transition-all`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {hasAlerts ? (
              <AlertTriangle className={`w-5 h-5 ${alertIconColor}`} />
            ) : (
              <Shield className={`w-5 h-5 ${alertIconColor}`} />
            )}
            <h3 className={`font-medium ${alertTextColor}`}>
              {hasAlerts ? '気象注意報発令中' : '気象注意報なし'}
            </h3>
          </div>

          {hasAlerts && (
            <div className="mb-3">
              {alerts.map((alert, i) => (
                <div key={i} className="text-sm text-red-600">
                  • {alert}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
            {weatherDesc && (
              <div className="flex items-center gap-2 font-medium text-base">
                <span>{weatherDesc.icon}</span>
                <span>{weatherDesc.text}</span>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <Sun className="w-4 h-4" />
              <span>{weather?.temperature_2m}°C</span>
            </div>

            {isWinter && (
              <div className="flex items-center gap-1">
                <CloudSnow className="w-4 h-4 text-blue-500" />
                <span>24時間降雪量: {weather?.snowfall > 0 ? `${Math.round(weather.snowfall * 10) / 10}cm` : 'なし'}</span>
              </div>
            )}

            {isSummer && (
              <div className="flex items-center gap-1">
                <CloudRain className="w-4 h-4 text-blue-500" />
                <span>24時間降水量: {weather?.precipitation > 0 ? `${Math.round(weather.precipitation * 10) / 10}mm` : 'なし'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-400">
          石狩市
        </div>
      </div>
    </Card>
  );
}