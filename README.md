# CampusBuddy
CampusBuddy is a web application for international students or domestic students attending AUT who are not familiar with the Auckland region. It assists these people by providing a community feature, interactive campus maps, rental information, peer review, and much more. 

## Live server
Our final Campus Buddy product is available to access anywhere and at any time (while the server is live). We did this by creating an AWS server. Our live website is available here: http://......

Sign up only accepts email addresses ending in @autuni.ac.nz. A verification code will be sent to your email, or it is shown in the terminal.

## Technologies and dependencies
| front/back | Technology | Version |
|---|---|---|
| Backend | Python | 3.12.13 |
| Backend | Flask | 3.1.3 |
| Backend | Flask-SQLAlchemy | 3.1.1 |
| Frontend | Node.js | 24.18.1 |
| Frontend | React | 19 |
| Frontend | Vite | 8.2.0 |

All backend packages and their exact versions are listed in backend/requirements.txt. Frontend packages are listed in frontend/package.json.
Check .env.example to see further API installations that are required. Youll need to get your own API keys and add them to your own .env, or just simply run the website on our server as mentioned above. 

## Installation of important packages
**Prerequisites**
- Git
- Miniconda
- Node.js 24.18.1

1. **Clone the repository**
git clone https://github.com/2026-S2-W201-CampusBuddy/development.git
cd development

2. **Set up backend**
cd backend
conda create -n campusbuddy-backend python=3.12.13
conda activate campusbuddy-backend
pip install -r requirements.txt

3. **Set up frontend**
cd ../frontend
nvm install 24.18.1
nvm use 24.18.1
npm install

4. **Create your own .env using examples**
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

**backend env requirments**
- GMAIL_ADDRESS
- GMAIL_APP_PASSWORD
- GOOGLE_MAPS_API_KEY

**frontend env requirments**
- VITE_API_URL
- VITE_GOOGLE_MAPS_API_KEY

## Building and Running the program 
Run the backend and the frontend at the same time, each in its own terminal.

**Backend terminal**
cd backend
conda activate campusbuddy-backend
python app.py

**Frontend terminal**
cd frontend
nvm use 24.18.1
npm run dev

## Deployment
The live version runs on an AWS EC2 server (Ubuntu). Nginx serves the built frontend and forwards /api requests to the Flask backend, which runs under Gunicorn as a systemd service named campusbuddy. The server builds the frontend with Node.js. It always runs the Release branch.

**Deploying a change**
1. Push your work to main.
2. Merge main into Release on GitHub.
3. SSH into the server and run the update command below. It pulls Release, installs the backend and frontend dependencies, rebuilds the frontend, and restarts the backend and Nginx.
4. Check the output for errors, then hard refresh the site to confirm the change is live.

cd ~/CampusBuddy && git pull origin Release && cd backend && source venv/bin/activate && pip install -r requirements.txt && cd ../frontend && npm ci && npm run build && sudo systemctl restart campusbuddy && sudo systemctl restart nginx 

## Example Usage
1. Open the website and click Create Account.
2. Sign up with an email ending with @autuni.ac.nz email address, username and password.
3. Enter the verification code. It arrives by email, or from the backend terminal.
4. Sign in with your email and password.
5. Use the home screen to open Community, Events, Campus Map, Groceries, Currency Exchange and the other features.

## Authors
- **Scrum Master:** Hyojun Bang - Created features including main page, groceries, community, friends, AWS server, and more.
- **Product Owner:** George Robinson - Created features including events, map, settings, currency exchange, login/signup, and more.
- **Developer 1:** Sedric Dzikiti - Created features including weather, world clock, rentals, peer review, and more.
- **Developer 2:** Nihash Sivkumar - Created internship opportunity feature and study rooms feature.

## License
This project is licensed under the MIT License — see the LICENSE file for details.
