import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export const checkClosing = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // 💡 req.body が undefined でもクラッシュしないように「?.」を使用
        let collectionDateStr = req.body?.collection_date;

        // URLパラメータからIDを取得（id または scrapId）
        const scrapIdStr = req.params.id || req.params.scrapId;

        if (!collectionDateStr && scrapIdStr) {
            const currentScrap = await prisma.scrap_collections.findUnique({
                where: { id: parseInt(scrapIdStr as string, 10) }
            });

            // 確実に対象がいない場合はここで終了させる
            if (!currentScrap) {
                return res.status(404).json({ error: 'データが見つかりません。' });
            }

            collectionDateStr = currentScrap.collection_date;
        }

        // 日付が特定できなければチェックをスキップして次へ
        if (!collectionDateStr) return next();

        const targetDate = new Date(collectionDateStr);
        const targetYearMonthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
        
        const isClosed = await prisma.monthly_closings.findUnique({
            where: { year_month: targetYearMonthStr }
        });

        if (isClosed) {
            return res.status(400).json({ error: "該当月はすでに月締めが完了しているため、操作できません。" });
        }

        next();

    } catch (error) {
        console.error("月締めチェックエラー:", error);
        res.status(500).json({ error: "月締め状況の検証に失敗しました" });
    }
}