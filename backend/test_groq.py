import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

text = 'my water broke and I am bleeding heavily'

client = Groq(api_key=os.getenv('GROQ_API_KEY'))
prompt = f"""You are a medical triage AI. Analyze the patient transcript below to determine if this is a severe medical emergency requiring immediate attention (like a heart attack, stroke, severe bleeding, or extreme pain).
    
Transcript: "{text}"

Return a STRICT JSON object in this exact format:
{{
    "urgent": true or false,
    "matched_terms": ["list of concerning phrases from transcript, empty if none"]
}}
"""
try:
    completion = client.chat.completions.create(
        model='llama-3.1-8b-instant',
        messages=[
            {'role': 'system', 'content': 'You are a medical emergency detection JSON API. You MUST return strictly valid JSON and nothing else.'},
            {'role': 'user', 'content': prompt}
        ],
        temperature=0.0,
        response_format={'type': 'json_object'}
    )
    print(completion.choices[0].message.content)
except Exception as e:
    print('ERROR:', e)
