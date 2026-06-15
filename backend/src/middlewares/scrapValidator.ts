import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 💡 1. バリデーションルールの定義
export const scrapValidationRules = [
  // --- 回収日のチェック ---
  body('collection_date')
    .notEmpty().withMessage('回収日は必須項目です。')
    .isISO8601().withMessage('正しい日付形式(YYYY-MM-DD)で入力してください。')
    .custom((value) => {
  // フロントから届く値は "2026-06-11" という形式
    const inputDateStr = value; 

    // サーバー側の現在時刻から、日本時間の "2026-06-11" を作成
    const todayStr = new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-'); // "2026/06/11" を "2026-06-11" に変換

    // 文字列のまま比較（"2026-06-12" > "2026-06-11" のように綺麗に比較できます）
    if (inputDateStr > todayStr) {
      throw new Error('未来の日付で実績を登録・更新することはできません。');
    }
    return true;
  }),

  // --- 回収量のチェック ---
  body('amount')
    .notEmpty().withMessage('回収量は必須項目です。')
    .isFloat({ min: 0.01 }).withMessage('回収量は0.01t以上で入力してください。'),

  // --- 担当者IDのチェック ---
  body('created_by')
    .notEmpty().withMessage('登録担当者は必須項目です。')
    .isInt().withMessage('担当者IDは不正な値です。')
    .custom(async (value) => {
      // 💡 【バックエンド特有】マスタ存在チェック
      const user = await prisma.users.findUnique({
        where: { id: parseInt(value, 10) },
      });
      if (!user) {
        throw new Error('指定された登録担当者はシステムに存在しません。');
      }
      return true;
    }),
];

// 💡 2. エラーを判定してフロントに返すミドルウェア
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next(); // エラーがなければ次の処理（月締めチェックやコントローラー）へ
  }

  // 最初のエラーメッセージを1つだけピックアップして、フロントがパースしやすい { error: "..." } 形式で返す
  const firstError = errors.array()[0];
  return res.status(400).json({ error: firstError.msg });
};