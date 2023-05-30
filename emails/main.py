# Email imports
import smtplib
from email.message import EmailMessage

# Helpers
import json

# AWS
import boto3

# Main handler
def handler(event={}, context=None):
    # Declare clients
    dynamo = boto3.client("dynamodb")

    # Declare params to fetch users with a cart that is not empty
    usersTable = "BeanUsers"
    filter_key = 'cart'
    filter_expression = f"{filter_key} <> :empty_list"
    expression_attribute_values = {
        ":empty_list": {
            'L': []
        }
    }

    # Get users
    response = dynamo.scan(
        TableName=usersTable,
        FilterExpression=filter_expression,
        ExpressionAttributeValues=expression_attribute_values
    )
    items = response['Items']

    # Get secrets from aws secret manager to send mails
    SECRET = json.loads(get_secret())
    EMAIL_ADDRESS = list(SECRET.keys())[0]
    EMAIL_PASSWORD = list(SECRET.values())[0]
   
    # Send mail to each gotten user
    for item in items:
        email = list(item["email"].values())[0]
        sendEmail(email, EMAIL_ADDRESS, EMAIL_PASSWORD)

    # Return success
    return "Success"
       
# Function to send email
def sendEmail(email, EMAIL_ADDRESS, EMAIL_PASSWORD):
    # Declare params
    msg = EmailMessage()
    msg['Subject'] = "Oops, you didn't clicked purchase!"
    msg['From'] = EMAIL_ADDRESS
    msg['To'] = email
    msg.set_content("You still have items in your cart, don't hesitate to complete the order!")

    # Send email
    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
        smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        smtp.send_message(msg)

# Function to get aws secrets
def get_secret():
    secretsmanager = boto3.client(service_name='secretsmanager')
    secret_name = "beanEmailCredentials"
    secrets_response = secretsmanager.get_secret_value(SecretId=secret_name)
    return secrets_response['SecretString']

# Start handler
handler()

# zip output.zip main.py
# aws lambda update-function-code --function-name beanEmail --zip-file fileb://output.zip
# aws lambda invoke --function-name beanEmail --region us-east-1 --cli-binary-format raw-in-base64-out out.txt
