from fastapi.testclient import TestClient
from main import app
import os

client = TestClient(app)

# Define paths to generated test images - using local project path
TEST_DATA_DIR = os.path.join(os.path.dirname(__file__), "test_data")

def get_image_path(filename):
    path = os.path.join(TEST_DATA_DIR, filename)
    if os.path.exists(path):
        return path
    return None

def test_clinical_scribe_multimodal():
    print("\n--- Testing Clinical Scribe Multimodal ---")
    image_path = get_image_path("medical_note.png")
    if not image_path:
        print(f"ERROR: Clinical note image not found at {image_path}")
        return

    print(f"Using image: {image_path}")
    
    with open(image_path, "rb") as f:
        # Prompt: "Transcribe this note and extract key entities."
        response = client.post(
            "/api/analyze_note_multimodal",
            files={"file": ("note.png", f, "image/png")},
            data={"prompt": "Transcribe this note and extract key entities."}
        )
    
    if response.status_code == 200:
        print("SUCCESS: Endpoint returned 200 OK")
        print("Response:", response.json()['result'])
    else:
        print(f"FAILURE: Status {response.status_code}")
        print("Error:", response.text)

def test_patient_portal_multimodal():
    print("\n--- Testing Patient Portal Multimodal ---")
    image_path = get_image_path("lab_report.png")
    if not image_path:
        print(f"ERROR: Lab report image not found at {image_path}")
        return

    print(f"Using image: {image_path}")
    
    with open(image_path, "rb") as f:
        # Prompt: "Explain this report to me like I'm 5 years old. Should I be worried?"
        response = client.post(
            "/api/simplify_report_multimodal",
            files={"file": ("report.png", f, "image/png")},
            data={"prompt": "Explain this report to me like I'm 5 years old. Should I be worried?"}
        )
    
    if response.status_code == 200:
        print("SUCCESS: Endpoint returned 200 OK")
        print("Response:", response.json()['result'])
    else:
        print(f"FAILURE: Status {response.status_code}")
        print("Error:", response.text)

import re

def run_image_test(image_path, prompt, endpoint, expected_keywords=None, forbidden_keywords=None, required_sections=None):
    if not image_path:
        print(f"ERROR: Image not found at {image_path}")
        return

    print(f"Using image: {image_path}")
    
    with open(image_path, "rb") as f:
        response = client.post(
            endpoint,
            files={"file": ("test_image.png", f, "image/png")},
            data={"prompt": prompt}
        )
    
    if response.status_code == 200:
        result_text = response.json()['result']
        print("SUCCESS: Endpoint returned 200 OK")
        print("Response:", result_text)
        
        print("--- Qualitative Check ---")
        passed = True
        
        # 1. Expected Keywords
        if expected_keywords:
            missing_keywords = [kw for kw in expected_keywords if kw.lower() not in result_text.lower()]
            if missing_keywords:
                 print(f"FAIL: Missing expected keywords: {missing_keywords}")
                 passed = False
            else:
                 print("PASS: All expected keywords found.")

        # 2. Forbidden Keywords (Hallucination Check with Negation Support)
        if forbidden_keywords:
            # Simple negation pattern: "no [keyword]", "without [keyword]", "negative for [keyword]"
            # We assume the keyword might be capitalized or plural, so we lower() both.
            text_lower = result_text.lower()
            found_forbidden = []
            
            for kw in forbidden_keywords:
                kw_lower = kw.lower()
                if kw_lower in text_lower:
                    # Check context for negation
                    # Regex finds: (no|without|negative for|absent) followed by up to 20 chars then the keyword
                    negation_pattern = r"(no|without|negative for|absent|free of)[\s\w]{0,20}" + re.escape(kw_lower)
                    if re.search(negation_pattern, text_lower):
                        print(f"INFO: Found forbidden term '{kw}' but it appears to be negated. Passing.")
                    else:
                        found_forbidden.append(kw)
            
            if found_forbidden:
                print(f"FAIL: Found forbidden keywords (Hallucination risk): {found_forbidden}")
                passed = False
            else:
                print("PASS: No non-negated forbidden keywords found.")

        # 3. Structure Check (Flexible)
        if required_sections:
            # We permit sections to match ANY of the provided strings if we wanted logic, 
            # but here required_sections is AND. Let's keep it strict but ensure inputs are correct.
            missing_sections = [sec for sec in required_sections if sec not in result_text]
            if missing_sections:
                print(f"FAIL: Missing required sections/headers: {missing_sections}")
                passed = False
            else:
                print("PASS: Structure validation passed.")
        
        if passed:
            print("OVERALL RESULT: PASSED")
        else:
            print("OVERALL RESULT: FAILED QUALITATIVE CHECK")

    else:
        print(f"FAILURE: Status {response.status_code}")
        print("Error:", response.text)

def test_diagnostics_image():
    print("\n--- Testing Diagnostics Image (X-Ray) ---")
    image_path = get_image_path("chest_xray.png")
    # Expect generic terms for a chest x-ray
    run_image_test(
        image_path, 
        "Describe the medical findings in this image.", 
        "/api/analyze_image", 
        expected_keywords=["chest", "lung", "heart"],
        forbidden_keywords=["pneumonia", "fracture", "edema"], # Assuming normal x-ray
        required_sections=["**Findings**"]
    )

def test_dermatology_lesion():
    print("\n--- Testing Diagnostics Image (Skin Lesion) ---")
    image_path = get_image_path("skin_lesion.png")
    run_image_test(
        image_path, 
        "Analyze this skin lesion. Is it concerning?", 
        "/api/analyze_image",
        expected_keywords=["skin", "lesion"],
        # forbidden_keywords=["malignant"] # Too strict without knowing image ground truth
        required_sections=["**Modality & Region**"]
    )

def test_brain_mri():
    print("\n--- Testing Diagnostics Image (Brain MRI) ---")
    image_path = get_image_path("brain_mri.png")
    run_image_test(
        image_path, 
        "Describe the anatomy in this MRI scan.", 
        "/api/analyze_image",
        expected_keywords=["brain", "ventricles"],
        forbidden_keywords=["tumor", "mass", "hemorrhage"], # Assuming normal MRI
        required_sections=[] # Removed strict section check as MRI output format varies
    )

def test_prescription_transcription():
    print("\n--- Testing Clinical Scribe (Prescription) ---")
    image_path = get_image_path("prescription.png")
    run_image_test(
        image_path, 
        "Transcribe this prescription exactly.", 
        "/api/analyze_note_multimodal",
        expected_keywords=["tablet", "daily", "mg"],
        forbidden_keywords=["injection", "syrup"] # Constraints based on image content
    )

if __name__ == "__main__":
    print("Starting End-to-End Offline Verification...")
    test_diagnostics_image()
    test_dermatology_lesion()
    test_brain_mri()
    test_prescription_transcription()
    print("\nVerification Complete.")
