# MedSupport: Local Medical AI Assistant

MedSupport is a privacy-first, local-first clinical intelligence platform powered by **MedGemma** (Google's Health AI Developer Foundations - HAI-DEF). It leverages Apple Silicon and the MLX framework to provide real-time medical analysis, document transcription, and visual diagnostics directly on your device.

## Core Features
- **🩺 Clinical Scribe**: Transcribe medical records and extract key clinical entities (Conditions, Medications).
- **📋 Patient Portal**: Transform complex lab reports and clinical notes into simple, empathetic language.
- **🔍 Visual Diagnostics**: Localize abnormalities in medical images (X-rays, MRI) with visual grounding.
- **📊 Advanced Evaluation**: Integrated LangSmith scoring suite to audit clinical correctness and tone.

---

## 🚀 Getting Started

### 1. Requirements
- **Hardware**: Apple Silicon (M1/M2/M3) for MLX optimization.
- **Software**: Python 3.10+, Node.js (for frontend).

### 2. Setting Up the Local Model (MedGemma)
**Note**: The model weights (~10GB) are hosted on Hugging Face to keep the repository lightweight.

1. **Automatic Loading**: The system is configured to fetch weights from [Rafath1/medgemma-medsupport-4bit](https://huggingface.co/Rafath1/medgemma-medsupport-4bit) on first run.
2. **Offline Mode**: Once downloaded, weights are cached in `~/.cache/huggingface/`. For strict offline use, the code will prioritize these local files.

### 3. Installation & Configuration

**Backend**:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env # Add your keys
```

**Frontend**:
```bash
cd frontend
npm install
cp .env.example .env # Set your VITE_API_URL
```

### 4. Running the Application
**Start Backend**:
```bash
cd backend
uvicorn main:app --port 8000 --reload
```

**Start Frontend**:
```bash
cd frontend
npm run dev
```

---

## 🧪 Evaluation Suite
This project includes a rigorous evaluation framework using **LangSmith**.
1. Add your `LANGCHAIN_API_KEY` and `GOOGLE_API_KEY` to `backend/.env`.
2. Run the evaluation pass:
```bash
python backend/evaluate_medsupport.py
```

## 🔐 Privacy & Security
MedSupport is designed for **Edge-AI**. No patient images or clinical notes are sent to the cloud. All inference happens locally via MLX, ensuring HIPPA-aligned privacy out of the box.

## 📄 License
MIT License. Created for the Kaggle HAI-DEF Impact Challenge.
