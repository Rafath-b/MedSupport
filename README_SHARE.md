# Sharing MedSupport

This directory contains a standalone version of the MedSupport project, prepared for uploading to GitHub and Hugging Face.

## 1. Upload Model Weights to Hugging Face

To bypass GitHub's storage limits while keeping the project functional, we recommend hosting the model weights on Hugging Face.

1. **Install Dependencies**:
   ```bash
   pip install huggingface_hub
   ```
2. **Login**:
   ```bash
   huggingface-cli login
   ```
3. **Configure & Run Upload Script**:
   - Open `upload_to_hf.py` and set your `REPO_ID` (e.g., `your-username/medgemma-medsupport-4bit`).
   - Run the script:
     ```bash
     python upload_to_hf.py
     ```

## 2. Prepare the Codebase

### Update Backend
- Ensure `backend/model_manager.py` uses your new Hugging Face `REPO_ID`.

### Configure Frontend
- Copy `frontend/.env.example` to `frontend/.env`.
- Set `VITE_API_URL` to your backend URL (default is `http://localhost:8000`).

## 3. Upload Code to GitHub

Once the weights are on Hugging Face and the code is configured, you can push to GitHub.

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/MedSupport.git
   git push -u origin main
   ```

> [!NOTE] 
> The `.gitignore` is already configured to exclude the `backend/models/` directory, ensuring your GitHub repository remains lightweight.
