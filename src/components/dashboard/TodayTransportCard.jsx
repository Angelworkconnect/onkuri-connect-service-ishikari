import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Clock, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const tripLabel = (t) => t === 'PICKUP' ? '🌅 朝便' : t === 'DROPOFF' ? '🌇 帰便' : '🚐 その他';
const statusBadge = (s) => {
  if (s === 'APPROVED') return <Badge className="bg-green-100 text-green-700 text-xs">承認済</Badge>;
  if (s === 'SUBMITTED') return <Badge className="bg-blue-100 text-blue-700 text-xs">提出済</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 text-xs">下書き</Badge>;
};

export default function TodayTransportCard({ user }) {
  const today = new Date(Date.now() + 9 * 3600000).toISOString().split('T')[0];

  const { data: todayRides = [] } = useQuery({
    queryKey: ['dashboard-transport-today', today],
    queryFn: () => base44.entities.Ride.filter({ date: today }),
    enabled: !!user,
    staleTime: 60000,
  });

  const { data: passengersMap = {} } = useQuery({
    queryKey: ['dashboard-transport-passengers', todayRides.map(r => r.id).join(',')],
    queryFn: async () => {
      const map = {};
      for (const ride of todayRides) {
        const ps = await base44.entities.RidePassenger.filter({ rideId: ride.id });
        map[ride.id] = ps;
      }
      return map;
    },
    enabled: !!user && todayRides.length > 0,
    staleTime: 60000,
  });

  if (todayRides.length === 0) return null;

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-base font-medium text-slate-800 flex items-center gap-2">
          <Truck className="w-4 h-4 text-blue-600" />
          本日の送迎運行（{todayRides.length}件）
        </h2>
        <Link to={createPageUrl('Transport')}>
          <span className="text-xs text-blue-600 hover:underline">詳細 →</span>
        </Link>
      </div>
      <div className="divide-y">
        {todayRides.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')).map(ride => {
          const passengers = passengersMap[ride.id] || [];
          return (
            <div key={ride.id} className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{tripLabel(ride.tripType)}</span>
                {statusBadge(ride.status)}
              </div>
              <p className="text-xs text-slate-500">
                {ride.vehicleName} / {ride.driverName}
              </p>
              <p className="text-xs text-slate-400">
                <Clock className="w-3 h-3 inline mr-1" />
                {ride.startTime}{ride.endTime ? ` ～ ${ride.endTime}` : ' (運行中)'}
                {ride.distanceKm ? ` / ${ride.distanceKm.toFixed(1)}km` : ''}
              </p>
              {passengers.length > 0 && (
                <p className="text-xs text-blue-700 mt-1">
                  <Users className="w-3 h-3 inline mr-1" />
                  {passengers.length}名：{passengers.map(p => p.clientName).join('、')}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}