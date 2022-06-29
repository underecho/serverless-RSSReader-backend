from datetime import datetime, timedelta, timezone
import boto3
import os
from time import mktime
import feedparser

table_name = os.environ['RSSARTICLE_TABLENAME']

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(table_name)

def handler(event, context):
    feed = feedparser.parse(event["url"])
    for entry in feed.entries:
        item = {
            "articleUrl": str(entry.link),
            "sourceUrl": str(event["url"]),
            "title": str(entry.title),
            "description": str(entry.description),
            "pubDate": int(mktime(entry.published_parsed))
        }
        table.put_item(Item=item)

    return 0