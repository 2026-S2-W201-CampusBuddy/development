import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_verification_email(to_email, code):
    gmail_address = os.getenv('GMAIL_ADDRESS')
    gmail_app_password = os.getenv('GMAIL_APP_PASSWORD')

    if not gmail_address or not gmail_app_password:
        print(f"[email not configured] Verification code for {to_email}: {code}")
        return

    message = MIMEMultipart()
    message['From'] = gmail_address
    message['To'] = to_email
    message['Subject'] = 'Verify your CampusBuddy account'

    body = f"""<p>Welcome to CampusBuddy</p><p>Your verification code is:</p><h2>{code}</h2><p>This code expires in 15 minutes.</p>"""
    message.attach(MIMEText(body, 'html'))

    with smtplib.SMTP('smtp.gmail.com', 587) as server:
        server.starttls()
        server.login(gmail_address, gmail_app_password)
        server.sendmail(gmail_address, to_email, message.as_string())