import mlx_vlm
from mlx_vlm import load, generate
from mlx_vlm.prompt_utils import apply_chat_template
from mlx_vlm.utils import load_config
from PIL import Image
import os
import re
from types import SimpleNamespace

class ModelManager:
    def __init__(self, model_path="Rafath1/medgemma-medsupport-4bit"):
        self.model_path = model_path
        self.model = None
        self.processor = None
        self.is_loaded = False

    def load_model(self):
        if self.is_loaded:
            return
        
        print(f"Loading model: {self.model_path}")
        try:
            self.model, self.processor = load(self.model_path, trust_remote_code=True)
            self.is_loaded = True
            print("Model loaded successfully.")
        except Exception as e:
            print(f"Error loading model: {e}")
            raise e


    def generate_response(self, prompt: str, image: Image.Image = None, max_tokens: int = 500, temperature: float = 0.1, repetition_penalty: float = 1.1):
        if not self.is_loaded:
            self.load_model()
            
        # If image is provided, ensure it's in RGB
        if image:
            if image.mode != "RGB":
                image = image.convert("RGB")
            
            # Use structured content for multimodal
            content = [{"type": "image"}, {"type": "text", "text": prompt}]
            messages = [{"role": "user", "content": content}]
        else:
            messages = [{"role": "user", "content": prompt}]
        
        config = load_config(self.model_path, trust_remote_code=True)
        formatted_prompt = apply_chat_template(
            self.processor, 
            config, 
            messages, 
            add_generation_prompt=True
        )

        output = generate(
            self.model, 
            self.processor, 
            formatted_prompt, 
            image, 
            max_tokens=max_tokens, 
            temperature=temperature,
            repetition_penalty=repetition_penalty
        )
        
        # Post-processing: Clean up special tokens and "thought" blocks if they appear
        # Extract text from GenerationResult object
        raw_text = output.text
        
        # Post-processing: Remove internal reasoning/Chain-of-Thought
        # 1. Remove <unusedXX> tags
        cleaned_output = re.sub(r'<unused\d+>', '', raw_text)

        # 2. Split by specific Chain-of-Thought termination markers
        #    Some models output a full checklist before the final answer.
        #    Marker: "Strategizing complete. Proceeding with response generation." -> Take suffix
        if "Strategizing complete. Proceeding with response generation." in cleaned_output:
            cleaned_output = cleaned_output.split("Strategizing complete. Proceeding with response generation.", 1)[1].strip()
        
        # 3. Split by "Answer:" or "Summary:" if explicitly labeled
        elif "Answer:" in cleaned_output:
            cleaned_output = cleaned_output.split("Answer:", 1)[1].strip()
        elif "Summary:" in cleaned_output:
            cleaned_output = cleaned_output.split("Summary:", 1)[1].strip()
            
        # 4. Fallback: Remove known Chain-of-Thought starter lines if no header was found
        #    Common patterns: "The user wants...", "I need to..." that appear at the start.
        #    We split by newlines and drop initial lines that look like reasoning.
        else:
            lines = cleaned_output.split('\n')
            filtered_lines = []
            reasoning_ended = False
            for i, line in enumerate(lines):
                # Heuristic: If we haven't found the "start" yet, check if line looks like reasoning
                if not reasoning_ended:
                    stripped = line.strip().lower()
                    if (stripped.startswith("the user wants") or 
                        stripped.startswith("i need to") or 
                        stripped.startswith("therefore, i") or
                        stripped.startswith("okay, i will") or
                        stripped == ""):
                        continue
                    else:
                        reasoning_ended = True
                
                if reasoning_ended:
                    filtered_lines.append(line)
            
            cleaned_output = "\n".join(filtered_lines).strip()

        # Remove "thought" blocks if they leaked (common in some finetunes)
        # Pattern: "thought ... " (simple heuristic)
        if cleaned_output.strip().startswith("thought"):
             cleaned_output = cleaned_output.replace("thought", "", 1).strip()
             
        # Return object with .text attribute to maintain compatibility with main.py
        return SimpleNamespace(text=cleaned_output)
