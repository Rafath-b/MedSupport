import os
from huggingface_hub import HfApi, create_repo

# Instructions:
# 1. Install huggingface_hub: pip install huggingface_hub
# 2. Login to Hugging Face: huggingface-cli login
# 3. Set your repository name below (e.g., "your-username/medgemma-medsupport-4bit")
# 4. Run this script: python upload_to_hf.py

REPO_ID = "Rafath1/medgemma-medsupport-4bit"
MODEL_PATH = "backend/models/medgemma-1.5-4b-it-4bit"

def upload():
    api = HfApi()
    
    print(f"Creating repository: {REPO_ID}")
    try:
        create_repo(REPO_ID, repo_type="model", exist_ok=True)
    except Exception as e:
        print(f"Error creating/finding repo: {e}")
        return

    print(f"Uploading files from {MODEL_PATH} to HF Hub...")
    api.upload_folder(
        folder_path=MODEL_PATH,
        repo_id=REPO_ID,
        repo_type="model",
    )
    print("Upload complete!")

if __name__ == "__main__":
    if "SET_YOUR_USERNAME_HERE" in REPO_ID:
        print("Please edit upload_to_hf.py and set your REPO_ID first.")
    else:
        upload()
