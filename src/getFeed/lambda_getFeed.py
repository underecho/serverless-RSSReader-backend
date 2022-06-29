import boto3
from boto3.dynamodb.conditions import Attr, Key
import os
import json

rssSourceTableName = os.environ['RSSSOURCE_TABLENAME']

dynamodb = boto3.resource('dynamodb')
sourceTable = dynamodb.Table(rssSourceTableName)

def handler(event, context):
    options = {
        'KeyConditionExpression': Key('userId').eq("@@@")   
    }

    response = sourceTable.query(**options)
    urlData = response["Items"]

    while 'LastEvaluatedKey' in response:
        response = sourceTable.query(ExclusiveStartKey=response['LastEvaluatedKey'])
        urlData.extend(response["Items"])

    for row in urlData:
        inputData = {"url": row["sourceUrl"]}

        Payload = json.dumps(inputData)

        invoke_response = boto3.client('lambda').invoke(
            FunctionName='updateArticleFunc', # todo
            InvocationType='Event',
            Payload=Payload
        )

    return 0