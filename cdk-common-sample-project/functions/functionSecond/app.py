from common.utils import greet

def lambda_handler(event, context):
    print(greet("function 2"))
    return {"statusCode": 200, "body": "Lambda executed successfully"}