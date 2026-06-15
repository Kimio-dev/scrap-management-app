interface User {
  id: number;
  name: string;
}

interface UserSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export default function UserSelect({ value, onChange }: UserSelectProps) {
  // 💡 マスターデータをここに集約。ユーザーが増減してもここを直すだけで一発反映
  const userMaster: User[] = [
    { id: 1, name: '管理者 太郎' },
    { id: 2, name: '現場 次郎' },
  ];

  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 mb-1">登録担当者</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {userMaster.map((user) => (
          <option key={user.id} value={user.id}>{user.name}</option>
        ))}
      </select>
    </div>
  );
}