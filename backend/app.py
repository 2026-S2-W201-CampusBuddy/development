from flask import Flask

app = Flask(__name__)

@app.route('/')
def home():
    return 'Hello, Campus Buddy!'

@app.route('/api/hello')
def hello_json():
    return {"message": "Hello, Campus Buddy!"}

if __name__ == '__main__':
    app.run(debug=True)