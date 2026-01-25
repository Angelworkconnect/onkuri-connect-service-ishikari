import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { AlertTriangle, CloudRain, CloudSnow, Sun, Shield } from "lucide-react";

export default function WeatherAlertCard() {
  const [weather, setWeather] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 気象庁札幌観測所（石狩地方）
  const jmaStationId = '47412';

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 気象庁の最新観測時刻を取得
        const timeRes = await fetch('https://www.jma.go.jp/bosai/amedas/data/latest_time.txt');
        const latestTime = await timeRes.text();
        
        // 最新の観測データを取得
        const obsRes = await fetch(
          `https://www.jma.go.jp/bosai/amedas/data/map/${latestTime.trim()}.json`
        );
        const obsData = await obsRes.json();
        
        // 札幌の観測データ
        const sapporoObs = obsData[jmaStationId];
        
        console.log('気象庁観測データ（札幌）:', sapporoObs);
        
        setWeather({
          temperature_2m: sapporoObs?.temp?.[0] || null,
          snowfall: sapporoObs?.snow1h?.[0] || 0,
          snow_depth: sapporoObs?.snow?.[0] || 0,
          precipitation: sapporoObs?.precipitation1h?.[0] || 0,
        });

        // 気象庁の警報・注意報データを取得
        const alertRes = await fetch(
          'https://www.jma.go.jp/bosai/warning/data/warning.json'
        );
        const alertData = await alertRes.json();
        
        // 石狩地方（016000）の警報・注意報を抽出
        const ishikariData = alertData['016000'];
        const warningList = [];
        
        if (ishikariData?.areaTypes) {
          ishikariData.areaTypes.forEach(areaType => {
            areaType.areas?.forEach(area => {
              area.warnings?.forEach(warning => {
                if (warning.status && warning.status !== '解除') {
                  warningList.push(warning.name || warning.code);
                }
              });
            });
          });
        }
        
        console.log('気象注意報:', warningList);
        setAlerts(warningList);
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
            {weather?.temperature_2m && (
              <div className="flex items-center gap-1">
                <Sun className="w-4 h-4" />
                <span>{weather.temperature_2m}°C</span>
              </div>
            )}

            {isWinter && (
              <>
                <div className="flex items-center gap-1">
                  <CloudSnow className="w-4 h-4 text-blue-500" />
                  <span>積雪深: {weather?.snow_depth > 0 ? `${weather.snow_depth}cm` : 'なし'}</span>
                </div>
                {weather?.snowfall > 0 && (
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <span>1時間降雪量: {weather.snowfall}cm</span>
                  </div>
                )}
              </>
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