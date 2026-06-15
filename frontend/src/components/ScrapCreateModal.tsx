import { useEffect, useState } from 'react';
import UserSelect from './UserSelect'; // 💡 共通パーツをインポート
import { formatZenToHan } from '../utils/format'; // 💡 共通関数をインポート

interface ScrapCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate: string;
  onSuccess: () => void;
}

export default function ScrapCreateModal({ isOpen, onClose, defaultDate, onSuccess }: ScrapCreateModalProps) {
  const [inputDate, setInputDate] = useState<string>('');
  const [inputAmount, setInputAmount] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('1');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setInputDate(defaultDate);
      setInputAmount('');
    }
  }, [isOpen, defaultDate]);

  if (!isOpen) return null;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputDate || !inputAmount || parseFloat(inputAmount) <= 0) {
      alert('正しい日付と数量を入力してください。');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:3001/api/scraps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection_date: inputDate,
          amount: parseFloat(inputAmount),
          created_by: parseInt(selectedUserId, 10),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '登録に失敗しました');
      }

      onSuccess();
      alert('スクラップ回収実績を登録しました！');
    } catch (err: unknown) {
      alert(err instanceof Error ? `エラー: ${err.message}` : '予期せぬエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-800">スクラップ回収実績 登録</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">×</button>
        </div>
        
        <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">回収日</label>
            <input
              type="date"
              readOnly
              value={inputDate}
              className="w-full px-3 py-2 border border-slate-100 bg-slate-50 text-slate-500 rounded-xl text-sm font-mono cursor-not-allowed focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">回収量 (kg)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={inputAmount}
                onChange={(e) => setInputAmount(formatZenToHan(e.target.value))} // 💡 共通関数を使用
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right font-mono pr-8"
              />
              <span className="absolute right-3 top-2 text-sm text-slate-400 font-mono">kg</span>
            </div>
          </div>

          {/* 💡 共通コンポーネントを呼び出すだけ（1行で済む） */}
          <UserSelect value={selectedUserId} onChange={setSelectedUserId} />

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="w-full py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50">
              キャンセル
            </button>
            <button type="submit" disabled={isSubmitting} className="w-full py-2 rounded-xl text-xs font-bold bg-blue-600 text-white transition disabled:bg-blue-400 hover:bg-blue-700">
              {isSubmitting ? '登録中...' : 'データを保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}