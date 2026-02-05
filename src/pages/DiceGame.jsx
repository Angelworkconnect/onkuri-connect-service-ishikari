import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, Sparkles, Gift, Trophy, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';

export default function DiceGame() {
  const [user, setUser] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [diceNumber, setDiceNumber] = useState(1);
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: dicePrizes = [] } = useQuery({
    queryKey: ['dice-prizes'],
    queryFn: () => base44.entities.DicePrize.filter({ is_active: true }),
  });

  const prizes = dicePrizes.reduce((acc, prize) => {
    acc[prize.dice_number] = {
      name: prize.prize_name,
      points: prize.points,
      emoji: prize.emoji || '🎁',
      color: prize.color?.replace('bg-gradient-to-br ', '') || 'from-purple-400 to-pink-400',
    };
    return acc;
  }, {});

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      if (staffList.length > 0) {
        u.full_name = staffList[0].full_name;
      }
      setUser(u);
    }).catch((error) => {
      console.error('Auth error:', error);
      base44.auth.redirectToLogin();
    });
  }, []);

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

  const { data: history } = useQuery({
    queryKey: ['diceHistory', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.DiceRoll.filter({ user_email: user.email }, '-created_date', 10);
    },
    enabled: !!user,
  });

  const rollDiceMutation = useMutation({
    mutationFn: async (diceResult) => {
      const prize = prizes[diceResult];
      
      // 双六の履歴を保存
      await base44.entities.DiceRoll.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        date: today,
        dice_result: diceResult,
        prize_name: prize.name,
        prize_points: prize.points,
      });

      // ポイントを付与
      await base44.entities.TipRecord.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        tip_type: 'sugoroku_thanks',
        amount: prize.points,
        reason: `双六ゲーム - ${prize.name}が当たりました！`,
        given_by: 'システム自動付与',
        date: today,
      });

      return { diceResult, prize };
    },
    onSuccess: ({ diceResult, prize }) => {
      queryClient.invalidateQueries({ queryKey: ['diceRoll'] });
      queryClient.invalidateQueries({ queryKey: ['diceHistory'] });
      queryClient.invalidateQueries({ queryKey: ['tips'] });
      
      setResult({ dice: diceResult, prize });
      
      // 紙吹雪エフェクト
      if (diceResult === 6) {
        // スペシャル用の豪華な紙吹雪
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF69B4', '#9370DB']
        });
        setTimeout(() => {
          confetti({
            particleCount: 100,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
          });
          confetti({
            particleCount: 100,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
          });
        }, 200);
      } else if (diceResult >= 5) {
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

    // サイコロのアニメーション
    let count = 0;
    const interval = setInterval(() => {
      setDiceNumber(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count > 10) {
        clearInterval(interval);
        // 6が出にくい確率調整（6は約5%、他は各19%）
        const rand = Math.random() * 100;
        let finalResult;
        if (rand < 19) finalResult = 1;
        else if (rand < 38) finalResult = 2;
        else if (rand < 57) finalResult = 3;
        else if (rand < 76) finalResult = 4;
        else if (rand < 95) finalResult = 5;
        else finalResult = 6;
        
        setDiceNumber(finalResult);
        setTimeout(() => {
          rollDiceMutation.mutate(finalResult);
          setRolling(false);
        }, 300);
      }
    }, 100);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  const canRoll = !todayRoll && !rolling;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
            🎲 毎日双六チャレンジ
          </h1>
          <p className="text-slate-600">1日1回サイコロを振って、素敵な景品をゲット！</p>
        </div>

        {/* メインゲームエリア */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              {/* サイコロ表示 */}
              <motion.div
                animate={{
                  rotate: rolling ? 360 : 0,
                  scale: rolling ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  rotate: { duration: 0.1, repeat: rolling ? Infinity : 0 },
                  scale: { duration: 0.5, repeat: rolling ? Infinity : 0 },
                }}
                className="inline-block"
              >
                <div className="w-32 h-32 bg-gradient-to-br from-white to-slate-100 rounded-3xl shadow-2xl flex items-center justify-center text-7xl border-4 border-slate-200">
                  {['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][diceNumber - 1]}
                </div>
              </motion.div>

              {/* ボタン */}
              <div>
                {canRoll ? (
                  <Button
                    onClick={handleRoll}
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-xl shadow-lg"
                    disabled={rolling}
                  >
                    <Dices className="w-6 h-6 mr-2" />
                    {rolling ? 'サイコロを振っています...' : 'サイコロを振る！'}
                  </Button>
                ) : todayRoll ? (
                  <div className="space-y-3">
                    <p className="text-slate-600 flex items-center justify-center gap-2">
                      <Calendar className="w-5 h-5" />
                      今日はすでに振りました
                    </p>
                    <p className="text-sm text-slate-500">また明日チャレンジしてください！</p>
                  </div>
                ) : null}
              </div>

              {/* 結果表示 */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    className={`bg-gradient-to-r ${result.prize.color} text-white p-6 rounded-2xl shadow-xl`}
                  >
                    <div className="text-6xl mb-3">{result.prize.emoji}</div>
                    <h3 className="text-2xl font-bold mb-2">{result.prize.name}</h3>
                    <p className="text-lg">+{result.prize.points}pt 獲得！</p>
                  </motion.div>
                )}
                {todayRoll && !result && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`bg-gradient-to-r ${prizes[todayRoll.dice_result].color} text-white p-6 rounded-2xl shadow-xl`}
                  >
                    <div className="text-6xl mb-3">{prizes[todayRoll.dice_result].emoji}</div>
                    <h3 className="text-2xl font-bold mb-2">今日の結果: {todayRoll.prize_name}</h3>
                    <p className="text-lg">+{todayRoll.prize_points}pt 獲得済み</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        {/* 景品一覧 */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              景品一覧
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(prizes).sort((a, b) => Number(a[0]) - Number(b[0])).map(([num, prize]) => (
                <div
                  key={num}
                  className={`bg-gradient-to-r ${prize.color} text-white p-4 rounded-xl text-center shadow-md`}
                >
                  <div className="text-4xl mb-2">{prize.emoji}</div>
                  <p className="font-bold">{num} - {prize.name}</p>
                  <p className="text-sm opacity-90">{prize.points}pt</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 履歴 */}
        {history && history.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                過去の記録
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.map((roll, index) => (
                  <div
                    key={roll.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{prizes[roll.dice_result].emoji}</span>
                      <div>
                        <p className="font-medium">{roll.prize_name}</p>
                        <p className="text-sm text-slate-500">{format(new Date(roll.date), 'yyyy/MM/dd')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-600">+{roll.prize_points}pt</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}