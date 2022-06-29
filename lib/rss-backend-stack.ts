import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

export class RssBackendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Define RSS Article table
    const rssArticleTable = new dynamodb.Table(this, 'Channel', {
      partitionKey: { name: 'ArticleUrl', type: dynamodb.AttributeType.STRING },
      sortKey:{ name: 'SourceUrl', type: dynamodb.AttributeType.STRING}
    });

    rssArticleTable.addLocalSecondaryIndex({
      indexName: "ByPubDate",
      sortKey: {
        name: "pubDate",
        type: dynamodb.AttributeType.NUMBER
      }
    });

    const tableName = rssArticleTable.tableName;

    const slashLambdaFunc = new PythonFunction(this, 'slashFunc', {
      entry: './src/getFeed/',
      timeout: cdk.Duration.seconds(180),
      runtime: Runtime.PYTHON_3_8,
      index: 'lambda_getFeed.py',
      environment: {'TABLE_NAME':tableName}

    });
  }
}
