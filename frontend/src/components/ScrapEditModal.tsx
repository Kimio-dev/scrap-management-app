import { useEffect, useState } from 'react';
import UserSelect from './UserSelect'; // 💡 切り出した共通パーツをインポート
import { formatZenToHan } from '../utils/format'; // 💡 切り出した共通関数をインポート

interface ScrapEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  scrapData: {
    id: number;
    collection_date: string;
    amount: string;
    created_by: number;
  } | null;
}

export default function ScrapEditModal({ isOpen, onClose, onSuccess, scrapData }: ScrapEditModalProps) {
  const [inputDate, setInputDate] = useState<string>('');
  const [inputAmount, setInputAmount] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('1');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // モーダルが開いた時、または選択データが変わった時に初期値をセット
  useEffect(() => {
    if (isOpen && scrapData) {
      const formattedDate = scrapData.collection_date.split('T')[0];
      setInputDate(formattedDate);
      setInputAmount(parseFloat(scrapData.amount).toString());
      setSelectedUserId(scrapData.created_by?.toString() || '1');
    }
  }, [isOpen, scrapData]);

  if (!isOpen || !scrapData) return null;

  // 🌟 更新処理（保存ボタン）
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputDate || !inputAmount || parseFloat(inputAmount) <= 0) {
      alert('正しい数値を入力してください。');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`http://localhost:3001/api/scraps/${scrapData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection_date: inputDate,
          amount: parseFloat(inputAmount),
          created_by: parseInt(selectedUserId, 10),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '更新に失敗しました');
      }

      alert('実績を更新しました');
      onSuccess();
    } catch (err: unknown) {
      alert(err instanceof Error ? `エラー: ${err.message}` : 'エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🌟 削除処理（削除ボタン）
  const handleDelete = async () => {
    if (!window.confirm('この回収実績明細を削除してもよろしいですか？')) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`http://localhost:3001/api/scraps/${scrapData.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '削除に失敗しました');
      }

      alert('実績を削除しました');
      onSuccess();
    } catch (err: unknown) {
      alert(err instanceof Error ? `エラー: ${err.message}` : 'エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-800">スクラップ回収実績 編集</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">×</button>
        </div>
        
        <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">回収日</label>
            <input 
              type="date" 
              readOnly
              value={inputDate} 
              className="w-full px-3 py-2 border border-slate-100 bg-slate-50 text-slate-500 rounded-xl text-sm font-mono cursor-not-allowed focus:outline-none" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">回収量 (kg)</label>
            <div className="relative">
              <input 
                type="number" 
                step="0.01" 
                min="0.01" 
                required 
                value={inputAmount} 
                onChange={(e) => setInputAmount(formatZenToHan(e.target.value))} // 💡 共通関数を使用
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-right font-mono pr-8 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              />
              <span className="absolute right-3 top-2 text-sm text-slate-400 font-mono">kg</span>
            </div>
          </div>

          {/* 💡 共通コンポーネントを呼び出す（編集側もこれ1行で完結） */}
          <UserSelect value={selectedUserId} onChange={setSelectedUserId} />

          <div className="flex justify-between items-center pt-4 border-t border-slate-100 gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDelete}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition disabled:opacity-50"
            >
              削除する
            </button>

            <div className="flex items-center gap-2 flex-1 justify-end">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition">
                キャンセル
              </button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white transition shadow-2xs disabled:bg-blue-400">
                {isSubmitting ? '保存中...' : '変更を保存'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}