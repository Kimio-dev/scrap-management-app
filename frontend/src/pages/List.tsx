import { useEffect, useState } from 'react';
import ScrapCreateModal from '../components/ScrapCreateModal';
import ScrapEditModal from '../components/ScrapEditModal'; // 🌟 編集モーダルをインポート

interface ScrapCollection {
  id: number;
  collection_date: string;
  amount: string;
  created_by: number; // 👈 編集用に型へ追加
  created_at: string;
  users_scrap_collections_created_byTousers: {
    name: string;
  };
}

interface MonthlyClosing {
  id: number;
  year_month: string;
  closed_at: string;
  closed_by: number;
}

export default function List() {
  const [scraps, setScraps] = useState<ScrapCollection[]>([]);
  const [closings, setClosings] = useState<MonthlyClosing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // カレンダーの年月・選択日の管理
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  // 🌟 追加：現在選択されている「明細のID」を管理
  const [selectedScrapId, setSelectedScrapId] = useState<number | null>(null);

  // 登録モーダルの状態管理
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [modalDefaultDate, setModalDefaultDate] = useState<string>('');

  // 🌟 追加：編集モーダルの状態管理
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);

  // データの再取得
  const fetchAllData = () => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/scraps`)
      .then((res) => {
        if (!res.ok) throw new Error('データの取得に失敗しました');
        return res.json();
      })
      .then((data) => {
        setScraps(data.scraps);
        setClosings(data.closings);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  

  // 🌟 カレンダーの日付を選択した時の処理
  const handleDaySelect = (day: number) => {
    setSelectedDay(day);
    setSelectedScrapId(null); // 選択日付が変わったら、明細の選択をクリアする
  };

  // 新規登録ボタンが押された時
  const handleOpenCreate = () => {
    const yyyy = currentYear;
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(selectedDay).padStart(2, '0');
    setModalDefaultDate(`${yyyy}-${mm}-${dd}`);
    setIsCreateOpen(true);
  };

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    fetchAllData();
  };

  // 🌟 編集・削除が成功した後の「疑似リダイレクト」処理
  const handleEditSuccess = () => {
    setIsEditOpen(false);
    setSelectedScrapId(null); // 選択状態をリセット
    fetchAllData();           // データを再読込して画面更新
  };

  const handleToggleClosing = async () => {
  const url = `${import.meta.env.VITE_API_BASE_URL}/api/scraps/closings${isClosed ? `/${currentYearMonthStr}` : ''}`;
  const method = isClosed ? 'DELETE' : 'POST';
  
  if (!window.confirm(`この月の締め処理を${isClosed ? '解除' : '実行'}しますか？`)) return;

  try {
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: isClosed ? undefined : JSON.stringify({ year_month: currentYearMonthStr })
    });

    if (!response.ok) throw new Error('月締め処理の切り替えに失敗しました');
    
    alert(`月締めを${isClosed ? '解除' : '完了'}しました！`);
    fetchAllData(); // 💡 状態が変わったので、カレンダー全体を再読み込み！
  } catch (err: unknown) {
    alert(err instanceof Error ? err.message : 'エラーが発生しました');
  }
  };

  // --- カレンダー計算ロジック ---
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calendarCells = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
  for (let day = 1; day <= totalDaysInMonth; day++) calendarCells.push(day);

  const handlePrevMonth = () => { setCurrentDate(new Date(currentYear, currentMonth - 1, 1)); handleDaySelect(1); };
  const handleNextMonth = () => { setCurrentDate(new Date(currentYear, currentMonth + 1, 1)); handleDaySelect(1); };
  const handleCurrentMonth = () => { setCurrentDate(new Date()); handleDaySelect(new Date().getDate()); };

  const getScrapsForDay = (day: number) => {
    return scraps.filter((scrap) => {
      const d = new Date(scrap.collection_date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === day;
    });
  };

  // --- 集計・ステータスロジック ---
  const monthlyTotalAmount = scraps
    .filter((scrap) => {
      const d = new Date(scrap.collection_date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .reduce((sum, scrap) => sum + parseFloat(scrap.amount), 0);

  const currentYearMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const isClosed = closings.some((closing) => closing.year_month.trim() === currentYearMonthStr);

  const selectedDayScraps = getScrapsForDay(selectedDay);
  const hasScrapsSelectedDay = selectedDayScraps.length > 0;

  // 🌟 現在選択中の明細オブジェクトを探して特定する
  const activeSelectedScrap = scraps.find(s => s.id === selectedScrapId) || null;

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">データを読み込み中...</div>;
  if (error) return <div className="p-8 text-center text-red-500 font-medium">エラー: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 bg-slate-50 min-h-screen font-sans relative">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* 左側：コンパクトカレンダーエリア */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-xs border border-slate-200 p-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">回収実績カレンダー</h1>
                <p className="text-slate-400 text-xs font-mono">{currentYearMonthStr}</p>
              </div>
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 text-sm">
                <button onClick={handlePrevMonth} className="px-2 py-1 hover:bg-white rounded transition font-bold text-slate-600">←</button>
                <button onClick={handleCurrentMonth} className="px-2 py-1 text-xs bg-white shadow-xs text-slate-700 rounded transition">今月</button>
                <span className="font-bold text-slate-800 px-2 min-w-[100px] text-center font-mono">{currentMonth + 1}月</span>
                <button onClick={handleNextMonth} className="px-2 py-1 hover:bg-white rounded transition font-bold text-slate-600">→</button>
              </div>
            </div>

            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="grid grid-cols-7 bg-slate-50 text-center py-2 text-xs font-bold text-slate-500 border-b border-slate-100">
                <div className="text-red-400">日</div><div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div className="text-blue-400">土</div>
              </div>

              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-50">
                {calendarCells.map((day, index) => {
                if (day === null) return <div key={`empty-${index}`} className="bg-slate-50/50 aspect-square lg:h-20" />;

                const dayScraps = getScrapsForDay(day);
                
                // 基準となる「今日」の日付オブジェクト（時刻を00:00:00にリセットして純粋な日付比較にする）
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // カレンダーのこのマスの日付オブジェクト
                const cellDate = new Date(currentYear, currentMonth, day);

                // 💡 【追加判定】マスの日付が「今日」より未来であれば true
                const isFuture = cellDate > today;

                const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth && new Date().getFullYear() === currentYear;
                const isSelected = selectedDay === day;

                return (
                  <div
                    key={`day-${day}`}
                    // 💡 明日以降（isFuture）の場合はクリックしても何も起きないように制御
                    onClick={() => !isFuture && handleDaySelect(day)}
                    // 💡 未来日の場合は背景をグレー（bg-slate-100）にし、ホバーやカーソルを禁止にする
                    className={`aspect-square lg:h-20 p-2 flex flex-col justify-between transition relative ${
                      isFuture
                        ? 'bg-slate-100 text-slate-300 cursor-not-allowed pointer-events-none select-none' // 未来日のスタイル
                        : isSelected
                          ? 'bg-blue-50/70 ring-2 ring-blue-500 ring-inset z-10 cursor-pointer'
                          : 'bg-white hover:bg-slate-50 cursor-pointer'
                    }`}
                  >
                    {/* 未来日ではない、かつ実績がある場合のみドットを表示 */}
                    {dayScraps.length > 0 && !isFuture && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    )}
                    
                    <span className={`text-xs font-bold font-mono w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : isFuture
                          ? 'text-slate-300' // 未来日の数字は薄いグレーに
                          : isSelected 
                            ? 'text-blue-600 font-black' 
                            : index % 7 === 0 
                              ? 'text-red-500' 
                              : index % 7 === 6 
                                ? 'text-blue-500' 
                                : 'text-slate-600'
                    }`}>
                      {day}
                    </span>
                  </div>
                );
              })}
              </div>
            </div>
          </div>
        </div>

        {/* 右側：情報＆操作パネル */}
        <div className="flex flex-col justify-between space-y-4">
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 text-white">
              <p className="text-[10px] text-slate-400 font-medium">月間総引き取り量</p>
              <p className="text-xl font-black font-mono mt-1">
                {monthlyTotalAmount.toLocaleString('ja-JP', { maximumFractionDigits: 1 })}<span className="text-xs font-normal text-slate-400 ml-0.5">kg</span>
              </p>
            </div>
            <div className="border border-slate-100 bg-slate-50 rounded-xl p-3 flex flex-col justify-between">
              <p className="text-[10px] text-slate-400 font-medium">月締め状況</p>
              <div className="flex flex-col gap-2 mt-1">
                <div>
                  {isClosed 
                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">● 完了</span> 
                    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800">● 未締め</span>
                  }
                </div>
              
                {/* 🌟 ON/OFF 切り替えボタンを追加 */}
                <button
                onClick={handleToggleClosing}
                className={`text-[10px] font-bold py-1 px-2 rounded-lg border transition text-center shadow-2xs ${
                  isClosed 
                    ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100' // 解除ボタンの見た目
                    : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700' // 締めボタンの見た目
                }`}
                >
                {isClosed ? '月締めを解除する' : 'この月を締め切る'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 flex flex-col flex-1 min-h-[410px] justify-between">
            <div className="flex flex-col flex-1">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3 shrink-0">
                <h2 className="text-sm font-bold text-slate-800 font-mono">{currentMonth + 1}月 {selectedDay}日の明細</h2>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  稼働: {calendarCells.filter(day => day !== null && getScrapsForDay(day).length > 0).length}日
                </span>
              </div>

              <div className="space-y-2 overflow-y-auto max-h-[290px] pr-1 flex-1 custom-scrollbar">
                {!hasScrapsSelectedDay ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-xs text-slate-400 italic">引き取り実績はありません</div>
                ) : (
                  selectedDayScraps.map((scrap) => {
                    const isScrapSelected = selectedScrapId === scrap.id;
                    return (
                      <div
                        key={scrap.id}
                        onClick={() => setSelectedScrapId(isScrapSelected ? null : scrap.id)} // 🌟 クリックで選択/解除
                        className={`flex justify-between items-center py-2.5 px-3 rounded-lg text-xs transition cursor-pointer ${
                          isScrapSelected 
                            ? 'bg-blue-600 text-white shadow-xs font-medium' // 🌟 選択時のスタイル
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className={`truncate max-w-[140px] ${isScrapSelected ? 'text-white' : 'text-slate-700'}`}>
                          👤 {scrap.users_scrap_collections_created_byTousers?.name || '不明'}
                        </span>
                        <span className={`font-mono font-bold text-sm ${isScrapSelected ? 'text-white' : 'text-blue-600'}`}>
                          {parseFloat(scrap.amount).toLocaleString('ja-JP')} kg
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ボタンコントロール */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 shrink-0">
              <button
                onClick={handleOpenCreate}
                disabled={isClosed}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition shadow-2xs ${
                  isClosed ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                新規登録
              </button>
              
              {/* 🌟 編集ボタン: 明細が選ばれている時のみアクティブ化 */}
              <button
                onClick={() => setIsEditOpen(true)}
                disabled={isClosed || selectedScrapId === null}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition border shadow-2xs ${
                  isClosed || selectedScrapId === null
                    ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 ring-2 ring-blue-500/20'
                }`}
              >
                編集
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-2.5 flex justify-between items-center text-[11px] shrink-0">
            <span className="text-emerald-600 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>システム正常</span>
            <button className="text-slate-500 hover:text-slate-800 font-bold bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded transition">CSV出力</button>
          </div>
        </div>
      </div>

      {/* 新規登録モーダル */}
      <ScrapCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        defaultDate={modalDefaultDate}
        onSuccess={handleCreateSuccess}
      />

      {/* 🌟 編集モーダルを追加 */}
      <ScrapEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={handleEditSuccess}
        scrapData={activeSelectedScrap}
      />

    </div>
  );
}