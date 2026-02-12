import { Router, Request, Response } from 'express';
import { stringify } from 'csv-stringify/sync';
import { z } from 'zod';
import { handleRouteError } from '../lib/http';
import { irSchema } from '../lib/ir-validation';

const router = Router();

const exportSchema = z.object({
  ir: irSchema,
}).strict();

// POST /export/csv - Generate CSV from IR
router.post('/csv', async (req: Request, res: Response) => {
  try {
    const data = exportSchema.parse(req.body);

    const csvRows = data.ir.rows.map((row) => ({
      Case: row.Case,
      Step: row.Step,
      Expected: row.Expected,
      Tag: row.Tag,
      Priority: row.Priority,
      remarks: row.remarks,
    }));

    const csv = stringify(csvRows, {
      header: true,
      columns: [
        { key: 'Case', header: 'ケース' },
        { key: 'Step', header: '操作内容' },
        { key: 'Expected', header: '期待結果' },
        { key: 'Tag', header: 'タグ' },
        { key: 'Priority', header: '優先度' },
        { key: 'remarks', header: '備考' },
      ],
      bom: true,
    });

    res.json({ csv });
  } catch (error: unknown) {
    handleRouteError(res, error, {
      defaultMessage: 'CSV生成に失敗しました',
      logPrefix: 'Failed to export CSV:',
    });
  }
});

export default router;
