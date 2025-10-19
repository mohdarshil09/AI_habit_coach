# AI Habit Coach 🌱

A modern web application that combines React frontend with FastAPI backend to provide AI-powered habit coaching using OpenAI's GPT models.

## 🎯 Features

- **AI-Powered Chat Interface**: Chat with an intelligent habit coach powered by OpenAI GPT
- **Goal Tracking**: Set and track daily/weekly goals with visual progress indicators
- **Motivational Quotes**: Get daily motivation from AI-generated quotes
- **Persistent Storage**: Messages and goals are saved locally using localStorage
- **Modern UI**: Beautiful, responsive design with Tailwind CSS
- **Real-time Progress**: Visual progress bars and completion tracking

## 🧩 Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + Vite |
| Backend | FastAPI (Python) |
| AI API | OpenAI GPT-3.5-turbo |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Storage | LocalStorage (demo) / SQLite (production ready) |

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- Python (v3.8 or higher)
- OpenAI API key

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd ai-habit-coach

# Setup backend
cd backend
pip install -r requirements.txt

# Setup frontend
cd ../frontend
npm install
```

### 2. Configure OpenAI API

```bash
# Copy the environment example
cp backend/env_example.txt backend/.env

# Edit the .env file and add your OpenAI API key
OPENAI_API_KEY=your_actual_openai_api_key_here
```

### 3. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
python main.py
```
The backend will run on `http://localhost:8000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
The frontend will run on `http://localhost:3000`

### 4. Open Your Browser

Navigate to `http://localhost:3000` to start using your AI Habit Coach!

## 🎮 How to Use

1. **Start a Conversation**: Type a message like "Help me build a morning routine"
2. **Set Goals**: Click the "+" button to add daily or weekly goals
3. **Track Progress**: Mark goals as completed to see your progress
4. **Get Motivation**: Receive AI-generated motivational quotes
5. **Quick Actions**: Use the quick action buttons for common requests

## 🏗️ Project Structure

```
ai-habit-coach/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── env_example.txt      # Environment variables template
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   ├── main.jsx         # React entry point
│   │   └── index.css        # Tailwind CSS styles
│   ├── package.json         # Node.js dependencies
│   ├── vite.config.js       # Vite configuration
│   ├── tailwind.config.js   # Tailwind configuration
│   └── index.html           # HTML template
└── README.md                # This file
```

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/coach` | POST | Chat with AI coach |
| `/goals` | GET | Get all goals |
| `/goals` | POST | Create new goal |
| `/goals/{id}` | PUT | Update goal completion |
| `/motivation` | GET | Get motivational quote |

## 🎨 Customization

### Adding New Features

1. **New Chat Commands**: Modify the system prompt in `backend/main.py`
2. **Goal Types**: Add new goal types in the frontend form
3. **UI Themes**: Customize colors in `frontend/tailwind.config.js`
4. **Storage**: Replace localStorage with a real database

### Environment Variables

```bash
# Backend (.env)
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=sqlite:///./habits.db  
```

ploy the dist/ folder
```

## 🧠 AI Coaching Features

The AI coach is designed to:
- Provide personalized habit-building advice
- Break down complex goals into actionable steps
- Offer encouragement and motivation
- Suggest habit stacking techniques
- Help with accountability and tracking

## 📱 Mobile Responsive

The app is fully responsive and works great on:
- Desktop computers
- Tablets
- Mobile phones

## 🔒 Security Notes

- Never commit your OpenAI API key to version control
- Use environment variables for sensitive data
- Consider rate limiting for production use
- Implement user authentication for multi-user scenarios

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🎯 Future Enhancements

- [ ] User authentication and profiles
- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Habit streak tracking
- [ ] Social features and sharing
- [ ] Mobile app (React Native)
- [ ] Advanced analytics and insights
- [ ] Integration with fitness trackers
- [ ] Reminder notifications

---

**Built with ❤️ using React, FastAPI, and OpenAI**
