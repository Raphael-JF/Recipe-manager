from transformers import pipeline

model_name = "microsoft/phi-2"  # ~2.7B params, rapide en CPU/GPU

pipe = pipeline(
    "text-generation",
    model=model_name,
    device_map="auto",
    torch_dtype="auto",
    do_sample=False,
    max_new_tokens=30
)

ingredients = [
    "2 large egg whites",
    "1 pound new potatoes (about 1 inch in diameter)"
]

for ing in ingredients:
    prompt = f"""
You are a data conversion tool.

Task:
- Convert the ingredient into a tuple: (name, quantity, unit, note)
- name: generic English name (no brand, no synonym variation)
- quantity: numeric value or fraction
- unit: scientific unit in English (g, cm, unit, etc.)
- note: extra precision (size, preparation, etc.)
- Output ONLY the tuple. Output ONLY the tuple. Start immediately with "(" and end with ")". No other text.


Ingredient: {ing}
Output:
"""
    res = pipe(prompt)[0]["generated_text"]
    print(f"Original: {ing}")
    print("Converted:")
    print("start")
    print(res)
    print("end")
