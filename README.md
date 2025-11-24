<div align="center">

# 🚀 CFanatic

### AI-Powered Codeforces Performance Analyzer

*Unlock your competitive programming potential with intelligent insights powered by Google Gemini*

[![Made with React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.121.3-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

[Features](#-features) • [Quick Start](#-quick-start) • [Demo Video](#-demo-video) • [Tech Stack](#-tech-stack) • [Contributing](#-contributing)

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🤖 **AI-Powered Analysis**
Leveraging Google Gemini and LangGraph to provide:
- Deep performance insights
- Personalized problem recommendations
- Contest strategy suggestions
- Weakness identification and improvement paths

</td>
<td width="50%">

### 📊 **Comprehensive Metrics**
Real-time analysis of your Codeforces profile:
- Rating trends and predictions
- Topic-wise problem distribution
- Contest performance analytics
- Submission history analysis

</td>
</tr>
<tr>
<td width="50%">

### 💬 **Persistent Chat History**
Never lose your insights:
- Multi-session conversation support
- Searchable chat history
- Context-aware responses
- Session management

</td>
<td width="50%">

### 🔒 **Security First**
Your data, your control:
- End-to-end API key encryption
- Secure authentication (JWT)
- No API key storage on servers
- Privacy-focused architecture

</td>
</tr>
</table>

---

## 🎯 Why CFanatic?

> **Traditional practice tracking tools** show you *what* you solved.  
> **CFanatic** tells you *why* it matters and *what* to do next.

- 💡 **Smart Recommendations**: Not just random problems - get personalized suggestions based on your strengths and weaknesses
- 🎓 **Learning Path**: AI-curated problem sets that match your skill level and learning goals
- 📈 **Performance Tracking**: Visualize your growth and identify patterns in your problem-solving journey
- 🤝 **Conversational Interface**: Ask questions naturally - "What topics should I focus on?" or "Why did my rating drop?"

---

## 🎬 Demo Video

<div align="center">
  
  <a href="https://youtu.be/dk2saWEYXbM">
    <img src="https://img.youtube.com/vi/dk2saWEYXbM/maxresdefault.jpg" alt="CFanatic Demo Video" width="700">
  </a>
  
  <p><i>👆 Click to watch CFanatic in action - AI-powered Codeforces analysis</i></p>

</div>
---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have:

- **Python 3.11+** ([Download](https://www.python.org/downloads/))
- **Node.js 20+** ([Download](https://nodejs.org/))
- **Gemini API Key** ([Get one free](https://makersuite.google.com/app/apikey))
- **Git** ([Download](https://git-scm.com/))

### Installation

#### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/cfanatic.git
cd cfanatic
```

#### 2️⃣ Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Generate encryption keys
python ../generate_keys.py

# Create .env file
# Copy the generated keys to .env (see env.template)
```

Create a `.env` file in the `backend` directory:

```env
SECRET_KEY=<generated-from-script>
ENCRYPTION_KEY=<generated-from-script>
PORT=8000
```

#### 3️⃣ Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

#### 4️⃣ Start the Backend

```bash
# In a new terminal, from the backend directory
cd backend
uvicorn main:app --reload
```

#### 5️⃣ Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
---

## 🛠️ Tech Stack

### Frontend
- **⚛️ React 19.2** - Modern UI library
- **📘 TypeScript** - Type-safe JavaScript
- **🎨 TailwindCSS** - Utility-first CSS framework
- **✨ Framer Motion** - Smooth animations
- **🔥 Vite** - Lightning-fast build tool
- **🧭 React Router** - Client-side routing

### Backend
- **⚡ FastAPI** - High-performance Python web framework
- **🗄️ SQLAlchemy** - SQL toolkit and ORM
- **🔐 JWT Authentication** - Secure user sessions
- **🔒 Cryptography** - API key encryption
- **🤖 LangChain** - LLM application framework
- **🧠 LangGraph** - Agentic workflow orchestration

### AI & Data
- **🌟 Google Gemini** - Advanced language model
- **📊 Codeforces API** - Contest and user data
- **🔍 Sentence Transformers** - Semantic search
- **📚 FAISS** - Vector similarity search (RAG)

### DevOps
- **🐳 Docker** - Containerization
- **🤗 Hugging Face Spaces** - Deployment platform
- **🔄 Git** - Version control

---

## 📁 Project Structure

```
cfanatic/
├── backend/                # FastAPI backend
│   ├── main.py            # Application entry point
│   ├── auth.py            # Authentication logic
│   ├── models.py          # Database models
│   ├── mcp_server.py      # LangGraph agent
│   ├── cf_api.py          # Codeforces API integration
│   ├── rag.py             # RAG system for embeddings
│   ├── database.py        # Database configuration
│   └── requirements.txt   # Python dependencies
│
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── config.ts      # API configuration
│   │   └── App.tsx        # Main app component
│   ├── package.json       # Node dependencies
│   └── vite.config.ts     # Vite configuration
│
├── Dockerfile             # Docker build configuration
├── .dockerignore          # Docker ignore patterns
├── README.md              # This file
├── DEPLOYMENT.md          # Deployment guide
├── generate_keys.py       # Security key generator
└── env.template           # Environment template
```

---

## 🎮 Usage Guide

### 1. **Create an Account**
Register with your username, email, and password.

### 2. **Configure API Keys**
- Get a free Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Enter your Codeforces handle
- API keys are encrypted and stored securely

### 3. **Start Analyzing**
Ask questions like:
- *"Analyze my recent contest performance"*
- *"What topics should I focus on to reach Expert?"*
- *"Give me 5 problems to improve my DP skills"*
- *"Why did my rating drop in the last contest?"*

### 4. **Track Progress**
- View your chat history
- Continue previous conversations
- Export insights for future reference

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **🍴 Fork the repository**
2. **🌿 Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **💾 Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **📤 Push to the branch** (`git push origin feature/amazing-feature`)
5. **🎉 Open a Pull Request**

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Codeforces** for providing the amazing competitive programming platform
- **Google** for the powerful Gemini AI model
- **LangChain** team for the excellent LLM framework
- The **open-source community** for all the amazing tools


---

<div align="center">

### ⭐ Star this repo if you find it useful!

**Made with ❤️ for the competitive programming community**

</div>
