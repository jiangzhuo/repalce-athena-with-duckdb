import * as duckdb from 'duckdb';
import * as util from "util";
import { Handler } from 'aws-lambda';

const BUCKET_NAME = process.env.BUCKET_NAME;
const db = new duckdb.Database(':memory:');

export const handler: Handler = async (event) => {
  console.log('event', event);
  const sql = event.sql;

  async function executeQuery(query: string) {
    console.time(query);
    const result = await dbAllPromise(query);
    console.timeEnd(query);
    return result;
  }

  const dbAllPromise = util.promisify(db.all.bind(db));

  // const sql = 'SELECT 42 AS the_answer';
  // const sql = `SELECT avg(c_acctbal) FROM 'https://shell.duckdb.org/data/tpch/0_01/parquet/customer.parquet'`;
  // SELECT count(*) FROM 'https://shell.duckdb.org/data/tpch/0_01/parquet/lineitem.parquet';
  // SELECT count(*) FROM 'https://shell.duckdb.org/data/tpch/0_01/parquet/customer.parquet';
  // SELECT avg(c_acctbal) FROM 'https://shell.duckdb.org/data/tpch/0_01/parquet/customer.parquet';
  // SELECT * FROM 'https://shell.duckdb.org/data/tpch/0_01/parquet/orders.parquet' LIMIT 10;
  // SELECT n_name, count(*)
  // FROM 'https://shell.duckdb.org/data/tpch/0_01/parquet/customer.parquet',
  //   'https://shell.duckdb.org/data/tpch/0_01/parquet/nation.parquet'
  // WHERE c_nationkey = n_nationkey GROUP BY n_name;

  // const queries = [
  //   `SELECT count(*) FROM read_parquet('s3://${BUCKET_NAME}/lineitem.parquet');`,
  //   `SELECT count(*) FROM read_parquet('s3://${BUCKET_NAME}/customer.parquet');`,
  //   `SELECT avg(c_acctbal) FROM read_parquet('s3://${BUCKET_NAME}/customer.parquet');`,
  //   `SELECT * FROM read_parquet('s3://${BUCKET_NAME}/orders.parquet') LIMIT 10;`,
  //   `SELECT n_name, count(*)
  //   FROM read_parquet('s3://${BUCKET_NAME}/customer.parquet') as customer,
  //       read_parquet('s3://${BUCKET_NAME}/nation.parquet') as nation
  //   WHERE c_nationkey = n_nationkey
  //   GROUP BY n_name
  //   ORDER BY count(*) DESC;`
  // ];
  // const results = await Promise.all(queries.map(executeQuery));
  // console.log(results);
  // return results;

  const URSA_LABS_TAXI_DATA_BUCKET_NAME = process.env.URSA_LABS_TAXI_DATA_BUCKET_NAME;
  const fromDate = new Date('2019/01');
  const toDate = new Date('2019/06');
  // SELECT vendor_id, count(*)
  // FROM read_parquet('s3://ursa-labs-taxi-data/2019/01/data.parquet')
  // GROUP BY 1;
  // SELECT passenger_count, avg(total_amount)
  // FROM read_parquet('s3://ursa-labs-taxi-data/2019/01/data.parquet')
  // GROUP BY 1;
  // SELECT passenger_count, extract(year from pickup_at), count(*)
  // FROM read_parquet('s3://ursa-labs-taxi-data/2019/01/data.parquet')
  // GROUP BY 1, 2;
  // SELECT passenger_count, extract(year from pickup_at), round(trip_distance), count(*)
  // FROM read_parquet('s3://ursa-labs-taxi-data/2019/01/data.parquet')
  // GROUP BY 1, 2, 3
  // ORDER BY 2, 4 desc;
  // use from and to to generate the file list

  const fileList = [];
  const filePrefix = `s3://${URSA_LABS_TAXI_DATA_BUCKET_NAME}/`;
  for (let year = fromDate.getFullYear(); year <= toDate.getFullYear(); year++) {
    const monthStart = (year === fromDate.getFullYear()) ? fromDate.getMonth() : 0;
    const monthEnd = (year === toDate.getFullYear()) ? toDate.getMonth() : 11;
    for (let month = monthStart; month <= monthEnd; month++) {
      const yearStr = year.toString();
      const monthStr = (month + 1).toString().padStart(2, '0');
      const filePath = `${filePrefix}${yearStr}/${monthStr}/data.parquet`;
      fileList.push(filePath);
    }
  }


  const fileListStr = fileList.map(path => `'${path}'`).join(',');
  const queries1 = [`EXPLAIN ANALYZE SELECT vendor_id, count(*) FROM read_parquet([${fileListStr}]) GROUP BY 1;`,
    `EXPLAIN ANALYZE SELECT passenger_count, avg(total_amount) FROM read_parquet([${fileListStr}]) GROUP BY 1;`,
    `EXPLAIN ANALYZE SELECT passenger_count, extract(year from pickup_at), count(*) FROM read_parquet([${fileListStr}]) GROUP BY 1, 2;`,
    `EXPLAIN ANALYZE SELECT passenger_count, extract(year from pickup_at), round(trip_distance), count(*) FROM read_parquet([${fileListStr}]) GROUP BY 1, 2, 3 ORDER BY 2, 4 desc;`,
  ];
  const versionSQL = [`SELECT version();`]

  const results = await Promise.all([sql].map(executeQuery));

  return 1;
}
