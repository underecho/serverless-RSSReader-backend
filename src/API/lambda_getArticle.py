import boto3
import os
from boto3.dynamodb.conditions import Attr, Key

articleTableName = os.environ['ARTICLE_TABLENAME']

dynamodb = boto3.resource('dynamodb')
articleTable = dynamodb.Table(articleTableName)

def handler(event, ctx):
    if event["rawQueryString"] == '':
        result = articleTable.scan()
        return result
    
    parameters: dict = event["queryStringParameters"]

    if "userId" in parameters.keys():
        options = {
            # 'KeyConditionExpression': Key('userId').eq(parameters["userId"]),
            'ScanIndexForward': True
        }
    else:
        return {"message": "missing query keys"}

    if "pageKey" in parameters.keys():
        options["ExclusiveStartKey"] = parameters["pageKey"]

    response = articleTable.query(**options)
    articleData = response["Items"]

    # while 'LastEvaluatedKey' in response:
    #     response = sourceTable.query(ExclusiveStartKey=response['LastEvaluatedKey'])
    #     urlData.extend(response["Items"])

    return articleData