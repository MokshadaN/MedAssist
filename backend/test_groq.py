import os
import json
from groq import Groq
from dotenv import load_dotenv

from utils.prompts import TRIAGE_SYSTEM_PROMPT, triage_prompt

load_dotenv()

text = 'my water broke and I am bleeding heavily'

client = Groq(api_key=os.getenv('GROQ_API_KEY'))
try:
    completion = client.chat.completions.create(
        model='llama-3.1-8b-instant',
        messages=[
            {'role': 'system', 'content': TRIAGE_SYSTEM_PROMPT},
            {'role': 'user', 'content': triage_prompt(text)}
        ],
        temperature=0.0,
        response_format={'type': 'json_object'}
    )
    print(completion.choices[0].message.content)
except Exception as e:
    print('ERROR:', e)
