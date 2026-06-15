import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { error } from 'node:console';

export const checkClosing = async ( req:Request, res:Response, next:NextFunction) => {
    try {
        let collectionDateStr = req.body.collection_date;

        if(!collectionDateStr && req.params.id) {
            const currentScrap = await prisma.scrap_collections.findUnique({
                where: { id: parseInt(req.params.id as string, 10)}
            });
            if (!currentScrap) return res.status(404).json({ error: 'データが見つかりません。'});
            collectionDateStr = currentScrap.collection_date;
        }
        if (!collectionDateStr) return next();
        const targetDate = new Date(collectionDateStr);
        const targetYearMonthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
        const isClosed = await prisma.monthly_closings.findUnique({
            where: {year_month : targetYearMonthStr}
        });
        if (isClosed) {
            return res.status(400).json({ error: "該当月はすでに月締めが完了しているため、操作できません。"});
        }
        // 締められていなければ、次の処理（実際のAPI処理）へ進む
        next();

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "月締め状況の検証に失敗しました"});
    }
} 