import os
from dotenv import load_dotenv
from model_adapter import MLXVLMAdapter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage
from PIL import Image
import io

load_dotenv()

class ChainManager:
    def __init__(self, model_path="models/medgemma-1.5-4b-it-4bit"):
        # Detect if we are running from root or backend
        if not os.path.exists(model_path) and os.path.exists(os.path.join("backend", model_path)):
            model_path = os.path.join("backend", model_path)
        
        self.model = MLXVLMAdapter(model_path=model_path)

    def analyze_text(self, text: str):
        prompt = ChatPromptTemplate.from_template("""
        You are a helpful medical assistant.
        
        Instructions:
        - If the input is a clinical note, summarize it and extract key entities (Conditions, Medications).
        - If the input is a specific question (e.g., "What is TSH?"), answer it directly and accurately in plain English.
        - IMPORTANT: Output ONLY the final answer or summary. Do NOT output your thought process or internal reasoning.

        Input Text:
        {text}
        """)
        chain = prompt | self.model | StrOutputParser()
        return chain.invoke({"text": text})

    def simplify_report(self, text: str):
        prompt = ChatPromptTemplate.from_template(
            "Please rewrite the following medical report in plain English so a patient can understand it. Explain any technical terms:\n\n{text}"
        )
        chain = prompt | self.model | StrOutputParser()
        return chain.invoke({"text": text})

    def analyze_image(self, image_bytes: bytes, user_prompt: str = "Describe the medical findings in this image."):
        if not user_prompt or not user_prompt.strip():
            full_prompt = "Describe the medical findings in this image. List key structures and any abnormalities seen. If you see an abnormality, provide its bounding box as [ymin, xmin, ymax, xmax] (0-100)."
        else:
            full_prompt = f"""
            You are an expert Radiologist. 
            User Request: "{user_prompt}"
            
            Analyze this medical image in detail:
            1. **Modality & Region**: Identify the body part.
            2. **Findings**: Report ANY suspicion of fracture or abnormality.
            
            IMPORTANT: If you find an abnormality, provide its bounding box coordinates in the format [ymin, xmin, ymax, xmax] where values are 0-100.
            Example output format:
            "There is a fracture in the distal radius. [10, 20, 30, 40]"
            
            Answer the user's specific question: "{user_prompt}"
            """

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # We invoke the model with the prompt and pass the image object via kwargs
        # since our MLXVLMAdapter handles the image from kwargs
        response = self.model.invoke(full_prompt, image=image)
        return response.content

    def analyze_note_multimodal(self, image_bytes: bytes, user_prompt: str = ""):
        if user_prompt and user_prompt.strip():
             full_prompt = user_prompt
        else:
             full_prompt = "Transcribe the clinical note in this image and extract key entities (Conditions, Medications, Vitals)."
        
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        response = self.model.invoke(full_prompt, image=image)
        return response.content

    def simplify_report_multimodal(self, image_bytes: bytes, user_prompt: str = ""):
        if user_prompt and user_prompt.strip():
             full_prompt = f"""
             You are a helpful medical assistant for a patient.
             User Question: "{user_prompt}"
             
             Please analyze the uploaded lab report image directly:
             1. List each test name, its result, and the reference range visible in the image.
             2. Check if the result is inside that reference range.
             3. If a value is outside the range, clearly mark it as "Abnormal" (High or Low).
             4. Specific check: 
                - Is Hemoglobin (HGB) below the range?
                - Is WBC high?
             
             Answer the user's question by summarizing these findings in simple language.
             
             FORMATTING INSTRUCTIONS:
             - Use **BOLD** for test names and status (e.g. **Hemoglobin: High**).
             - Use bullet points (-) for the list of results.
             - Put each finding on a NEW line.
             - Keep the explanation clear and spaced out.
             """
        else:
             full_prompt = "You are a helpful medical assistant. Read this medical report and explain it in plain English for a patient. Explain any technical terms. If any values are abnormal, highlight them."
        
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        response = self.model.invoke(full_prompt, image=image)
        return response.content
