import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface MonthlyData {
  month: string;
  year_month: string;
  amount: number;
  count: number;
  isClosed: boolean;
}

export default function Analytics() {
  const [displayData, setDisplayData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear());

  const fetchAnalyticsData = async (year: number) => {
    setLoading(true);
    try {
      const [currentYearRes, nextYearRes] = await Promise.all([
        fetch(`http://localhost:3001/api/scraps/analytics/${year}`),
        fetch(`http://localhost:3001/api/scraps/analytics/${year + 1}`)
      ]);

      if (!currentYearRes.ok || !nextYearRes.ok) {
        throw new Error('年間集計データの取得に失敗しました');
      }

      const currentYearData: MonthlyData[] = await currentYearRes.json();
      const nextYearData: MonthlyData[] = await nextYearRes.json();

      const aprilToDecember = currentYearData.slice(3);
      const januaryToMarch = nextYearData.slice(0, 3);

      const fiscalYearData = [...aprilToDecember, ...januaryToMarch];
      setDisplayData(fiscalYearData);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData(targetYear);
  }, [targetYear]);

  // --- サマリーデータ計算 ---
  const totalAmount = displayData.reduce((sum, item) => sum + item.amount, 0);
  const activeMonths = displayData.filter(item => item.count > 0).length;
  const averageAmount = activeMonths > 0 ? totalAmount / activeMonths : 0;
  
  // 最多発生月の計算
  const maxMonthItem = displayData.reduce(
    (max, item) => (item.amount > max.amount ? item : max),
    { month: 'なし', amount: 0 }
  );

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">分析データを集計中...</div>;
  if (error) return <div className="p-8 text-center text-red-500 font-medium">エラー: {error}</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 bg-slate-50 min-h-screen font-sans">
      
      {/* 1. ヘッダーエリア */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">📊 スクラップ発生量 分析ダッシュボード</h1>
          <p className="text-slate-400 text-xs mt-0.5">工場全体の歩留まり・実績推移の可視化（年度区切り）</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">集計期間:</span>
          <select
            value={targetYear}
            onChange={(e) => setTargetYear(parseInt(e.target.value, 10))}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value={2025}>2025年度（2025/04 〜 2026/03）</option>
            <option value={2026}>2026年度（2026/04 〜 2027/03）</option>
            <option value={2027}>2027年度（2027/04 〜 2028/03）</option>
          </select>
        </div>
      </div>

      {/* 2. サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 text-white shadow-2xs">
          <p className="text-xs text-slate-400 font-medium">年度総発生量</p>
          <p className="text-2xl font-black font-mono mt-1">
            {totalAmount.toLocaleString('ja-JP', { maximumFractionDigits: 2 })}<span className="text-xs font-normal text-slate-400 ml-1">kg</span>
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <p className="text-xs text-slate-400 font-medium">月平均発生量</p>
          <p className="text-2xl font-black font-mono text-slate-800 mt-1">
            {averageAmount.toLocaleString('ja-JP', { maximumFractionDigits: 2 })}<span className="text-xs font-normal text-slate-400 ml-1">kg</span>
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <p className="text-xs text-slate-400 font-medium">年度内 最多発生月</p>
          <p className="text-2xl font-black font-mono text-rose-600 mt-1">
            {/* 🌟 ①「年度内 最多発生月」にカンマを適用 */}
            {maxMonthItem.amount > 0 
              ? `${maxMonthItem.month} (${maxMonthItem.amount.toLocaleString('ja-JP', { maximumFractionDigits: 2 })}kg)` 
              : '実績なし'
            }
          </p>
        </div>
      </div>

      {/* 3. メインチャート */}
      <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 p-4 mb-6">
        <h2 className="text-sm font-bold text-slate-700 mb-4">🗓️ 月別発生量トレンド ({targetYear}年度)</h2>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              
              {/* 🌟 ②「Y軸ラベル」に tickFormatter を使ってカンマを適用 */}
              <YAxis 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                axisLine={false} 
                tickLine={false} 
                unit="kg" 
                width={55} 
                tickFormatter={(value: number) => value.toLocaleString('ja-JP')}
              />

              {/* 🌟 ③「ツールチップ」の文字列結合技で、型エラーとanyを完全回避しつつカンマ適用 */}
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff' }}
                labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                cursor={{ fill: '#f8fafc' }}
                formatter={(value) => [`${Number(value).toLocaleString('ja-JP', { maximumFractionDigits: 2 })} kg`, 'スクラップ発生量']}
              />
              
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar name="スクラップ発生量" dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. 月別実績データテーブル */}
      <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-sm font-bold text-slate-700">📋 月別実績内訳明細 ({targetYear}年度)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50/30">
                <th className="p-3">対象月</th>
                <th className="p-3 text-right">総発生量</th>
                <th className="p-3 text-right">回収実績件数</th>
                <th className="p-3 text-center">月締め状況</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 font-mono">
              {displayData.map((item) => (
                <tr key={item.year_month} className="hover:bg-slate-50/80 transition">
                  <td className="p-3 font-bold text-slate-700">{item.year_month}</td>
                  
                  {/* 🌟 ④「月別実績内訳明細の総発生量」にカンマを適用 */}
                  <td className="p-3 text-right text-blue-600 font-bold">
                    {item.amount.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                  </td>
                  
                  <td className="p-3 text-right">{item.count} 回</td>
                  <td className="p-3 text-center">
                    {item.isClosed ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">完了</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px]">未締め</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}