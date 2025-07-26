import base64
import json
from typing import List, Dict, Optional

import openai
from openai import OpenAIError
from .config import settings

client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

SYSTEM_PROMPT = (
    "Sei un assistente specializzato nell’individuare il luogo in cui una foto è stata scattata usando solo il contenuto visivo. "
    "Pensa in modo approfondito, ma mostra all’utente **solo** il risultato finale in formato JSON, senza alcun testo aggiuntivo."
)

USER_PROMPT = """Analizza questa immagine e restituisci i tre luoghi più probabili in cui potrebbe essere stata scattata. Per ciascun luogo indica nome sintetico, coordinate WGS‑84 in gradi decimali e una percentuale di confidenza. Rispetta rigorosamente questo schema JSON (solo questi campi, nessun extra) e ordina i candidati per confidenza decrescente:

{
  \"candidates\": [
    {
      \"place\": \"<string>\",
      \"latitude\": <number>,
      \"longitude\": <number>,
      \"confidence_pct\": <number>
    },
    {
      \"place\": \"<string>\",
      \"latitude\": <number>,
      \"longitude\": <number>,
      \"confidence_pct\": <number>
    },
    {
      \"place\": \"<string>\",
      \"latitude\": <number>,
      \"longitude\": <number>,
      \"confidence_pct\": <number>
    }
  ]
}

• Mantieni sempre esattamente tre voci nel campo \"candidates\".
• Usa al massimo una cifra decimale per \"confidence_pct\".
• Non sommare forzatamente al 100 %‑‑i valori possono essere indipendenti.
• Se hai dubbi, inserisci \"Unknown\" come place con confidenza 0.0.
• Output esclusivamente il blocco JSON, senza spiegazioni."""


def predict_locations(image_path: str) -> Optional[List[Dict]]:
    """Return location candidates from an image using OpenAI vision models."""
    try:
        with open(image_path, "rb") as f:
            b64_image = base64.b64encode(f.read()).decode("ascii")

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": USER_PROMPT},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"}},
                ],
            },
        ]

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0,
            max_tokens=400,
        )
        content = response.choices[0].message.content
        print(f"OpenAI raw response: {content}")
        
        if not content:
            print("No content in OpenAI response")
            return None
        
        # Clean up the response - remove markdown code blocks if present
        cleaned_content = content.strip()
        if cleaned_content.startswith('```json'):
            cleaned_content = cleaned_content[7:]  # Remove ```json
        if cleaned_content.startswith('```'):
            cleaned_content = cleaned_content[3:]   # Remove ```
        if cleaned_content.endswith('```'):
            cleaned_content = cleaned_content[:-3]  # Remove trailing ```
        
        cleaned_content = cleaned_content.strip()
        print(f"Cleaned content: {cleaned_content}")
            
        data = json.loads(cleaned_content)
        print(f"Parsed JSON data: {data}")
        
        candidates = data.get("candidates")
        print(f"Extracted candidates: {candidates}")
        
        return candidates
    except (OpenAIError, json.JSONDecodeError, KeyError, IndexError) as e:
        print(f"Error in predict_locations: {type(e).__name__}: {e}")
        return None
