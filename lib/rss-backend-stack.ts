import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

export class RssBackendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const rssSourceTable = new dynamodb.Table(this, 'Subscription', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });

    // Define RSS Article table
    const rssArticleTable = new dynamodb.Table(this, 'Article', {
      partitionKey: { name: 'articleUrl', type: dynamodb.AttributeType.STRING },
      sortKey:{ name: 'sourceUrl', type: dynamodb.AttributeType.STRING}
    });

    rssArticleTable.addLocalSecondaryIndex({
      indexName: "ByPubDate",
      sortKey: {
        name: "pubDate",
        type: dynamodb.AttributeType.NUMBER
      }
    });

    const rssSourceTableName = rssSourceTable.tableName;
    const rssArticleTableName = rssArticleTable.tableName;

    // Check feed Lambda Function
    const getFeedLambdaFunc = new PythonFunction(this, 'getFeedFunc', {
      entry: './src/getFeed/',
      timeout: cdk.Duration.seconds(180),
      runtime: Runtime.PYTHON_3_7,
      index: 'lambda_getFeed.py',
      environment: {'RSSSOURCE_TABLENAME': rssSourceTableName}
    });
    
    rssSourceTable.grantReadData(getFeedLambdaFunc)

    const updateArticleLambdaFunc = new PythonFunction(this, 'updateArticleFunc', {
      entry: './src/updateArticle/',
      timeout: cdk.Duration.seconds(180),
      runtime: Runtime.PYTHON_3_7,
      index: 'lambda_updateArticle.py',
      environment: {'RSSARTICLE_TABLENAME':rssArticleTableName}
    });
    rssArticleTable.grantReadWriteData(updateArticleLambdaFunc)

    // Attach invoke role
    updateArticleLambdaFunc.grantInvoke(getFeedLambdaFunc)
    
    //Run every 5 minutes
    // See https://docs.aws.amazon.com/lambda/latest/dg/tutorial-scheduled-events-schedule-expressions.html
    const rule = new events.Rule(this, 'cronFeedRule', {
      schedule: events.Schedule.expression('rate(5 minutes)')
    });

    // attach Lambda Function to event rule 
    rule.addTarget(new targets.LambdaFunction(getFeedLambdaFunc));

  }
}
