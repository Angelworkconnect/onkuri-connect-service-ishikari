import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, Sparkles, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import confetti from 'canvas-confetti';

const prizes = {
  1: { name: '残念賞', points: 10, emoji: '😢', color: 'from-gray-400 to-gray-500' },
  2: { name: 'ジュース', points: 20, emoji: '🧃', color: 'from-orange-400 to-orange-500' },
  3: { name: 'お菓子', points: 30, emoji: '🍪', color: 'from-yellow-400 to-yellow-500' },
  4: { name: 'ゴミ袋', points: 40, emoji: '🗑️', color: 'from-blue-400 to-blue-500' },
  5: { name: '残念賞', points: 50, emoji: '😢', color: 'from-gray-400 to-gray-500' },
  6: { name: 'PayPay 200円', points: 200, emoji: '💰', color: 'from-purple-400 to-purple-500' }
};

export default function DiceGameCard({ user }) {
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [diceNumber, setDiceNumber] = useState(1);
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: todayRoll } = useQuery({
    queryKey: ['diceRoll', today, user?.email],
    queryFn: async () => {
      if (!user) return null;
      const rolls = await base44.entities.DiceRoll.filter({ 
        user_email: user.email, 
        date: today 
      });
      return rolls.length > 0 ? rolls[0] : null;
    },
    enabled: !!user,
  });

  const rollDiceMutation = useMutation({
    mutationFn: async (diceResult) => {
      const prize = prizes[diceResult];
      
      await base44.entities.DiceRoll.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        date: today,
        dice_result: diceResult,
        prize_name: prize.name,
        prize_points: prize.points,
      });

      await base44.entities.TipRecord.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        tip_type: 'sugoroku_thanks',
        amount: prize.points,
        reason: `スゴロクサンクス - ${prize.name}が当たりました！`,
        given_by: 'システム自動付与',
        date: today,
      });

      return { diceResult, prize };
    },
    onSuccess: ({ diceResult, prize }) => {
      queryClient.invalidateQueries({ queryKey: ['diceRoll'] });
      queryClient.invalidateQueries({ queryKey: ['tips'] });
      
      setResult({ dice: diceResult, prize });
      
      if (diceResult >= 5) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    },
  });

  const handleRoll = () => {
    if (todayRoll || rolling) return;

    setRolling(true);
    setResult(null);

    let count = 0;
    const interval = setInterval(() => {
      setDiceNumber(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count > 10) {
        clearInterval(interval);
        const finalResult = Math.floor(Math.random() * 6) + 1;
        setDiceNumber(finalResult);
        setTimeout(() => {
          rollDiceMutation.mutate(finalResult);
          setRolling(false);
        }, 300);
      }
    }, 100);
  };

  const canRoll = !todayRoll && !rolling;

  return (
    <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Dices className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">🎲 毎日双六</h3>
              <p className="text-xs text-slate-500">1日1回チャレンジ！</p>
            </div>
          </div>
          <Link to={createPageUrl('DiceGame')}>
            <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700">
              詳細
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between gap-4">
          <motion.div
            animate={{
              rotate: rolling ? 360 : 0,
              scale: rolling ? [1, 1.1, 1] : 1,
            }}
            transition={{
              rotate: { duration: 0.1, repeat: rolling ? Infinity : 0 },
              scale: { duration: 0.5, repeat: rolling ? Infinity : 0 },
            }}
          >
            <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center text-5xl border-2 border-purple-200">
              {['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][diceNumber - 1]}
            </div>
          </motion.div>

          <div className="flex-1">
            {canRoll ? (
              <Button
                onClick={handleRoll}
                disabled={rolling}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {rolling ? '振ってます...' : 'サイコロを振る！'}
              </Button>
            ) : (
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-slate-600 mb-1">✨ 今日の結果</p>
                <div className="text-2xl mb-1">{prizes[todayRoll?.dice_result]?.emoji}</div>
                <p className="font-bold text-purple-600">{todayRoll?.prize_name}</p>
                <p className="text-xs text-slate-500">+{todayRoll?.prize_points}pt</p>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-4 bg-gradient-to-r ${result.prize.color} text-white p-4 rounded-xl shadow-lg text-center`}
            >
              <div className="text-4xl mb-2">{result.prize.emoji}</div>
              <p className="font-bold text-lg">{result.prize.name}</p>
              <p className="text-sm">+{result.prize.points}pt 獲得！</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}