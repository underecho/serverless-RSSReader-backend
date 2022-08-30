import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as apigw from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpUrlIntegration, HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import * as authorizers from '@aws-cdk/aws-apigatewayv2-authorizers-alpha'

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

    // Dynamodb
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

    // Lambda
    // Check feed Lambda Function
    const updateArticleLambdaFunc = new PythonFunction(this, 'updateArticleFunc', {
      entry: './src/updateArticle/',
      timeout: cdk.Duration.seconds(180),
      runtime: Runtime.PYTHON_3_7,
      index: 'lambda_updateArticle.py',
      environment: {'RSSARTICLE_TABLENAME':rssArticleTableName}
    });
    rssArticleTable.grantReadWriteData(updateArticleLambdaFunc);

    const getFeedLambdaFunc = new PythonFunction(this, 'getFeedFunc', {
      entry: './src/getFeed/',
      timeout: cdk.Duration.seconds(180),
      runtime: Runtime.PYTHON_3_7,
      index: 'lambda_getFeed.py',
      environment: {'RSSSOURCE_TABLENAME': rssSourceTableName,
                    'UPDATEFUNC_NAME': updateArticleLambdaFunc.functionName
    }
    });
    
    rssSourceTable.grantReadData(getFeedLambdaFunc);

    const helloLambdaFunc = new PythonFunction(this, 'helloFunc', {
      entry: './src/API/',
      timeout: cdk.Duration.seconds(180),
      runtime: Runtime.PYTHON_3_7,
      index: 'lambda_hello.py',
      environment: {}
    });

    const apiGetArticleLambdaFunc = new PythonFunction(this, 'api_GetArticleFunc', {
      entry: './src/API/',
      timeout: cdk.Duration.seconds(180),
      runtime: Runtime.PYTHON_3_7,
      index: 'lambda_getArticle.py',
      environment: {"ARTICLE_TABLENAME": rssArticleTableName}
    });
    rssArticleTable.grantReadData(apiGetArticleLambdaFunc);

  
    // Attach invoke role
    updateArticleLambdaFunc.grantInvoke(getFeedLambdaFunc)
    
    // Run every 5 minutes
    // See https://docs.aws.amazon.com/lambda/latest/dg/tutorial-scheduled-events-schedule-expressions.html
    const rule = new events.Rule(this, 'cronFeedRule', {
      schedule: events.Schedule.expression('rate(5 minutes)')
    });

    // attach Lambda Function to event rule 
    rule.addTarget(new targets.LambdaFunction(getFeedLambdaFunc));

    // API Gateway
    const getArticleIntegration = new HttpLambdaIntegration('GetArticleIntegration', apiGetArticleLambdaFunc);
    const getArticleDefaultIntegration = new HttpLambdaIntegration('GetArticleIntegration', helloLambdaFunc);

    const httpApi = new apigw.HttpApi(this, 'HttpApi');

    httpApi.addRoutes({
      path: '/article',
      methods: [ apigw.HttpMethod.GET ],
      integration: getArticleIntegration,
    });
    httpApi.addRoutes({
      path: '/article',
      methods: [ apigw.HttpMethod.ANY ],
      integration: getArticleDefaultIntegration,
    });

  }
}
