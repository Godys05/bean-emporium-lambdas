import smtplib
import json
import boto3
from email.message import EmailMessage

def handler(event={}, context=None):
    dynamo = boto3.client("dynamodb")
    usersTable = "BeanUsers"

    filter_key = 'cart'
    filter_expression = f"{filter_key} <> :empty_list"


    expression_attribute_values = {
        ":empty_list": {
            'L': []
        }
    }

    response = dynamo.scan(
        TableName=usersTable,
        FilterExpression=filter_expression,
        ExpressionAttributeValues=expression_attribute_values
    )
    items = response['Items']

    SECRET = json.loads(get_secret())
    EMAIL_ADDRESS = list(SECRET.keys())[0]
    EMAIL_PASSWORD = list(SECRET.values())[0]
   
    for item in items:
        email = list(item["email"].values())[0]
        sendEmail(email, EMAIL_ADDRESS, EMAIL_PASSWORD)
    return "Success"
       

def sendEmail(email, EMAIL_ADDRESS, EMAIL_PASSWORD):
    msg = EmailMessage()
    msg['Subject'] = "Oops, you didn't clicked purchase!"
    msg['From'] = EMAIL_ADDRESS
    msg['To'] = email
    msg.set_content("You still have items in your cart, don't hesitate to complete the order!")


    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
        smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        smtp.send_message(msg)

def get_secret():
    secretsmanager = boto3.client(service_name='secretsmanager')
    secret_name = "beanEmailCredentials"
    secrets_response = secretsmanager.get_secret_value(SecretId=secret_name)
    return secrets_response['SecretString']

handler()

# zip output.zip main.py
# aws lambda update-function-code --function-name beanEmail --zip-file fileb://output.zip
# aws lambda invoke --function-name beanEmail --region us-east-1 --cli-binary-format raw-in-base64-out out.txt
