import * as cdk from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { aws_lambda } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import * as path from "path";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class DuckdbSampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'DuckdbSampleQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    // prepared s3 resource for lambda
    const bucket = new Bucket(this, 'DuckdbSampleBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new BucketDeployment(this, 'DuckdbSampleBucketDeployment', {
      sources: [Source.asset(path.join(__dirname, '../data'))],
      destinationBucket: bucket,
    });

    const URSA_LABS_TAXI_DATA_BUCKET_NAME = 'ursa-labs-taxi-data';
    const duckdbLambda = new NodejsFunction(this, 'DuckdbSampleLambda', {
      functionName: 'DuckdbSampleLambda',
      entry: 'src/duckdb-sample.ts',
      handler: 'handler',
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.X86_64,
      memorySize: 128,
      timeout: cdk.Duration.minutes(15),
      bundling: {
        // nodeModules: ['duckdb'],
        minify: false,
        sourceMap: false,
        target: 'es2018',
        externalModules: ['duckdb'],
        // externalModules: ['duckdb', 'aws-sdk'],
        // externalModules: ['duckdb', 'aws-sdk', 'aws-sdk/clients/s3'],
        // externalModules: ['duckdb', 'aws-sdk', 'aws-sdk/clients/s3', 'aws-sdk/clients/sqs'],
      },
      environment: {
        BUCKET_NAME: bucket.bucketName,
        URSA_LABS_TAXI_DATA_BUCKET_NAME
      }
    });
    // if region is ap-northeast-1, you can use this layer
    if (this.region === 'ap-northeast-1') {
      duckdbLambda.addLayers(aws_lambda.LayerVersion.fromLayerVersionArn(this, 'DuckdbLayer', 'arn:aws:lambda:ap-northeast-1:041475135427:layer:duckdb-nodejs-x86:1'));
    } else if (this.region === 'us-east-2') {
      duckdbLambda.addLayers(aws_lambda.LayerVersion.fromLayerVersionArn(this, 'DuckdbLayer', 'arn:aws:lambda:us-east-2:041475135427:layer:duckdb-nodejs-x86:1'));
    }
    bucket.grantRead(duckdbLambda);
    // can read s3;
    duckdbLambda.addToRolePolicy(new PolicyStatement({
      actions: ['s3:*'],
      resources: [`arn:aws:s3:::${URSA_LABS_TAXI_DATA_BUCKET_NAME}/*`],
    }));

  }
}
