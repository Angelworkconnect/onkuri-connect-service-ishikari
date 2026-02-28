import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Trash2, ChevronDown, ChevronRight, Calendar, User, Truck, CalendarDays } from 'lucide-react';

const TRIP = {
  PICKUP:  { label: '🌅 朝便', badge: 'bg-orange-100 text-orange-700 border border-orange-200', border: 'border-l-4 border-orange-400 bg-orange-50/30' },
  DROPOFF: { label: '🌇 帰便', badge: 'bg-indigo-100 text-indigo-700 border border-indigo-200', border: 'border-l-4 border-indigo-400 bg-indigo-50/30' },
  OTHER:   { label: '🚐 その他', badge: 'bg-slate-100 text-slate-600 border border-slate-200', border: 'border-l-4 border-slate-300' },
};
const tripInfo = (t) => TRIP[t] || TRIP.OTHER;
const tripBadge = (t) => <Badge className={`text-xs ${tripInfo(t).badge}`}>{tripInfo(t).label}</Badge>;
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function RideRow({ ride, onEdit, onDelete }) {
  return (
    <div className={`px-4 py-3 flex items-center justify-between ${tripInfo(ride.tripType).border}`}>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {tripBadge(ride.tripType)}
          {ride.abnormality !== 'NONE' && <Badge className="bg-red-100 text-red-700 text-xs">⚠️ 異常</Badge>}
        </div>
        <p className="text-sm text-slate-700">{ride.vehicleName} / {ride.driverName}</p>
        <p className="text-xs text-slate-400">{ride.startTime}～{ride.endTime} | {(ride.distanceKm || 0).toFixed(1)}km</p>
      </div>
      <div className="flex gap-1 ml-3 shrink-0">
        <Button size="sm" variant="ghost" onClick={() => onEdit(ride)}><Edit className="w-3.5 h-3.5" /></Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(ride.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
      </div>
    </div>
  );
}

function CollapsibleSection({ title, count, badge, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="border-0 shadow-sm mb-3">
      <button
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 rounded-t-xl transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          <span className="font-semibold text-slate-800">{title}</span>
          {badge}
        </div>
        <span className="text-sm text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5 font-medium">{count}件</span>
      </button>
      {open && <div className="border-t divide-y">{children}</div>}
    </Card>
  );
}

// ── 日別ビュー ──────────────────────────────────────────
function DailyView({ rides, onEdit, onDelete }) {
  const grouped = useMemo(() => {
    const map = {};
    rides.forEach(r => {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [rides]);

  if (rides.length === 0) return <EmptyState />;

  return (
    <div>
      {grouped.map(([date, dayRides]) => {
        const d = new Date(date + 'T00:00:00');
        const dayName = DAY_LABELS[d.getDay()];
        const totalKm = dayRides.reduce((s, r) => s + (r.distanceKm || 0), 0);
        return (
          <CollapsibleSection
            key={date}
            title={`${date}（${dayName}）`}
            count={dayRides.length}
            badge={<span className="text-xs text-slate-500 ml-1">計 {totalKm.toFixed(1)}km</span>}
          >
            {dayRides.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')).map(r => (
              <RideRow key={r.id} ride={r} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </CollapsibleSection>
        );
      })}
    </div>
  );
}

// ── 人別ビュー ──────────────────────────────────────────
function PersonView({ rides, onEdit, onDelete }) {
  const grouped = useMemo(() => {
    const map = {};
    rides.forEach(r => {
      const key = r.driverName || r.driverEmail || '不明';
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rides]);

  if (rides.length === 0) return <EmptyState />;

  return (
    <div>
      {grouped.map(([name, personRides]) => {
        const totalKm = personRides.reduce((s, r) => s + (r.distanceKm || 0), 0);
        return (
          <CollapsibleSection
            key={name}
            title={name}
            count={personRides.length}
            badge={<span className="text-xs text-slate-500 ml-1">計 {totalKm.toFixed(1)}km</span>}
          >
            {personRides.sort((a, b) => b.date.localeCompare(a.date)).map(r => (
              <div key={r.id} className={`px-4 py-3 flex items-center justify-between ${tripInfo(r.tripType).border}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="font-medium text-sm">{r.date}</span>
                    {tripBadge(r.tripType)}
                    {r.abnormality !== 'NONE' && <Badge className="bg-red-100 text-red-700 text-xs">⚠️ 異常</Badge>}
                  </div>
                  <p className="text-sm text-slate-600">{r.vehicleName}</p>
                  <p className="text-xs text-slate-400">{r.startTime}～{r.endTime} | {(r.distanceKm || 0).toFixed(1)}km</p>
                </div>
                <div className="flex gap-1 ml-3 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => onEdit(r)}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(r.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                </div>
              </div>
            ))}
          </CollapsibleSection>
        );
      })}
    </div>
  );
}

// ── 車別ビュー ──────────────────────────────────────────
function VehicleView({ rides, onEdit, onDelete }) {
  const grouped = useMemo(() => {
    const map = {};
    rides.forEach(r => {
      const key = r.vehicleName || r.vehicleId || '不明';
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rides]);

  if (rides.length === 0) return <EmptyState />;

  return (
    <div>
      {grouped.map(([vname, vRides]) => {
        const totalKm = vRides.reduce((s, r) => s + (r.distanceKm || 0), 0);
        return (
          <CollapsibleSection
            key={vname}
            title={vname}
            count={vRides.length}
            badge={<span className="text-xs text-slate-500 ml-1">計 {totalKm.toFixed(1)}km</span>}
          >
            {vRides.sort((a, b) => b.date.localeCompare(a.date)).map(r => (
              <div key={r.id} className={`px-4 py-3 flex items-center justify-between ${tripInfo(r.tripType).border}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="font-medium text-sm">{r.date}</span>
                    {tripBadge(r.tripType)}
                    {r.abnormality !== 'NONE' && <Badge className="bg-red-100 text-red-700 text-xs">⚠️ 異常</Badge>}
                  </div>
                  <p className="text-sm text-slate-600">{r.driverName}</p>
                  <p className="text-xs text-slate-400">{r.startTime}～{r.endTime} | {(r.distanceKm || 0).toFixed(1)}km</p>
                </div>
                <div className="flex gap-1 ml-3 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => onEdit(r)}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(r.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                </div>
              </div>
            ))}
          </CollapsibleSection>
        );
      })}
    </div>
  );
}

// ── 曜日別ビュー ──────────────────────────────────────────
function WeekdayView({ rides, onEdit, onDelete }) {
  const grouped = useMemo(() => {
    const map = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    rides.forEach(r => {
      const d = new Date(r.date + 'T00:00:00');
      const day = d.getDay();
      map[day].push(r);
    });
    return map;
  }, [rides]);

  if (rides.length === 0) return <EmptyState />;

  return (
    <div>
      {DAY_LABELS.map((label, idx) => {
        const dayRides = grouped[idx] || [];
        const totalKm = dayRides.reduce((s, r) => s + (r.distanceKm || 0), 0);
        const isWeekend = idx === 0 || idx === 6;
        return (
          <CollapsibleSection
            key={idx}
            title={`${label}曜日`}
            count={dayRides.length}
            badge={
              <>
                {isWeekend && <Badge className="bg-orange-100 text-orange-600 text-xs ml-1">休日</Badge>}
                {dayRides.length > 0 && <span className="text-xs text-slate-500 ml-1">計 {totalKm.toFixed(1)}km</span>}
              </>
            }
          >
            {dayRides.sort((a, b) => b.date.localeCompare(a.date)).map(r => (
              <div key={r.id} className="px-4 py-3 hover:bg-slate-50 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="font-medium text-sm">{r.date}</span>
                    <Badge className="bg-blue-100 text-blue-700 text-xs">{tripLabel(r.tripType)}</Badge>
                    {r.abnormality !== 'NONE' && <Badge className="bg-red-100 text-red-700 text-xs">⚠️ 異常</Badge>}
                  </div>
                  <p className="text-sm text-slate-600">{r.vehicleName} / {r.driverName}</p>
                  <p className="text-xs text-slate-400">{r.startTime}～{r.endTime} | {(r.distanceKm || 0).toFixed(1)}km</p>
                </div>
                <div className="flex gap-1 ml-3 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => onEdit(r)}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(r.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                </div>
              </div>
            ))}
          </CollapsibleSection>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-12 text-center text-slate-400">
      <p>承認済みの運行はありません</p>
    </div>
  );
}

export default function ApprovedRidesView({ rides, deletedRideIds, onEdit, onDelete }) {
  const filtered = rides.filter(r => !deletedRideIds.includes(r.id));
  const totalKm = filtered.reduce((s, r) => s + (r.distanceKm || 0), 0);

  return (
    <Card className="border-0 shadow mt-4">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">承認済み運行一覧（{filtered.length}件）</h2>
          <span className="text-sm text-slate-500 bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium">
            総走行 {totalKm.toFixed(1)}km
          </span>
        </div>
      </div>

      <div className="p-3">
        <Tabs defaultValue="daily">
          <TabsList className="bg-slate-100 p-1 w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="daily" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm">
              <Calendar className="w-3.5 h-3.5 mr-1 hidden sm:inline" />日別
            </TabsTrigger>
            <TabsTrigger value="person" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm">
              <User className="w-3.5 h-3.5 mr-1 hidden sm:inline" />人別
            </TabsTrigger>
            <TabsTrigger value="vehicle" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm">
              <Truck className="w-3.5 h-3.5 mr-1 hidden sm:inline" />車別
            </TabsTrigger>
            <TabsTrigger value="weekday" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm">
              <CalendarDays className="w-3.5 h-3.5 mr-1 hidden sm:inline" />曜日別
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <DailyView rides={filtered} onEdit={onEdit} onDelete={onDelete} />
          </TabsContent>
          <TabsContent value="person">
            <PersonView rides={filtered} onEdit={onEdit} onDelete={onDelete} />
          </TabsContent>
          <TabsContent value="vehicle">
            <VehicleView rides={filtered} onEdit={onEdit} onDelete={onDelete} />
          </TabsContent>
          <TabsContent value="weekday">
            <WeekdayView rides={filtered} onEdit={onEdit} onDelete={onDelete} />
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}