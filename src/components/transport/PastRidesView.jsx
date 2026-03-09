import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, User, Truck, CalendarDays, ChevronDown, ChevronRight, Clock, Users } from 'lucide-react';

const TRIP = {
  PICKUP:  { label: '🌅 朝便', badge: 'bg-orange-100 text-orange-700 border border-orange-200', border: 'border-l-4 border-orange-400 bg-orange-50/30' },
  DROPOFF: { label: '🌇 帰便', badge: 'bg-indigo-100 text-indigo-700 border border-indigo-200', border: 'border-l-4 border-indigo-400 bg-indigo-50/30' },
  OTHER:   { label: '🚐 その他', badge: 'bg-slate-100 text-slate-600 border border-slate-200', border: 'border-l-4 border-slate-300' },
};
const tripInfo = (t) => TRIP[t] || TRIP.OTHER;
const tripBadge = (t) => <Badge className={`text-xs ${tripInfo(t).badge}`}>{tripInfo(t).label}</Badge>;
const statusBadge = (s) => {
  if (s === 'APPROVED') return <Badge className="bg-green-100 text-green-700 text-xs">承認済</Badge>;
  if (s === 'SUBMITTED') return <Badge className="bg-blue-100 text-blue-700 text-xs">提出済</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 text-xs">下書き</Badge>;
};
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function PassengerLine({ passengers }) {
  if (!passengers || passengers.length === 0) return null;
  return (
    <p className="text-xs text-blue-700 mt-0.5">
      <Users className="w-3 h-3 inline mr-1" />
      {passengers.length}名：{passengers.map(p => p.clientName).join('、')}
    </p>
  );
}

function RideCard({ ride, passengers }) {
  return (
    <div className={`px-4 py-3 flex items-center justify-between ${tripInfo(ride.tripType).border}`}>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          {tripBadge(ride.tripType)}
          {statusBadge(ride.status)}
          {ride.abnormality !== 'NONE' && <Badge className="bg-red-100 text-red-700 text-xs">⚠️</Badge>}
        </div>
        <p className="text-xs text-slate-500">{ride.vehicleName} / {ride.driverName}</p>
        <p className="text-xs text-slate-400">
          <Clock className="w-3 h-3 inline mr-1" />{ride.startTime}{ride.endTime ? `～${ride.endTime}` : ''}
          {ride.distanceKm ? ` | ${ride.distanceKm.toFixed(1)}km` : ''}
        </p>
        <PassengerLine passengers={passengers} />
      </div>
    </div>
  );
}

function CollapsibleGroup({ title, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="border-0 shadow-sm mb-2 overflow-hidden">
      <button
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          <span className="font-semibold text-sm text-slate-800">{title}</span>
        </div>
        <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">{count}件</span>
      </button>
      {open && <div className="border-t divide-y">{children}</div>}
    </Card>
  );
}

function DailyView({ rides, passengersMap }) {
  const grouped = useMemo(() => {
    const map = {};
    rides.forEach(r => { if (!map[r.date]) map[r.date] = []; map[r.date].push(r); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [rides]);
  return (
    <div>
      {grouped.map(([date, dayRides]) => {
        const d = new Date(date + 'T00:00:00');
        return (
          <CollapsibleGroup key={date} title={`${date}（${DAY_LABELS[d.getDay()]}）`} count={dayRides.length}>
            {dayRides.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')).map(r => <RideCard key={r.id} ride={r} passengers={passengersMap[r.id]} />)}
          </CollapsibleGroup>
        );
      })}
    </div>
  );
}

function PersonView({ rides, passengersMap }) {
  const grouped = useMemo(() => {
    const map = {};
    rides.forEach(r => { const k = r.driverName || '不明'; if (!map[k]) map[k] = []; map[k].push(r); });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rides]);
  return (
    <div>
      {grouped.map(([name, personRides]) => (
        <CollapsibleGroup key={name} title={name} count={personRides.length}>
          {personRides.sort((a, b) => b.date.localeCompare(a.date)).map(r => (
            <div key={r.id} className={`px-4 py-3 ${tripInfo(r.tripType).border}`}>
              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                <span className="text-sm font-medium">{r.date}</span>
                {tripBadge(r.tripType)}
                {statusBadge(r.status)}
              </div>
              <p className="text-xs text-slate-500">{r.vehicleName}{r.distanceKm ? ` | ${r.distanceKm.toFixed(1)}km` : ''}</p>
              <PassengerLine passengers={passengersMap[r.id]} />
            </div>
          ))}
        </CollapsibleGroup>
      ))}
    </div>
  );
}

function VehicleView({ rides, passengersMap }) {
  const grouped = useMemo(() => {
    const map = {};
    rides.forEach(r => { const k = r.vehicleName || '不明'; if (!map[k]) map[k] = []; map[k].push(r); });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rides]);
  return (
    <div>
      {grouped.map(([vname, vRides]) => {
        const totalKm = vRides.reduce((s, r) => s + (r.distanceKm || 0), 0);
        return (
          <CollapsibleGroup key={vname} title={`${vname}　${totalKm.toFixed(1)}km`} count={vRides.length}>
            {vRides.sort((a, b) => b.date.localeCompare(a.date)).map(r => (
              <div key={r.id} className={`px-4 py-3 ${tripInfo(r.tripType).border}`}>
                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                  <span className="text-sm font-medium">{r.date}</span>
                  {tripBadge(r.tripType)}
                  {statusBadge(r.status)}
                </div>
                <p className="text-xs text-slate-500">{r.driverName}{r.distanceKm ? ` | ${r.distanceKm.toFixed(1)}km` : ''}</p>
                <PassengerLine passengers={passengersMap[r.id]} />
              </div>
            ))}
          </CollapsibleGroup>
        );
      })}
    </div>
  );
}

function WeekdayView({ rides }) {
  const grouped = useMemo(() => {
    const map = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    rides.forEach(r => { const d = new Date(r.date + 'T00:00:00'); map[d.getDay()].push(r); });
    return map;
  }, [rides]);
  return (
    <div>
      {DAY_LABELS.map((label, idx) => {
        const dayRides = grouped[idx] || [];
        const isWeekend = idx === 0 || idx === 6;
        return (
          <CollapsibleGroup
            key={idx}
            title={<span className="flex items-center gap-1.5">{label}曜日{isWeekend && <Badge className="bg-orange-100 text-orange-600 text-xs">休日</Badge>}</span>}
            count={dayRides.length}
          >
            {dayRides.sort((a, b) => b.date.localeCompare(a.date)).map(r => (
              <div key={r.id} className={`px-4 py-3 ${tripInfo(r.tripType).border}`}>
                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                  <span className="text-sm font-medium">{r.date}</span>
                  {tripBadge(r.tripType)}
                  {statusBadge(r.status)}
                </div>
                <p className="text-xs text-slate-500">{r.vehicleName} / {r.driverName}</p>
              </div>
            ))}
          </CollapsibleGroup>
        );
      })}
    </div>
  );
}

export default function PastRidesView({ rides }) {
  if (rides.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-bold text-slate-600 mb-2">過去の記録（{rides.length}件）</h2>
      <Tabs defaultValue="daily">
        <TabsList className="bg-slate-100 p-1 w-full grid grid-cols-4 mb-3">
          <TabsTrigger value="daily" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
            <Calendar className="w-3.5 h-3.5 mr-1 hidden sm:inline" />日別
          </TabsTrigger>
          <TabsTrigger value="person" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
            <User className="w-3.5 h-3.5 mr-1 hidden sm:inline" />人別
          </TabsTrigger>
          <TabsTrigger value="vehicle" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
            <Truck className="w-3.5 h-3.5 mr-1 hidden sm:inline" />車別
          </TabsTrigger>
          <TabsTrigger value="weekday" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
            <CalendarDays className="w-3.5 h-3.5 mr-1 hidden sm:inline" />曜日別
          </TabsTrigger>
        </TabsList>
        <TabsContent value="daily"><DailyView rides={rides} /></TabsContent>
        <TabsContent value="person"><PersonView rides={rides} /></TabsContent>
        <TabsContent value="vehicle"><VehicleView rides={rides} /></TabsContent>
        <TabsContent value="weekday"><WeekdayView rides={rides} /></TabsContent>
      </Tabs>
    </div>
  );
}