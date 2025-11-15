#plan
import pydantic
import numpy as np
from typing import Union, Optional
from openai import OpenAI
from utils import *
from dataclasses import dataclass
import PIL
import time
import numpy as np
import json

class IndivisibleContent():
    pass

@dataclass
class VideoClip(IndivisibleContent):
    b64: str

@dataclass
class Slide(IndivisibleContent):
    b64: str

@dataclass
class IndivisibleMaterial:
    metadata: Optional[dict]
    content: VideoClip | Slide

class FullMaterial:
    contents: list[IndivisibleMaterial]


def get_lecture_notes(relevant_transcriptions: list[str], model_kwargs: dict, openrouter_api_key: str) -> str:
    client = OpenAI(
        base_url = "https://openrouter.ai/api/v1",
        api_key = openrouter_api_key.strip()
    )
    prompt = f"Here is a list of relevant transcriptions from a set of lectures\n{(relevant_transcriptions)}\nGenerate a well organised lecture note including all of the topics present on the transcriptions"
    print(prompt)
    return client.chat.completions.create(
                messages = [
                    {"role": "user", "content": prompt},
                ],
                model = model_kwargs["model"],
        ).choices[0].message.content

def ingest_material(material: IndivisibleMaterial) -> str:
    ...

def transcribe_indivisible(material: IndivisibleMaterial, model_kwargs: dict, openrouter_api_key:str) -> str:
    client = OpenAI(
        base_url = "https://openrouter.ai/api/v1",
        api_key = openrouter_api_key.strip()
    )
    match material.content:
        case Slide(b64):
            return client.chat.completions.create(
                messages = [
                    {"role": "user", "content": [
                         {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{material.content.b64}"}},
                    ]},
                    {"role": "user", "content": [
                         {"type": "text", "content": "Transcribe the above image in full into plaintext, perserving all details and describe non-text elements such as shapes. PROVIDE THE TRANSCRIPTION ONLY!! DO NOT add text or description of visuals that are not present on the image"},
                    ]}
                ],
                model = model_kwargs["model"],
            ).choices[0].message.content
        case VideoClip(b64):
            video_clip = webm_b64_to_mp4_b64(material.content.b64)
            return client.chat.completions.create(
                messages = [
                    {"role": "user", "content": [
                         {"type": "video_url", "video_url": {"url": f"data:video/mp4;base64,{video_clip}"}},
                    ]},
                    {"role": "user", "content": [
                        {"type": "text", "content": "\
Describe the contents of this lecture video \
taking into account both visuals and any audio/speech. \
Perserve all details and describe non-text visual elements such as shapes present on the video as well as any speech\
If there is any audio then transcribe the entire speech verbatim.\
"}]},
                ],
                model = model_kwargs["model"],
            ).choices[0].message.content


def embed(text: str, openrouter_api_key: str) -> np.ndarray:
    client = OpenAI(
        base_url = "https://openrouter.ai/api/v1",
        api_key = openrouter_api_key.strip()
    )
    return client.embeddings.create(
        model="qwen/qwen3-embedding-8b",
      input=text,
      encoding_format="float"
    ).data[0].embedding

def split_slides(pdf_b64: str) -> list[PIL.Image]:
    return b64_pdf_to_pil_images(pdf_b64)

def handle_incoming_clips(video_b64: str, model_kwargs: dict, openrouter_api_key: str, metadata: dict):
    transcription = transcribe_indivisible(IndivisibleMaterial(
        metadata=metadata,
        content=VideoClip(b64=video_b64)
    ), model_kwargs=model_kwargs, openrouter_api_key=openrouter_api_key)
    print(f"DEBUG: {transcription}")

    with open(f"transcriptions/TS{time.time()}.txt", "w") as f:
        f.write(json.dumps(dict(
            content=transcription,
            metadata=metadata
        )))
        print("DEBUG: Transcription written")

    return transcription
    

def generate_notes(query: str, model_kwargs: dict, openrouter_api_key: str) -> str:

     all_transcriptions = [json.loads(open(f"transcriptions/{fn}", "r",errors="ignore").read()) for fn in os.listdir("transcriptions") if fn[:2]=="TS"]
     all_transcriptions_text = [t["content"] for t in all_transcriptions]

     print('embedding full set')
     full_embeddings = np.array([embed(t,openrouter_api_key) for t in all_transcriptions_text])
     print(full_embeddings)
     print('embedding query')
     top_indices, top_vals = top_k_cosine_sim(embed(query, openrouter_api_key),full_embeddings, k=3)
     print(f"top indices {top_indices}")
     filtered_transcriptions = [all_transcriptions[i] for i in top_indices]
     
     return get_lecture_notes(filtered_transcriptions, model_kwargs, openrouter_api_key)


if __name__ == "__main__":
    
    print(generate_notes("Bluejay and Java", {"model": "google/gemini-2.5-pro"}, open("openrouter_key.txt", "r").read()))



