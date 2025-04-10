from common.utils import greet

def lambda_handler(event, context):
    print(greet("Function 1"))
    return {"statusCode": 200, "body": "Lambda executed successfully"}