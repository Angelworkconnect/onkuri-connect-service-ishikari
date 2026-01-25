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

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Open-Meteo API で天気情報を取得
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,snowfall&timezone=Asia/Tokyo`
        );
        const weatherData = await weatherRes.json();
        setWeather(weatherData.current);

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

          <div className="flex items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <Sun className="w-4 h-4" />
              <span>{weather?.temperature_2m}°C</span>
            </div>

            {isWinter && weather?.snowfall !== undefined && (
              <div className="flex items-center gap-1">
                <CloudSnow className="w-4 h-4 text-blue-500" />
                <span>降雪: {weather.snowfall}mm</span>
              </div>
            )}

            {isSummer && weather?.precipitation !== undefined && (
              <div className="flex items-center gap-1">
                <CloudRain className="w-4 h-4 text-blue-500" />
                <span>降水: {weather.precipitation}mm</span>
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