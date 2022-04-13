import { parse } from 'ts-command-line-args';
import * as csv from 'csv-parser';
import { createReadStream, createWriteStream } from 'fs';

const options = parse<CommandLineArgs>({
  file: { alias: 'f', type: String },
  out: { alias: 'o', type: String, defaultValue: 'output.csv'},
});

(async () => {
  const results = await readCsv(options.file);
  const output = formatOutput(results);
  writeCsv(output);

  console.log(output);
  console.log(Object.values(ColumnHeaders).join(','))

})().catch(err => console.error(err));

function readCsv(filename: string): Promise<InputCsv[]> {
  return new Promise((resolve, reject) => {
    const results: InputCsv[] = [];
    createReadStream(filename)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

function formatOutput(input: InputCsv[]): OutputCsv[] {
  const results: OutputCsv[] = [];
  for (const row of input) {
    switch (row.Event) {
      case InputType.PURCHASE:
        results.push({
          type: TransactionType.TRADE,
          buyAmount: Number(row['Unit Count']),
          buyCurrency: 'BTC',
          sellAmount: Number(row.USD),
          sellCurrency: 'USD',
          feeAmount: Number(row['Fee USD']),
          feeCurrency: 'USD',
          exchange: 'Swan Bitcoin',
          date: new Date(row.Date),
        });
        break;
      case InputType.FEE:
        results.push({
          type: TransactionType.EXPENSE,
          sellAmount: Number(row['Fee USD']),
          sellCurrency: 'USD',
          exchange: 'Swan Bitcoin',
          date: new Date(row.Date),
        });
        break;
      case InputType.DEPOSIT:
      default:
    }
  }
  return results;
}

function writeCsv(output: OutputCsv[]): void {
  const stream = createWriteStream(options.out);
  stream.write(Object.values(ColumnHeaders).join(','));
  stream.write('\n');
  for (const row of output) {
    stream.write([
      row.type,
      row.buyAmount || '',
      row.buyCurrency || '',
      row.sellAmount,
      row.sellCurrency,
      row.feeAmount || '',
      row.feeCurrency || '',
      row.exchange,
      row.group || '',
      row.comment || '',
      row.date.toISOString(),
    ].join(','));
    stream.write('\n');
  }
  stream.end();
}

interface CommandLineArgs {
  file: string;
  out: string;
}

interface InputCsv {
  Event: string;
  Date: string;
  Timezone: string;
  Status: string;
  USD: string;
  'Unit Count': string;
  'Asset Type': string;
  'BTC Price': string;
  'Fee USD': string;
}

enum InputType {
  DEPOSIT = 'deposit',
  FEE = 'prepaid_fee',
  PURCHASE = 'purchase',
}

enum TransactionType {
  TRADE = 'Trade',
  EXPENSE = 'Expense',
}

enum ColumnHeaders {
  TYPE = 'Type',
  BUY_AMOUNT = 'Buy',
  BUY_CURRENCY = 'Cur.',
  SELL_AMOUNT = 'Sell',
  SELL_CURRENCY = 'Cur.',
  FEE_AMOUNT = 'Fee',
  FEE_CURRENCY = 'Cur.',
  EXCHANGE = 'Exchange',
  GROUP = 'Group',
  COMMENT = 'Comment',
  DATE = 'Date',
}

interface OutputCsv {
  type: TransactionType;
  buyAmount?: number;
  buyCurrency?: string;
  sellAmount: number;
  sellCurrency: string;
  feeAmount?: number;
  feeCurrency?: string;
  exchange: string;
  group?: string;
  comment?: string;
  date: Date;
}
