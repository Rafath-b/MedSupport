import os
import sys
import re
import json
from langsmith import Client, evaluate
from langchain_core.messages import HumanMessage

# Add project root to sys.path to resolve 'backend' module
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.chain_manager import ChainManager
from typing import Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate

# Ensure environment variables are loaded
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_path)

# Initialize Client and ChainManager
client = Client()
chain_manager = ChainManager()

# Initialize Evaluator LLM
google_api_key = os.getenv("GOOGLE_API_KEY")
evaluator_llm = None
if google_api_key:
    evaluator_llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0)

# --- Heuristic Evaluators ---

def bounding_box_present_evaluator(run: Any, example: Any) -> Dict[str, Any]:
    """Checks if a bounding box is present in the response if expected."""
    response = run.outputs.get("result", "")
    expected_box = example.outputs.get("has_box", False)
    
    box_pattern = r"\[(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)\]"
    has_box = bool(re.search(box_pattern, response))
    
    score = 1 if has_box == expected_box else 0
    return {"key": "bounding_box_valid", "score": score}

def medical_entity_evaluator(run: Any, example: Any) -> Dict[str, Any]:
    """Checks if key medical entities are present in the response."""
    response = run.outputs.get("result", "").lower()
    expected_entities = example.outputs.get("entities", [])
    
    if not expected_entities:
        return {"key": "medical_entity_recall", "score": 1.0}
        
    found_count = sum(1 for entity in expected_entities if entity.lower() in response)
    score = found_count / len(expected_entities)
    
    return {"key": "medical_entity_recall", "score": score}

def format_compliance_evaluator(run: Any, example: Any) -> Dict[str, Any]:
    """Checks for bolding and bullet points which are required in Patient Portal."""
    response = run.outputs.get("result", "")
    
    has_bold = "**" in response
    has_bullets = "-" in response or "*" in response or re.search(r"^\d+\.", response, re.MULTILINE)
    
    score = 1.0 if (has_bold and has_bullets) else 0.5 if (has_bold or has_bullets) else 0.0
    return {"key": "format_compliance", "score": score}

def simplicity_score_evaluator(run: Any, example: Any) -> Dict[str, Any]:
    """Heuristic for patient accessibility - Penalizes long responses for simple queries."""
    response = run.outputs.get("result", "")
    word_count = len(response.split())
    
    # Ideally, report simplifications are between 50 and 200 words.
    if word_count < 20: score = 0.5 # Too brief
    elif word_count < 250: score = 1.0 # Good
    else: score = 0.7 # Too long
    
    return {"key": "simplicity_conciseness", "score": score}

def reasoning_leak_evaluator(run: Any, example: Any) -> Dict[str, Any]:
    """Check if model's internal thought process leaked into the final answer."""
    response = run.outputs.get("result", "").lower()
    leak_keywords = ["thought", "i will", "reasoning", "user wants"]
    
    leaked = any(kw in response for kw in leak_keywords)
    score = 0.0 if leaked else 1.0
    return {"key": "no_reasoning_leak", "score": score}

# --- LLM-as-a-Judge Evaluators ---

def tone_empathy_evaluator(run: Any, example: Any) -> Dict[str, Any]:
    """Evaluates the tone and empathy of the response for a patient."""
    if not evaluator_llm:
        return {"key": "tone_and_empathy", "score": 0.0, "comment": "Skipped: Missing API Key"}
        
    input_text = example.inputs.get("text", example.inputs.get("prompt", ""))
    response = run.outputs.get("result", "")
    
    prompt = PromptTemplate.from_template("""
    Role: Senior Medical Communicator
    Input: {input}
    Response: {response}
    
    Evaluate the response's tone and empathy. 
    1. Is it professional? 
    2. Is it empathetic to a patient?
    3. Is it clear and free of jargon?
    
    Respond with a single score between 1 and 5 (5 being perfect). 
    Output ONLY THE NUMBER.
    """)
    
    try:
        feedback = evaluator_llm.invoke(prompt.format(input=input_text, response=response))
        match = re.search(r"\d", feedback.content)
        score = float(match.group()) / 5.0 if match else 0.5
    except:
        score = 0.5
        
    return {"key": "tone_and_empathy", "score": score}

def medical_correctness_evaluator(run: Any, example: Any) -> Dict[str, Any]:
    """Evaluates the medical correctness based on the expected entities and common knowledge."""
    if not evaluator_llm:
        return {"key": "medical_correctness", "score": 0.0, "comment": "Skipped: Missing API Key"}

    input_text = example.inputs.get("text", example.inputs.get("prompt", ""))
    response = run.outputs.get("result", "")
    reference = str(example.outputs.get("entities", "No specific reference provided."))
    
    prompt = PromptTemplate.from_template("""
    Role: Board-Certified Physician
    Input: {input}
    Model Response: {response}
    Expected Entities/Keywords: {reference}
    
    Evaluate if the model's response is medically accurate and covers the key information required.
    Ignore minor stylistic differences. Focus on clinical safety and accuracy.
    
    Respond with a single score between 1 and 5 (5 being perfect).
    Output ONLY THE NUMBER.
    """)
    
    try:
        feedback = evaluator_llm.invoke(prompt.format(input=input_text, response=response, reference=reference))
        match = re.search(r"\d", feedback.content)
        score = float(match.group()) / 5.0 if match else 0.5
    except:
        score = 0.5
        
    return {"key": "medical_correctness", "score": score}

# --- Datasets ---

# 1. Text Analysis Examples
TEXT_EXAMPLES = [
    {
        "inputs": {"text": "Patient presents with high fever and cough. Prescribed Amoxicillin."},
        "outputs": {"entities": ["Amoxicillin", "fever", "cough"]}
    },
    {
        "inputs": {"text": "What are the common side effects of Lisinopril?"},
        "outputs": {"entities": ["dizziness", "cough", "headache"]}
    },
    {
        "inputs": {"text": "Summarize the following clinical note: Diabetic patient with history of hypertension. Controlled on Metformin and Lisinopril. A1C is 6.5%."},
        "outputs": {"entities": ["Metformin", "Lisinopril", "Diabetic", "hypertension"]}
    }
]

# 2. Image Analysis Examples (Diagnostics)
IMAGE_EXAMPLES = [
    {
        "inputs": {
            "prompt": "Describe the medical findings in this image.",
            "image_path": "backend/test_data/chest_xray.png"
        },
        "outputs": {"has_box": True, "entities": ["chest", "lungs"]}
    },
    {
        "inputs": {
            "prompt": "Analyze this MRI scan for any anatomy and abnormalities.",
            "image_path": "backend/test_data/brain_mri.png"
        },
        "outputs": {"has_box": False, "entities": ["brain", "ventricles"]}
    },
    {
        "inputs": {
            "prompt": "Is this skin lesion concerning?",
            "image_path": "backend/test_data/skin_lesion.png"
        },
        "outputs": {"has_box": False, "entities": ["skin", "lesion"]}
    },
    {
        "inputs": {
            "prompt": "Analyze this chest X-ray for pneumonia.",
            "image_path": "backend/test_data/Diagnostics/diag_1_chest_xray_pneumonia_1768755712312.png"
        },
        "outputs": {"has_box": True, "entities": ["chest", "pneumonia", "opacity"]}
    },
    {
        "inputs": {
            "prompt": "Check this hand X-ray for fractures.",
            "image_path": "backend/test_data/Diagnostics/diag_4_hand_xray_fracture_1768755769113.png"
        },
        "outputs": {"has_box": True, "entities": ["hand", "fracture", "bone"]}
    },
    {
        "inputs": {
            "prompt": "Describe the structures in this fundus retina image.",
            "image_path": "backend/test_data/Diagnostics/diag_5_fundus_retina_1768755784611.png"
        },
        "outputs": {"has_box": False, "entities": ["retina", "optic disc", "vessels"]}
    }
]

# 3. Multimodal Note Analysis (Clinical Scribe)
SCRIBE_EXAMPLES = [
    {
        "inputs": {
            "prompt": "Transcribe this prescription exactly.",
            "image_path": "backend/test_data/prescription.png"
        },
        "outputs": {"entities": ["tablet", "daily", "mg"]}
    },
    {
        "inputs": {
            "prompt": "Extract key entities from this clinical note.",
            "image_path": "backend/test_data/medical_note.png"
        },
        "outputs": {"entities": ["Patient", "History", "Assessment"]}
    }
]

# 4. Multimodal Report Simplification (Patient Portal)
SIMPLIFY_EXAMPLES = [
    {
        "inputs": {
            "prompt": "Explain this report to me in simple terms.",
            "image_path": "backend/test_data/lab_report.png"
        },
        "outputs": {"entities": ["Hemoglobin", "WBC", "range"]}
    }
]

# --- Target Functions ---

def target_text_analysis(inputs: Dict[str, Any]) -> Dict[str, Any]:
    result = chain_manager.analyze_text(inputs["text"])
    return {"result": result}

def target_image_analysis(inputs: Dict[str, Any]) -> Dict[str, Any]:
    with open(inputs["image_path"], "rb") as f:
        image_bytes = f.read()
    result = chain_manager.analyze_image(image_bytes, inputs["prompt"])
    return {"result": result}

def target_scribe_multimodal(inputs: Dict[str, Any]) -> Dict[str, Any]:
    with open(inputs["image_path"], "rb") as f:
        image_bytes = f.read()
    result = chain_manager.analyze_note_multimodal(image_bytes, inputs["prompt"])
    return {"result": result}

def target_simplify_multimodal(inputs: Dict[str, Any]) -> Dict[str, Any]:
    with open(inputs["image_path"], "rb") as f:
        image_bytes = f.read()
    result = chain_manager.simplify_report_multimodal(image_bytes, inputs["prompt"])
    return {"result": result}

# --- Main Evaluation Logic ---

def create_or_get_dataset(dataset_name: str, examples: list):
    """Creates a dataset in LangSmith if it doesn't already exist."""
    if client.has_dataset(dataset_name=dataset_name):
        print(f"✅ Dataset '{dataset_name}' already exists.")
        return dataset_name
    
    dataset = client.create_dataset(
        dataset_name=dataset_name, 
        description=f"Evaluation dataset for {dataset_name}"
    )
    
    client.create_examples(
        inputs=[ex["inputs"] for ex in examples],
        outputs=[ex["outputs"] for ex in examples],
        dataset_id=dataset.id
    )
    print(f"✨ Created dataset '{dataset_name}' with {len(examples)} examples.")
    return dataset_name

def run_evaluations():
    print("🚀 Starting MedSupport LangSmith Evaluations...")

    # 1. Evaluate Text Analysis
    print("\n--- Evaluating Text Analysis ---")
    text_ds_name = create_or_get_dataset("MedSupport-Text-Tests", TEXT_EXAMPLES)
    res_text = evaluate(
        target_text_analysis,
        data=text_ds_name,
        evaluators=[
            medical_entity_evaluator, 
            tone_empathy_evaluator, 
            medical_correctness_evaluator,
            simplicity_score_evaluator,
            reasoning_leak_evaluator
        ],
        experiment_prefix="text-analysis",
        metadata={"version": "1.4", "task": "text-summary"}
    )
    print(f"✅ Text Results: {res_text.experiment_name}")

    # 2. Evaluate Image Analysis (Diagnostics)
    print("\n--- Evaluating Image Analysis ---")
    valid_image_examples = [ex for ex in IMAGE_EXAMPLES if os.path.exists(ex["inputs"]["image_path"])]
    if valid_image_examples:
        img_ds_name = create_or_get_dataset("MedSupport-Image-Tests", valid_image_examples)
        res_img = evaluate(
            target_image_analysis,
            data=img_ds_name,
            evaluators=[
                bounding_box_present_evaluator, 
                medical_entity_evaluator,
                medical_correctness_evaluator,
                reasoning_leak_evaluator
            ],
            experiment_prefix="image-analysis",
            metadata={"version": "1.4", "task": "vision"}
        )
        print(f"✅ Image Results: {res_img.experiment_name}")

    # 3. Evaluate Multimodal Scribe
    print("\n--- Evaluating Multimodal Scribe ---")
    valid_scribe_examples = [ex for ex in SCRIBE_EXAMPLES if os.path.exists(ex["inputs"]["image_path"])]
    if valid_scribe_examples:
        scribe_ds_name = create_or_get_dataset("MedSupport-Scribe-Tests", valid_scribe_examples)
        res_scribe = evaluate(
            target_scribe_multimodal,
            data=scribe_ds_name,
            evaluators=[
                medical_entity_evaluator,
                tone_empathy_evaluator,
                medical_correctness_evaluator,
                simplicity_score_evaluator,
                reasoning_leak_evaluator
            ],
            experiment_prefix="scribe-analysis",
            metadata={"version": "1.2", "task": "scribe"}
        )
        print(f"✅ Scribe Results: {res_scribe.experiment_name}")

    # 4. Evaluate Multimodal Simplification
    print("\n--- Evaluating Multimodal Simplification ---")
    valid_simplify_examples = [ex for ex in SIMPLIFY_EXAMPLES if os.path.exists(ex["inputs"]["image_path"])]
    if valid_simplify_examples:
        simplify_ds_name = create_or_get_dataset("MedSupport-Simplify-Tests", valid_simplify_examples)
        res_simplify = evaluate(
            target_simplify_multimodal,
            data=simplify_ds_name,
            evaluators=[
                medical_entity_evaluator,
                format_compliance_evaluator,
                tone_empathy_evaluator,
                medical_correctness_evaluator,
                simplicity_score_evaluator,
                reasoning_leak_evaluator
            ],
            experiment_prefix="simplify-analysis",
            metadata={"version": "1.2", "task": "simplify"}
        )
        print(f"✅ Simplify Results: {res_simplify.experiment_name}")

def evaluate_project_traces(project_name: str = "MedSupport", limit: int = 10):
    """
    Utility to run our evaluators on EXISTING production traces.
    Note: Programmatic 'Registration' of Online Rules is currently UI-only,
    but this SDK method allows you to audit quality of live data.
    """
    print(f"\n--- Auditing Latest {limit} Traces in '{project_name}' ---")
    runs = list(client.list_runs(
        project_name=project_name,
        execution_order=1,
        limit=limit
    ))
    
    if not runs:
        print("No traces found to evaluate.")
        return

    for run in runs:
        # Scoring logic applied to live trace inputs
        tone = tone_empathy_evaluator(run, type('obj', (object,), {'inputs': run.inputs, 'outputs': {}})())
        correctness = medical_correctness_evaluator(run, type('obj', (object,), {'inputs': run.inputs, 'outputs': {'entities': []}})())
        print(f"Run {run.id[:8]}: Tone={tone['score']}, Correctness={correctness['score']}")

if __name__ == "__main__":
    run_evaluations()
    # To audit live traces, uncomment the line below:
    # evaluate_project_traces("MedSupport", limit=5)
    print("\n✨ Evaluation complete. Results are available in LangSmith Datasets & Experiments.")
    print("💡 To see evaluators in the 'Tracing -> Evaluators' tab, follow the UI guide in walkthrough.md")
