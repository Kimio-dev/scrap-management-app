import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { checkClosing } from '../middlewares/checkClosing';
import { scrapValidationRules, validate } from '../middlewares/scrapValidator'; // 💡 1. 作成したバリデータ一式をインポート

const router = Router();

// データ取得 (READ) - 月締めチェックは不要
router.get('/', async (req: Request, res: Response) => {
  try {
    const scraps = await prisma.scrap_collections.findMany({
      include: {
        users_scrap_collections_created_byTousers: { select: { name: true } }
      },
      orderBy: { collection_date: 'desc' }
    });
    const closings = await prisma.monthly_closings.findMany();
    res.json({ scraps, closings });
  } catch (error) {
    res.status(500).json({ error: "データの取得に失敗しました" });
  }
});

// 🌟 年間スクラップ発生量集計API (グラフ・サマリー用)
router.get('/analytics/:year', async (req: Request, res: Response) => {
  try {
    const  year  = req.params.year as string;
    const targetYear = parseInt(year, 10);

    if (isNaN(targetYear)) {
      return res.status(400).json({ error: "有効な年度を指定してください。" });
    }

    // 1. 指定された年のデータをすべて取得
    const startDate = new Date(`${targetYear}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${targetYear}-12-31T23:59:59.999Z`);

    const yearScraps = await prisma.scrap_collections.findMany({
      where: {
        collection_date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // 2. 月締め状況もあわせて取得
    const closings = await prisma.monthly_closings.findMany({
      where: {
        year_month: {
          startsWith: `${targetYear}-`,
        },
      },
    });

    // 3. 1月〜12月の空の枠組み（ベースデータ）を用意する
    const monthlyDataMap = Array.from({ length: 12 }, (_, i) => {
      const monthStr = String(i + 1).padStart(2, '0');
      return {
        month: `${i + 1}月`,                         // グラフのX軸用 (例: "1月")
        year_month: `${targetYear}-${monthStr}`,    // テーブルやデータ紐付け用 (例: "2026-01")
        amount: 0,                                   // 合計トン数
        count: 0,                                    // 収集日数
        isClosed: false,                             // 月締め状況
      };
    });

    // 4. 取得したスクラップ実績を月ごとに集計・加算
    yearScraps.forEach((scrap) => {
      const date = new Date(scrap.collection_date);
      const monthIndex = date.getMonth(); // 0が1月、11が12月

      if (monthIndex >= 0 && monthIndex <= 11) {
        monthlyDataMap[monthIndex].amount += scrap.amount.toNumber();
        monthlyDataMap[monthIndex].count += 1;
      }
    });

    // 5. 月締めステータスをマッピング
    closings.forEach((closing) => {
      // "2026-06" のような文字列から月（数値）を取り出す
      const monthNum = parseInt(closing.year_month.split('-')[1], 10);
      const monthIndex = monthNum - 1;
      
      if (monthIndex >= 0 && monthIndex <= 11) {
        monthlyDataMap[monthIndex].isClosed = true;
      }
    });

    // 小数点第3位などで浮動小数点の誤差が出ないよう、最後に綺麗に丸める
    const result = monthlyDataMap.map(item => ({
      ...item,
      amount: Math.round(item.amount * 100) / 100 // 小数点第2位まで丸める
    }));

    // フロントエンドへ返却
    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "年間集計データの取得に失敗しました" });
  }
});

// データ作成 (CREATE) 
// 💡 2. 実行順: ルール適用(scrapValidationRules) ➔ 判定(validate) ➔ 月締め(checkClosing)
router.post('/', scrapValidationRules, validate, checkClosing, async (req: Request, res: Response) => {
  try {
    const { collection_date, amount, created_by } = req.body;

    // 💡 express-validatorが事前に必須チェックを完了しているため、ここの「if (!collection_date || ...)」の塊は削除してOKです！

    const newScrap = await prisma.scrap_collections.create({
      data: {
        collection_date: new Date(collection_date),
        amount: amount,
        created_by: created_by
      }
    });
    res.status(201).json(newScrap);
  } catch (error) {
    res.status(500).json({ error: "データの保存に失敗しました" });
  }
});

// データ更新 (UPDATE)
// 💡 3. PUT側も同様に、月締めチェックの手前にバリデーションを2つ挟み込みます
router.put('/:id', scrapValidationRules, validate, checkClosing, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { collection_date, amount, created_by } = req.body;

    const updatedScrap = await prisma.scrap_collections.update({
      where: { id: parseInt(id as string, 10) },
      data: {
        collection_date: new Date(collection_date),
        amount: amount,
        created_by: created_by
      }
    });
    res.json(updatedScrap);
  } catch (error) {
    res.status(500).json({ error: "データの更新に失敗しました" });
  }
});

// データ削除 (DELETE) - 削除はリクエストボディ（入力パラメータ）がないため、今まで通り月締めチェックのみでOK
router.delete('/:id', checkClosing, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.scrap_collections.delete({
      where: { id: parseInt(id as string, 10) }
    });
    res.json({ message: "削除に成功しました" });
  } catch (error) {
    res.status(500).json({ error: "データの削除に失敗しました" });
  }
});

// 🌟 月締めを実行する (ON)
router.post('/closings', async (req: Request, res: Response) => {
  try {
    const { year_month } = req.body; // フロントから "2026-06" などが届く
    if (!year_month) return res.status(400).json({ error: "年月が指定されていません" });

    const newClosing = await prisma.monthly_closings.create({
      data: {
        year_month: year_month,
        closed_by: 1 // 練習用なので一律ユーザーID: 1（管理者等）で固定
      }
    });
    res.status(201).json(newClosing);
  } catch (error) {
    res.status(500).json({ error: "月締め処理に失敗しました" });
  }
});

// 🌟 月締めを解除する (OFF) - 練習・テスト用に削除APIも用意
router.delete('/closings/:year_month', async (req: Request, res: Response) => {
  try {
    const year_month = req.params.year_month as string;
    
    await prisma.monthly_closings.deleteMany({
      where: { year_month: year_month }
    });
    res.json({ message: "月締めを解除しました" });
  } catch (error) {
    res.status(500).json({ error: "月締め解除に失敗しました" });
  }
});

export default router;