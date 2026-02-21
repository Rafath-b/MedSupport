import mlx_vlm
from mlx_vlm import load, generate
from mlx_vlm.prompt_utils import apply_chat_template
from mlx_vlm.utils import load_config
import os
import re
import torch
import numpy as np
from typing import Any, List, Optional, Dict
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from pydantic import Field

# Patch for Gemma3Processor and ImageProcessor (transformers 5.x)
def apply_mlx_vlm_patches(processor):
    try:
        # Patch 1: Main Processor __call__ to handle NumPy conversion for mlx_vlm
        original_call = processor.__call__
        def patched_call(*args, **kwargs):
            kwargs["return_tensors"] = "pt"
            res = original_call(*args, **kwargs)
            return {k: v.detach().cpu().numpy() if torch.is_tensor(v) else v for k, v in res.items()}
        processor.__call__ = patched_call
        
        # Patch 2: ImageProcessor preprocess (called directly in some mlx_vlm paths)
        if hasattr(processor, "image_processor"):
            original_preprocess = processor.image_processor.preprocess
            def patched_preprocess(*args, **kwargs):
                kwargs["return_tensors"] = "pt"
                res = original_preprocess(*args, **kwargs)
                if isinstance(res, dict):
                    return {k: v.detach().cpu().numpy() if torch.is_tensor(v) else v for k, v in res.items()}
                elif isinstance(res, list):
                    return [v.detach().cpu().numpy() if torch.is_tensor(v) else v for v in res]
                return res
            processor.image_processor.preprocess = patched_preprocess
            
        print("DEBUG: Applied Gemma3 patches to processor and image_processor.")
    except Exception as e:
        print(f"DEBUG: Patching failed: {e}")

class MLXVLMAdapter(BaseChatModel):
    model_path: str = Field(...)
    model: Any = Field(default=None, exclude=True)
    processor: Any = Field(default=None, exclude=True)
    boi_char: str = Field(default="", exclude=True)
    is_loaded: bool = Field(default=False)

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        if not self.is_loaded:
            self._load_model()

        # Extract prompt string
        prompt = ""
        image = kwargs.get("image")
        
        for msg in messages:
            if isinstance(msg, HumanMessage):
                if isinstance(msg.content, list):
                    for part in msg.content:
                        if part["type"] == "text":
                            prompt = part["text"]
                else:
                    prompt = msg.content
                break

        # Standard multimodal structure for apply_chat_template
        if image:
            formatted_messages = [{"role": "user", "content": [{"type": "image"}, {"type": "text", "text": prompt}]}]
        else:
            formatted_messages = [{"role": "user", "content": prompt}]

        config = load_config(self.model_path, trust_remote_code=True)
        formatted_prompt = apply_chat_template(
            self.processor, 
            config, 
            formatted_messages, 
            add_generation_prompt=True
        )

        # Handle Gemma 3 image tokens manually using the programmatically decoded boi_char
        if image:
            # mlx_vlm splitting path often expects <image>
            # but for Gemma3Processor to be happy, it also needs the boi_token (\u2584-like)
            if self.boi_char and self.boi_char not in formatted_prompt:
                # Insert boi_char. For Gemma 3, placing it after text works best.
                if "<end_of_turn>\n" in formatted_prompt:
                    # Insert right before the first end_of_turn after the user content
                    formatted_prompt = formatted_prompt.replace("<end_of_turn>", f"{self.boi_char}<end_of_turn>", 1)
                else:
                    formatted_prompt += self.boi_char
                print(f"DEBUG: Manually inserted decoded boi_char (repr: {repr(self.boi_char)})")

        output = generate(
            self.model, 
            self.processor, 
            formatted_prompt, 
            image, 
            max_tokens=kwargs.get("max_tokens", 512),
            temperature=kwargs.get("temperature", 0.1),
            repetition_penalty=kwargs.get("repetition_penalty", 1.1)
        )

        cleaned_text = self._post_process(output.text)
        ai_msg = AIMessage(content=cleaned_text)
        return ChatResult(generations=[ChatGeneration(message=ai_msg)])

    def _load_model(self):
        print(f"Loading local MLX model: {self.model_path}")
        self.model, self.processor = load(self.model_path, trust_remote_code=True)
        apply_mlx_vlm_patches(self.processor)
        
        # Get the CORRECT boi_char from tokenizer
        try:
            # Try getting it by ID 255999 which is standard for MedGamma/Gemma3
            self.boi_char = self.processor.tokenizer.decode([255999])
            print(f"DEBUG: Successfully decoded boi_char: {repr(self.boi_char)}")
        except Exception as e:
            print(f"DEBUG: Could not decode boi_char: {e}")
            
        self.is_loaded = True

    def _post_process(self, text: str) -> str:
        cleaned = re.sub(r'<unused\d+>', '', text)
        if "Strategizing complete. Proceeding with response generation." in cleaned:
            cleaned = cleaned.split("Strategizing complete. Proceeding with response generation.", 1)[1].strip()
        elif "Answer:" in cleaned:
            cleaned = cleaned.split("Answer:", 1)[1].strip()
        elif "Summary:" in cleaned:
            cleaned = cleaned.split("Summary:", 1)[1].strip()
        else:
            lines = cleaned.split('\n')
            filtered_lines = []
            reasoning_ended = False
            for line in lines:
                if not reasoning_ended:
                    stripped = line.strip().lower()
                    if any(stripped.startswith(p) for p in ["the user wants", "i need to", "therefore, i", "okay, i will"]) or stripped == "":
                        continue
                    reasoning_ended = True
                if reasoning_ended:
                    filtered_lines.append(line)
            cleaned = "\n".join(filtered_lines).strip()
        
        if cleaned.strip().startswith("thought"):
             cleaned = cleaned.replace("thought", "", 1).strip()
        return cleaned

    @property
    def _llm_type(self) -> str:
        return "mlx_vlm_local"
