from mlx_vlm import load
import torch
from PIL import Image
import numpy as np

model_path = "./backend/models/medgemma-1.5-4b-it-4bit"
_, processor = load(model_path, trust_remote_code=True)

# Patch for NumPy
original_call = processor.__call__
def patched_call(*args, **kwargs):
    kwargs["return_tensors"] = "pt"
    res = original_call(*args, **kwargs)
    import torch
    return {k: v.detach().cpu().numpy() if torch.is_tensor(v) else v for k, v in res.items()}
processor.__call__ = patched_call

img = Image.fromarray(np.zeros((224, 224, 3), dtype=np.uint8))

# Get the EXACT character from tokenizer
decoded_boi = processor.tokenizer.decode([255999])
literal_boi = "▄"

print(f"Decoded boi: {repr(decoded_boi)}")
print(f"Literal boi: {repr(literal_boi)}")
print(f"Are they equal? {decoded_boi == literal_boi}")

print("\n--- Testing with decoded_boi ---")
try:
    res = processor(text=f"{decoded_boi} analysis", images=img)
    print("SUCCESS with decoded_boi!")
except Exception as e:
    print(f"FAILED with decoded_boi: {e}")

print("\n--- Testing with literal_boi ---")
try:
    res = processor(text=f"{literal_boi} analysis", images=img)
    print("SUCCESS with literal_boi!")
except Exception as e:
    print(f"FAILED with literal_boi: {e}")
